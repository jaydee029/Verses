package main

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	auth "github.com/jaydee029/Verses/internal/auth"
	"github.com/jaydee029/Verses/internal/database"
)

type togglefollow struct {
	Followed        bool `json:"followed"`
	Followers_count int  `json:"followers_count"`
}

func (cfg *apiconfig) toggleFollow(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")

	token, err := auth.BearerHeader(r.Header)
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, err.Error())
		return
	}

	follower_id, err := auth.ValidateToken(token, cfg.jwtsecret)
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, err.Error())
		return
	}

	var pgUUID pgtype.UUID

	err = pgUUID.Scan(follower_id)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	followee_id, err := cfg.DB.GetIdfromUsername(r.Context(), username)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
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

	if_follow, err := qtx.If_follows(r.Context(), database.If_followsParams{
		FollowerID: pgUUID,
		FolloweeID: followee_id,
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	var followers int32
	var followed bool

	if if_follow {
		err = qtx.Removefollower(r.Context(), database.RemovefollowerParams{
			FolloweeID: followee_id,
			FollowerID: pgUUID,
		})
		if err != nil {
			respondWithError(w, http.StatusInternalServerError, err.Error())
			return
		}
		followers, err = qtx.Deletefollower(r.Context(), followee_id)
		if err != nil {
			respondWithError(w, http.StatusInternalServerError, err.Error())
			return
		}

		followed = false

	} else {
		err = qtx.Addfollower(r.Context(), database.AddfollowerParams{
			FolloweeID: followee_id,
			FollowerID: pgUUID,
		})
		if err != nil {
			respondWithError(w, http.StatusInternalServerError, err.Error())
			return
		}
		followers, err = qtx.Updatefollower(r.Context(), followee_id)
		if err != nil {
			respondWithError(w, http.StatusInternalServerError, err.Error())
			return
		}
		followed = true
	}
	tx.Commit(r.Context())
	tx = nil
	respondWithJson(w, http.StatusAccepted, togglefollow{
		Followers_count: int(followers),
		Followed:        followed,
	})
}