package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	auth "github.com/jaydee029/Verses/internal/auth"
	"github.com/jaydee029/Verses/internal/database"
)

func (cfg *apiconfig) revokeToken(w http.ResponseWriter, r *http.Request) {
	/*
		decoder := json.NewDecoder(r.Body)
		params := User{}
		err := decoder.Decode(&params)

		if err != io.EOF {
			respondWithError(w, http.StatusUnauthorized, "Body is provided")
			return
		}
	*/
	token, err := auth.BearerHeader(r.Header)

	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "bytes couldn't be converted")
		return
	}

	var pgtime pgtype.Timestamp

	err = pgtime.Scan(time.Now().UTC())
	if err != nil {
		fmt.Println("Error setting timestamp:", err)
	}

	err = cfg.DB.RevokeToken(r.Context(), database.RevokeTokenParams{
		Token:     []byte(token),
		RevokedAt: pgtime,
	})

	if err != nil {
		respondWithError(w, http.StatusUnauthorized, err.Error())
	}

	respondWithJson(w, http.StatusOK, "Token Revoked")
}

func (cfg *apiconfig) verifyRefresh(w http.ResponseWriter, r *http.Request) {

	token, err := auth.BearerHeader(r.Header)

	if err != nil {
		respondWithError(w, http.StatusUnauthorized, err.Error())
		return
	}

	is_refresh, err := auth.VerifyRefresh(token, cfg.jwtsecret)

	if err != nil {
		respondWithError(w, http.StatusUnauthorized, err.Error())
		return
	}

	if !is_refresh {
		respondWithError(w, http.StatusUnauthorized, "Header doesn't contain refresh token")
		return
	}

	is_revoked, err := cfg.DB.VerifyRefresh(r.Context(), []byte(token))

	if err != nil {
		respondWithError(w, http.StatusUnauthorized, err.Error())
		return
	}

	if is_revoked {
		respondWithError(w, http.StatusUnauthorized, "Refresh Token revoked")
		return
	}
	Idstr, err := auth.ValidateToken(token, cfg.jwtsecret)
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, err.Error())
		return
	}

	var pgUUID pgtype.UUID

	err = pgUUID.Scan(Idstr)
	if err != nil {
		fmt.Println("Error setting UUID:", err)
	}

	auth_token, err := auth.Tokenize(pgUUID, cfg.jwtsecret)

	if err != nil {
		respondWithError(w, http.StatusUnauthorized, err.Error())
		return
	}

	respondWithJson(w, http.StatusOK, Token{
		Token: auth_token,
	})
}

func (cfg *apiconfig) is_gold(w http.ResponseWriter, r *http.Request) {
	type user_struct struct {
		User_id pgtype.UUID `json:"user_id"`
	}
	type body struct {
		Event string      `json:"event"`
		Data  user_struct `json:"data"`
	}

	key, err := auth.VerifyAPIkey(r.Header)

	if err != nil {
		respondWithError(w, http.StatusUnauthorized, err.Error())
		return
	}

	if key != cfg.apiKey {
		respondWithError(w, http.StatusUnauthorized, "Incorrect API Key")
	}

	decoder := json.NewDecoder(r.Body)
	params := body{}
	err = decoder.Decode(&params)

	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "couldn't decode parameters")
		return
	}

	if params.Event == "user.upgraded" {
		user_res, err := cfg.DB.Is_red(r.Context(), true)
		if err != nil {
			respondWithError(w, http.StatusInternalServerError, err.Error())
			return
		}
		respondWithJson(w, http.StatusOK, res{
			Name:   user_res.Name,
			Email:  user_res.Email,
			Is_red: user_res.IsRed,
			ID:     params.Data.User_id,
		})
	}

	respondWithJson(w, http.StatusOK, "http request accepted in the webhook")
}
