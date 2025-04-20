package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jaydee029/Verses/api/middleware"
	"github.com/jaydee029/Verses/internal/database"
	"github.com/jaydee029/Verses/utils"
	"go.uber.org/zap"
)

type Prose struct {
	ID          pgtype.UUID      `json:"id,omitempty"`
	Userid      pgtype.UUID      `json:"userid,omitempty"`
	Body        string           `json:"body"`
	User        *User            `json:"user,omitempty"`
	Created_at  pgtype.Timestamp `json:"created_at,omitempty"`
	Updated_at  pgtype.Timestamp `json:"Updated_at,omitempty"`
	Mine        bool             `json:"mine"`
	Liked       bool             `json:"liked,omitempty"`
	Likes_count int              `json:"likes_count,omitempty"`
	Username    string           `json:"username,omitempty"`
	Comments    int              `json:"comments,omitempty"`
}

type body struct {
	Body string `json:"body"`
}

func (cfg *Handler) PostProse(w http.ResponseWriter, r *http.Request) {

	// token, err := auth.BearerHeader(r.Header)

	// if err != nil {
	// 	respondWithError(w, http.StatusUnauthorized, "error decoding auth header:"+err.Error())
	// 	return
	// }
	// authorid, err := auth.ValidateToken(token, cfg.Jwtsecret)

	// if err != nil {
	// 	respondWithError(w, http.StatusUnauthorized, "error parsing the userid:"+err.Error())
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

	cleanText := strings.TrimSpace(params.Body)

	if len([]rune(cleanText)) > 280 || cleanText == "" {
		respondWithError(w, http.StatusBadRequest, "Prose is invalid")
		return
	}

	var pgUUID pgtype.UUID
	err = pgUUID.Scan(authorid)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "error parsing into pgtype.uuid")
		return
	}
	uuids := uuid.New().String()
	var post_pgUUID pgtype.UUID

	err = post_pgUUID.Scan(uuids)
	if err != nil {
		cfg.logger.Info("Error setting UUID:", zap.Error(err))
		respondWithError(w, http.StatusInternalServerError, "error parsing uuid into pgtype value")
		return
	}

	//total, _ := cfg.DB.Countprose(r.Context(), pgUUID)
	content := utils.Profane(cleanText)

	var pgtime pgtype.Timestamp
	err = pgtime.Scan(time.Now().UTC())
	if err != nil {
		cfg.logger.Info("Error setting timestamp:", zap.Error(err))
		respondWithError(w, http.StatusInternalServerError, "error parsing timestamp into pgtype value")
		return
	}

	tx, err := cfg.DBpool.Begin(r.Context())
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "error starting the transaction"+err.Error())
		return
	}

	qtx := cfg.DB.WithTx(tx)

	defer tx.Rollback(r.Context())

	prose, err := qtx.Createprose(r.Context(), database.CreateproseParams{
		ID:        post_pgUUID,
		AuthorID:  pgUUID,
		Body:      content,
		CreatedAt: pgtime,
		UpdatedAt: pgtime,
	})

	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "couldn't create Prose"+err.Error())
		return
	}

	respondWithJson(w, http.StatusCreated, Prose{
		ID:         post_pgUUID,
		Body:       prose.Body,
		Created_at: prose.CreatedAt,
		Updated_at: prose.UpdatedAt,
		Mine:       true,
	})

	err = qtx.InserinTimeline(r.Context(), database.InserinTimelineParams{
		ProseID: post_pgUUID,
		UserID:  pgUUID,
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "couldn't insert Prose in the timeline")
		return
	}

	tl := timeline_item{
		Post: Prose{
			ID:     post_pgUUID,
			Mine:   true,
			Userid: pgUUID,
			Body:   cleanText,
			User:   &User{},
		},
	}

	// //tl.Userid = pgUUID
	// tl.Post.ID = post_pgUUID
	// tl.Post.Mine = true
	// tl.Post.Userid = pgUUID
	// tl.Post.Body = cleanText

	err = tx.Commit(r.Context())
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "couldn't commit the transaction")
	}

	go cfg.prosecreation(tl.Post)

}

func (cfg *Handler) prosecreation(p Prose) {
	u, err := cfg.DB.GetUserbyId(context.Background(), p.Userid)

	if err != nil {
		cfg.logger.Info("Error fetching user by Id:", zap.Error(err))
		return
	}

	//log.Print(p)

	p.User.Email = u.Email
	p.User.ID = u.ID
	p.User.Name = u.Name
	p.User.Username = u.Username
	p.Mine = false

	go cfg.fanoutprose(p)
	go cfg.notifypostmentions(p)
}

func (cfg *Handler) fanoutprose(p Prose) {

	items, err := cfg.DB.FetchTimelineItems(context.Background(), database.FetchTimelineItemsParams{
		ProseID:    p.ID,
		FolloweeID: p.Userid,
	})

	if err != nil {
		cfg.logger.Info("Error Fetching timeline itmes:", zap.Error(err))
		return
	}

	for _, k := range items {
		var ti timeline_item
		ti.Id = int(k.ID)
		ti.Userid = k.UserID
		ti.Post = p
		go cfg.Broadcasttimeline(ti)
	}

}
