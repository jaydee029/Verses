// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.25.0
// source: chirps.sql

package database

import (
	"context"
	"time"

	"github.com/google/uuid"
)

const countchirps = `-- name: Countchirps :one
SELECT COUNT(*) FROM chirps WHERE author_id==$1
`

func (q *Queries) Countchirps(ctx context.Context, authorID uuid.UUID) (int64, error) {
	row := q.db.QueryRowContext(ctx, countchirps, authorID)
	var count int64
	err := row.Scan(&count)
	return count, err
}

const createchirp = `-- name: Createchirp :one
INSERT INTO chirps(id,body,author_id,created_at,updated_at) VALUES($1,$2,$3,$4,$5)
RETURNING id, body, author_id, created_at, updated_at
`

type CreatechirpParams struct {
	ID        int32
	Body      string
	AuthorID  uuid.UUID
	CreatedAt time.Time
	UpdatedAt time.Time
}

func (q *Queries) Createchirp(ctx context.Context, arg CreatechirpParams) (Chirp, error) {
	row := q.db.QueryRowContext(ctx, createchirp,
		arg.ID,
		arg.Body,
		arg.AuthorID,
		arg.CreatedAt,
		arg.UpdatedAt,
	)
	var i Chirp
	err := row.Scan(
		&i.ID,
		&i.Body,
		&i.AuthorID,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const getChirp = `-- name: GetChirp :one
SELECT id, body, author_id, created_at, updated_at FROM chirps WHERE author_id==$1 AND id==$2
`

type GetChirpParams struct {
	AuthorID uuid.UUID
	ID       int32
}

func (q *Queries) GetChirp(ctx context.Context, arg GetChirpParams) (Chirp, error) {
	row := q.db.QueryRowContext(ctx, getChirp, arg.AuthorID, arg.ID)
	var i Chirp
	err := row.Scan(
		&i.ID,
		&i.Body,
		&i.AuthorID,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const getChirps = `-- name: GetChirps :many
SELECT id,body,created_at,updated_at FROM chirps WHERE author_id==$1
ORDER BY id
`

type GetChirpsRow struct {
	ID        int32
	Body      string
	CreatedAt time.Time
	UpdatedAt time.Time
}

func (q *Queries) GetChirps(ctx context.Context, authorID uuid.UUID) ([]GetChirpsRow, error) {
	rows, err := q.db.QueryContext(ctx, getChirps, authorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []GetChirpsRow
	for rows.Next() {
		var i GetChirpsRow
		if err := rows.Scan(
			&i.ID,
			&i.Body,
			&i.CreatedAt,
			&i.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}
