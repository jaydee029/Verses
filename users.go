package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	auth "github.com/jaydee029/Verses/internal/auth"
	"github.com/jaydee029/Verses/internal/database"
	validate "github.com/jaydee029/Verses/internal/validation"
	"golang.org/x/crypto/bcrypt"
)

type Input struct {
	Password string `json:"password"`
	Email    string `json:"email"`
	Username string `json:"username"`
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
	Username string `json:"username"`
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
	err = validate.ValidateEmail(params.Email)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, err.Error())
	}

	email_if_exist, err := cfg.DB.Is_Email(context.Background(), params.Email)

	if email_if_exist {
		respondWithError(w, http.StatusConflict, "Email already exists")
		return
	}
	if err != nil {
		respondWithError(w, http.StatusBadRequest, err.Error())
		return
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
