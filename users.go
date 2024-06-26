package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	auth "github.com/jaydee029/Verses/internal"
	"github.com/jaydee029/Verses/internal/database"
	"golang.org/x/crypto/bcrypt"
)

type Input struct {
	Password string `json:"password"`
	Email    string `json:"email"`
}
type res struct {
	ID     pgtype.UUID `json:"id"`
	Email  string      `json:"email"`
	Name   string      `json:"name"`
	Is_red bool        `json:"is_chirpy_red,omitempty"`
}
type res_login struct {
	Email         string `json:"email"`
	Token         string `json:"token"`
	Refresh_token string `json:"refresh_token"`
}
type User struct {
	Name     string `json:"name"`
	Password string `json:"password"`
	Email    string `json:"email"`
}
type Token struct {
	Token string `json:"token"`
}

func (cfg *apiconfig) createUser(w http.ResponseWriter, r *http.Request) {

	decoder := json.NewDecoder(r.Body)
	params := User{}
	err := decoder.Decode(&params)

	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "couldn't decode parameters")
		return
	}
	err = auth.ValidateEmail(params.Email)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, err.Error())
	}

	encrypted, _ := bcrypt.GenerateFromPassword([]byte(params.Password), bcrypt.DefaultCost)

	uuids := uuid.New().String()
	var pgUUID pgtype.UUID

	err = pgUUID.Scan(uuids)
	if err != nil {
		fmt.Println("Error setting UUID:", err)
	}

	var pgtime pgtype.Timestamp

	err = pgtime.Scan(time.Now().UTC())
	if err != nil {
		fmt.Println("Error setting timestamp:", err)
	}
	//fmt.Println(pgtime)
	user, err := cfg.DB.CreateUser(r.Context(), database.CreateUserParams{
		Name:      params.Name,
		Email:     params.Email,
		Passwd:    encrypted,
		ID:        pgUUID,
		CreatedAt: pgtime,
		UpdatedAt: pgtime,
	})

	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondWithJson(w, http.StatusCreated, res{
		Email:  user.Email,
		ID:     user.ID,
		Name:   user.Name,
		Is_red: user.IsRed,
	})
}

func (cfg *apiconfig) userLogin(w http.ResponseWriter, r *http.Request) {
	decoder := json.NewDecoder(r.Body)
	params := Input{}
	err := decoder.Decode(&params)

	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "couldn't decode parameters")
		return
	}

	user, err := cfg.DB.GetUser(r.Context(), params.Email)

	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	err = bcrypt.CompareHashAndPassword(user.Passwd, []byte(params.Password))

	if err != nil {
		respondWithError(w, http.StatusUnauthorized, "Password doesn't match")
	}
	uuid.FromBytes(user.ID.Bytes[:])
	Token, err := auth.Tokenize(user.ID, cfg.jwtsecret)

	if err != nil {
		respondWithError(w, http.StatusUnauthorized, err.Error())
		return
	}

	Refresh_token, err := auth.RefreshToken(user.ID, cfg.jwtsecret)

	if err != nil {
		respondWithError(w, http.StatusUnauthorized, err.Error())
		return
	}

	respondWithJson(w, http.StatusOK, res_login{
		Email:         params.Email,
		Token:         Token,
		Refresh_token: Refresh_token,
	})

}

func (cfg *apiconfig) updateUser(w http.ResponseWriter, r *http.Request) {

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

	if is_refresh {
		respondWithError(w, http.StatusUnauthorized, "Header contains refresh token")
		return
	}

	Idstr, err := auth.ValidateToken(token, cfg.jwtsecret)

	if err != nil {
		respondWithError(w, http.StatusUnauthorized, err.Error())
		return
	}

	//userId, err := uuid.FromBytes([]byte(Idstr))

	//userId, err := uuid.Parse(Idstr)
	var pgUUID pgtype.UUID

	err = pgUUID.Scan(Idstr)
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, err.Error())
		return
	}

	decoder := json.NewDecoder(r.Body)
	params := User{}
	err = decoder.Decode(&params)

	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "couldn't decode parameters")
		return
	}

	hashedPasswd, err := bcrypt.GenerateFromPassword([]byte(params.Password), bcrypt.DefaultCost)

	if err != nil {
		respondWithError(w, http.StatusUnauthorized, err.Error())
		return
	}
	var pgtime pgtype.Timestamp

	err = pgtime.Scan(time.Now().UTC())
	if err != nil {
		fmt.Println("Error setting timestamp:", err)
	}

	updateduser, err := cfg.DB.UpdateUser(r.Context(), database.UpdateUserParams{
		ID:        pgUUID,
		Name:      params.Name,
		Email:     params.Email,
		Passwd:    hashedPasswd,
		UpdatedAt: pgtime,
	})

	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondWithJson(w, http.StatusOK, res{
		Name:  updateduser.Name,
		Email: updateduser.Email,
	})
}

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
	//userid, err := uuid.Parse(Idstr)
	/*
		if err != nil {
			respondWithError(w, http.StatusUnauthorized, "user Id couldn't be parsed")
			return
		}
	*/
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
