package handler

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jaydee029/Verses/pubsub"
	"go.uber.org/zap"
)

func (cfg *Handler) subscribeTotimeline(w http.ResponseWriter, ctx context.Context, userid pgtype.UUID) {
	cfg.logger.Info("subscribed to timeline")

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	f, ok := w.(http.Flusher)

	if !ok {
		respondWithError(w, http.StatusBadRequest, "streaming unsupported")
	}
	heartbeat := 10 * time.Second
	ticker := time.NewTicker(heartbeat)
	subch, err := pubsub.Consume[timeline_item](cfg.pubsub, "timeline_direct", "timeline_queue", "timeline_item."+uuid.UUID(userid.Bytes).String())
	if err != nil {
		cfg.logger.Info("error consuming items:", zap.Error(err))
	}

	for {
		select {
		case item, ok := <-subch:
			if !ok {
				return
			}

			cfg.logger.Info("Received timeline item", zap.String("body", item.Post.Body))
			writesse(w, "timeline", item)
			f.Flush()
		case <-ticker.C:
			cfg.logger.Info("Sending SSE heartbeat", zap.String("routingKey", "timeline_item."+uuid.UUID(userid.Bytes).String()))
			_, err := fmt.Fprintf(w, ": heartbeat\n\n")
			if err != nil {
				cfg.logger.Error("Error writing SSE heartbeat", zap.Error(err), zap.String("routingKey", "timeline_item."+uuid.UUID(userid.Bytes).String()))
				return
			}
			f.Flush()
		case <-ctx.Done():
			return

		}

	}

}

func (cfg *Handler) subscribeTocomments(w http.ResponseWriter, ctx context.Context, _ pgtype.UUID, proseid pgtype.UUID) {

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	f, ok := w.(http.Flusher)

	if !ok {
		respondWithError(w, http.StatusBadRequest, "streaming unsupported")
	}

	subch, err := pubsub.Consume[Comment](cfg.pubsub, "comments_direct", "comment_queue", "comment_item."+uuid.UUID(proseid.Bytes).String())
	if err != nil {
		cfg.logger.Info("error consuming items:", zap.Error(err))
	}

	go func() {
		<-ctx.Done()
	}()

	for {
		select {
		case item, ok := <-subch:
			if !ok {
				return
			}

			cfg.logger.Info("Received comment item", zap.String("body", item.Body))
			writesse(w, "comment", item)
			f.Flush()
		case <-ctx.Done():
			return

		}
	}
}

func (cfg *Handler) subscribeTonotifications(w http.ResponseWriter, ctx context.Context, userid pgtype.UUID) {

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	f, ok := w.(http.Flusher)

	if !ok {
		respondWithError(w, http.StatusBadRequest, "streaming unsupported")
	}

	subch, err := pubsub.Consume[Notification](cfg.pubsub, "notifications_direct", "notification_queue", "notification_item."+uuid.UUID(userid.Bytes).String())
	if err != nil {
		cfg.logger.Info("error consuming items: %v", zap.Error(err))

		for {
			select {
			case item, ok := <-subch:
				if !ok {
					return
				}

				cfg.logger.Info("Received notification item", zap.String("body", item.Type))
				writesse(w, "notification", item)
				f.Flush()
			case <-ctx.Done():
				return

			}

		}
	}
}
