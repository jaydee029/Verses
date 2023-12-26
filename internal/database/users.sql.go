// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.24.0
// source: users.sql

package database

import (
	"context"
	"database/sql"

	"github.com/google/uuid"
)

const createuser = `-- name: Createuser :one
INSERT INTO users(Email, password, author_id, created_at) VALUES($1,$2,$3,$4)
RETURNING author_id, chirpy_red, password, email, created_at
`

type CreateuserParams struct {
	Email     sql.NullString
	Password  []byte
	AuthorID  uuid.NullUUID
	CreatedAt sql.NullTime
}

func (q *Queries) Createuser(ctx context.Context, arg CreateuserParams) (User, error) {
	row := q.db.QueryRowContext(ctx, createuser,
		arg.Email,
		arg.Password,
		arg.AuthorID,
		arg.CreatedAt,
	)
	var i User
	err := row.Scan(
		&i.AuthorID,
		&i.ChirpyRed,
		&i.Password,
		&i.Email,
		&i.CreatedAt,
	)
	return i, err
}