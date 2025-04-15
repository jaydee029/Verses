package handler

import (
	"mime"
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jaydee029/Verses/api/middleware"
	"github.com/jaydee029/Verses/internal/database"
	"github.com/jaydee029/Verses/pubsub"
	"go.uber.org/zap"
)

type timeline_item struct {
	Id     int         `json:"id"`
	Userid pgtype.UUID `json:"userid,omitempty"`
	Post   Prose       `json:"prose"`
}

func (cfg *Handler) Timeline(w http.ResponseWriter, r *http.Request) {

	authorid := r.Context().Value(middleware.UserIDKey).(string)

	var pgUUID pgtype.UUID
	err := pgUUID.Scan(authorid)
	if err != nil {
		cfg.logger.Info("Error setting UUID:", zap.Error(err))
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if content_type, _, err := mime.ParseMediaType(r.Header.Get("Accept")); err == nil && content_type == "text/event-stream" {
		cfg.subscribeTotimeline(w, r.Context(), pgUUID)
		return
	}

	var before pgtype.Timestamp

	beforestr := r.URL.Query().Get("before")
	if beforestr != "" {
		parsedTime, err := time.Parse(time.RFC3339, beforestr)
		if err != nil {
			respondWithError(w, http.StatusBadRequest, "Invalid timestamp format")
			return
		}
		err = before.Scan(parsedTime)
		if err != nil {
			cfg.logger.Info("Error converting timestamp to pgtype format:", zap.Error(err))
			respondWithError(w, http.StatusInternalServerError, err.Error())
		}
	} else {
		before = pgtype.Timestamp{
			Valid: false,
		}
	}
	limitstr := r.URL.Query().Get("limit")
	if limitstr == "" {
		limitstr = "20"
	}

	limit, err := strconv.ParseInt(limitstr, 10, 32)
	if err != nil {
		cfg.logger.Info("Error converting limit value to int type:", zap.Error(err))
		respondWithError(w, http.StatusInternalServerError, err.Error())
	}

	// err = before.Scan(beforestr)
	// if err != nil {
	// 	respondWithError(w, http.StatusInternalServerError, err.Error())
	// 	return
	// }

	tl_items, err := cfg.DB.GetTimeline(r.Context(), database.GetTimelineParams{
		AuthorID: pgUUID,
		Column2:  before,
		Limit:    int32(limit),
	})

	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "timeline items couldn't be fetched")
		return
	}

	var timeline []timeline_item

	for _, k := range tl_items {
		timeline = append(timeline, timeline_item{
			Id: int(k.ID),
			Post: Prose{
				ID:          k.ProseID,
				Username:    k.Username,
				Body:        k.Body,
				Created_at:  k.CreatedAt,
				Updated_at:  k.UpdatedAt,
				Mine:        k.Mine,
				Liked:       k.Liked,
				Likes_count: int(k.Likes),
				Comments:    int(k.Comments),
			},
		})

	}
	respondWithJson(w, http.StatusOK, timeline)

}

func (cfg *Handler) Broadcasttimeline(ti timeline_item) {

	err := pubsub.Publish(cfg.pubsub, "timeline_direct", "timeline_item."+uuid.UUID(ti.Userid.Bytes).String(), ti)
	if err != nil {
		cfg.logger.Info("failed to publish time line item:", zap.Error(err))
		return
	}

}
