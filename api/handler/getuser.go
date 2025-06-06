package handler

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jaydee029/Verses/api/middleware"
	"github.com/jaydee029/Verses/internal/database"
	"go.uber.org/zap"
)

func (cfg *Handler) GetUser(w http.ResponseWriter, r *http.Request) {

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

	username := chi.URLParam(r, "username")

	var pgUUID pgtype.UUID
	err := pgUUID.Scan(authorid)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	user, err := cfg.DB.GetUsersingle(r.Context(), database.GetUsersingleParams{
		FolloweeID: pgUUID,
		Username:   username,
	})

	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "User profile couldn't be fetched")
		return
	}

	respondWithJson(w, http.StatusOK, User{
		Name:         user.Name,
		Username:     user.Username,
		ID:           user.ID,
		Follower:     user.Follower,
		Follows_back: user.Following,
		Followers:    int(user.Followers),
		Following:    int(user.Followees),
	})
}

func (cfg *Handler) GetUsers(w http.ResponseWriter, r *http.Request) {

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
	after := r.URL.Query().Get("username")

	var pgUUID pgtype.UUID
	err := pgUUID.Scan(authorid)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	limitstr := r.URL.Query().Get("limit")
	if limitstr == "" {
		limitstr = "10"
	}

	limit, err := strconv.ParseInt(limitstr, 10, 32)
	if err != nil {
		cfg.logger.Info("Error converting limit value to integer type:", zap.Error(err))
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	users, err := cfg.DB.GetUsers(r.Context(), database.GetUsersParams{
		FolloweeID: pgUUID,
		Column2:    after,
		Limit:      int32(limit),
	})

	if err != nil {
		respondWithError(w, http.StatusInternalServerError, fmt.Sprintf("Users couldn't be retrieved:%v", err))
		return
	}

	var Users []User

	for _, user := range users {
		Users = append(Users, User{
			Name:         user.Name,
			Username:     user.Username,
			Follower:     user.Follower,
			Follows_back: user.Following,
			Followers:    int(user.Followers),
			Following:    int(user.Followees),
			ID:           user.ID,
		})
	}

	respondWithJson(w, http.StatusOK, Users)
}
