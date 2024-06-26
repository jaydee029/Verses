// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.26.0

package database

import (
	"github.com/jackc/pgx/v5/pgtype"
)

type Prose struct {
	ID        int32
	Body      string
	AuthorID  pgtype.UUID
	CreatedAt pgtype.Timestamp
	UpdatedAt pgtype.Timestamp
}

type Revocation struct {
	Token     []byte
	RevokedAt pgtype.Timestamp
}

type User struct {
	Name      string
	Email     string
	Passwd    []byte
	ID        pgtype.UUID
	CreatedAt pgtype.Timestamp
	UpdatedAt pgtype.Timestamp
	IsRed     bool
}
