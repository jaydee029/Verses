package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"mime"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jaydee029/Verses/api/middleware"
	"github.com/jaydee029/Verses/internal/database"
	"github.com/jaydee029/Verses/pubsub"
	"go.uber.org/zap"
)

type Comment struct {
	Id          int32            `json:"id"`
	Userid      pgtype.UUID      `json:"-"`
	Username    string           `json:"username"`
	Proseid     pgtype.UUID      `json:"proseid"`
	Created_at  pgtype.Timestamp `json:"created_at"`
	Likes_count int              `json:"likes,omitempty"`
	Liked       bool             `json:"liked,omitempty"`
	Mine        bool             `json:"mine,omitempty"`
	User        *User            `json:"user,omitempty"`
	Body        string           `json:"body"`
}

/*
type commentclient struct {
	comments chan Comment
	Proseid  pgtype.UUID
	Userid   pgtype.UUID
}*/

func (cfg *Handler) PostComment(w http.ResponseWriter, r *http.Request) {

	// token, err := auth.BearerHeader(r.Header)
	// if err != nil {
	// 	respondWithError(w, http.StatusUnauthorized, err.Error())
	// 	return
	// }

	// authorid, err := auth.ValidateToken(token, cfg.Jwtsecret)
	// if err != nil {
	// 	respondWithError(w, http.StatusUnauthorized, err.Error())
	// 	return
	// }

	authorid := r.Context().Value(middleware.UserIDKey).(string)
	decoder := json.NewDecoder(r.Body)
	params := body{}
	err := decoder.Decode(&params)

	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "parameters couldn't be decoded")
		return
	}

	proseidstr := chi.URLParam(r, "proseid")

	cleanText := strings.TrimSpace(params.Body)

	if len([]rune(cleanText)) > 280 || cleanText == "" {
		respondWithError(w, http.StatusBadRequest, "Comment is invalid")
		return
	}

	var pgUUID pgtype.UUID
	err = pgUUID.Scan(authorid)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	var proseid pgtype.UUID
	err = proseid.Scan(proseidstr)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	var pgtime pgtype.Timestamp
	err = pgtime.Scan(time.Now().UTC())
	if err != nil {
		cfg.logger.Info("Error setting timestamp:", zap.Error(err))
		respondWithError(w, http.StatusInternalServerError, "error parsing timestamp into pgtype value")
		return
	}

	tx, err := cfg.DBpool.Begin(r.Context())
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	qtx := cfg.DB.WithTx(tx)

	defer func() {
		if tx != nil {
			tx.Rollback(r.Context())
		}
	}()

	comment, err := qtx.CreateComment(r.Context(), database.CreateCommentParams{
		ProseID:   proseid,
		UserID:    pgUUID,
		Body:      cleanText,
		CreatedAt: pgtime,
	})

	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	err = qtx.UpdateCommentCount(r.Context(), proseid)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "comment count couldn't be updated")
		return
	}

	err = tx.Commit(r.Context())
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "couldn't commit the transaction")
	}
	tx = nil

	var c Comment

	c.Body = comment.Body
	c.Created_at = comment.CreatedAt
	c.Proseid = comment.ProseID
	c.Id = comment.ID
	c.Userid = comment.UserID
	c.Mine = true

	go cfg.Commentcreation(c)

	respondWithJson(w, http.StatusAccepted, c)
}

func (cfg *Handler) Getcomments(w http.ResponseWriter, r *http.Request) {

	// token, err := auth.BearerHeader(r.Header)
	// if err != nil {
	// 	respondWithError(w, http.StatusUnauthorized, err.Error())
	// 	return
	// }

	// authorid, err := auth.ValidateToken(token, cfg.Jwtsecret)
	// if err != nil {
	// 	respondWithError(w, http.StatusUnauthorized, err.Error())
	// 	return
	// }
	authorid := r.Context().Value(middleware.UserIDKey).(string)
	proseidstr := chi.URLParam(r, "proseid")

	var pgUUID pgtype.UUID
	err := pgUUID.Scan(authorid)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	var proseid pgtype.UUID
	err = proseid.Scan(proseidstr)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if content_type, _, err := mime.ParseMediaType(r.Header.Get("Accept")); err == nil && content_type == "text/event-stream" {
		cfg.subscribeTocomments(w, r.Context(), pgUUID, proseid)
		return
	}

	//var before int
	// before := sql.NullInt32{}

	// beforestr := r.URL.Query().Get("before")

	// if beforestr != "" {
	// 	beforeint, err := strconv.Atoi(beforestr)
	// 	if err != nil {
	// 		respondWithError(w, http.StatusInternalServerError, err.Error())
	// 		return
	// 	}
	// 	before = sql.NullInt32{Int32: int32(beforeint)}
	// }

	// limitstr := r.URL.Query().Get("limit")
	// if limitstr == "" {
	// 	limitstr = "10"
	// }
	// limit, err := strconv.Atoi(limitstr)
	// if err != nil {
	// 	respondWithError(w, http.StatusInternalServerError, err.Error())
	// 	return
	// }

	comments, err := cfg.DB.GetComments(r.Context(), database.GetCommentsParams{
		UserID:  pgUUID,
		ProseID: proseid,
		// ID:      before.Int32,
		// Limit:   int32(limit),
	})

	if err != nil {
		respondWithError(w, http.StatusInternalServerError, fmt.Sprintf("Comments couldn't be fetched: %v", err))
		return
	}

	var Comments []Comment

	for _, k := range comments {
		Comments = append(Comments, Comment{
			Body:        k.Body,
			Id:          k.ID,
			Username:    k.Username,
			Liked:       k.Liked,
			Mine:        k.Mine,
			Created_at:  k.CreatedAt,
			Likes_count: int(k.LikesCount),
		})
	}

	respondWithJson(w, http.StatusOK, Comments)

}

func (cfg *Handler) Commentcreation(c Comment) {

	user, err := cfg.DB.GetUserbyId(context.Background(), c.Userid)
	if err != nil {
		cfg.logger.Info("error fetching the user from the id:", zap.Error(err))
		return
	}

	c.User = &User{
		ID:       user.ID,
		Username: user.Username,
		Name:     user.Name,
		Email:    user.Email,
		Is_red:   user.IsRed,
	}
	c.Mine = false

	go cfg.CommentNotification(c)
	go cfg.notifycommentmentions(c)
	go cfg.Broadcastcomments(c)
}

func (cfg *Handler) Broadcastcomments(c Comment) {
	err := pubsub.Publish(cfg.pubsub, "comments_direct", "comment_item."+uuid.UUID(c.Proseid.Bytes).String(), c)
	if err != nil {
		cfg.logger.Info("error while publishing commment item:", zap.Error(err))
		return
	}

}
