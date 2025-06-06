// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.28.0
// source: prose.sql

package database

import (
	"context"

	"github.com/jackc/pgx/v5/pgtype"
)

const countprose = `-- name: Countprose :one
SELECT COUNT(*) FROM prose WHERE author_id=$1
`

func (q *Queries) Countprose(ctx context.Context, authorID pgtype.UUID) (int64, error) {
	row := q.db.QueryRow(ctx, countprose, authorID)
	var count int64
	err := row.Scan(&count)
	return count, err
}

const createprose = `-- name: Createprose :one
INSERT INTO prose(id,body,author_id,created_at,updated_at) VALUES($1,$2,$3,$4,$5)
RETURNING id, body, author_id, created_at, updated_at, likes, comments
`

type CreateproseParams struct {
	ID        pgtype.UUID
	Body      string
	AuthorID  pgtype.UUID
	CreatedAt pgtype.Timestamp
	UpdatedAt pgtype.Timestamp
}

func (q *Queries) Createprose(ctx context.Context, arg CreateproseParams) (Prose, error) {
	row := q.db.QueryRow(ctx, createprose,
		arg.ID,
		arg.Body,
		arg.AuthorID,
		arg.CreatedAt,
		arg.UpdatedAt,
	)
	var i Prose
	err := row.Scan(
		&i.ID,
		&i.Body,
		&i.AuthorID,
		&i.CreatedAt,
		&i.UpdatedAt,
		&i.Likes,
		&i.Comments,
	)
	return i, err
}

const deleteprose = `-- name: Deleteprose :exec
DELETE FROM prose WHERE author_id=$1 AND id=$2
`

type DeleteproseParams struct {
	AuthorID pgtype.UUID
	ID       pgtype.UUID
}

func (q *Queries) Deleteprose(ctx context.Context, arg DeleteproseParams) error {
	_, err := q.db.Exec(ctx, deleteprose, arg.AuthorID, arg.ID)
	return err
}

const getProseSingle = `-- name: GetProseSingle :one
SELECT p.body,p.id,p.created_at,p.updated_at,p.likes, p.comments ,u.username ,
CASE WHEN author_id=$1 THEN true ELSE false END AS Mine,
CASE WHEN Likes.user_id IS NOT NULL THEN true ELSE false END AS Liked
FROM prose as p 
INNER JOIN users AS u 
ON p.author_id=u.id
LEFT JOIN post_likes AS Likes
ON Likes.user_id=$1 AND Likes.prose_id=p.id
WHERE p.id=$2
`

type GetProseSingleParams struct {
	AuthorID pgtype.UUID
	ID       pgtype.UUID
}

type GetProseSingleRow struct {
	Body      string
	ID        pgtype.UUID
	CreatedAt pgtype.Timestamp
	UpdatedAt pgtype.Timestamp
	Likes     int32
	Comments  int32
	Username  string
	Mine      bool
	Liked     bool
}

func (q *Queries) GetProseSingle(ctx context.Context, arg GetProseSingleParams) (GetProseSingleRow, error) {
	row := q.db.QueryRow(ctx, getProseSingle, arg.AuthorID, arg.ID)
	var i GetProseSingleRow
	err := row.Scan(
		&i.Body,
		&i.ID,
		&i.CreatedAt,
		&i.UpdatedAt,
		&i.Likes,
		&i.Comments,
		&i.Username,
		&i.Mine,
		&i.Liked,
	)
	return i, err
}

const getsProseAll = `-- name: GetsProseAll :many
SELECT id,body,created_at,updated_at,likes, comments,
CASE WHEN author_id=$1 THEN true ELSE false END AS Mine, 
CASE WHEN Likes.user_id IS NOT NULL THEN true ELSE false END AS Liked
FROM prose LEFT JOIN post_likes AS Likes 
ON Likes.user_id=$1 AND Likes.prose_id=prose.id 
WHERE prose.author_id=(SELECT id FROM users WHERE username=$2)
AND
$3::TIMESTAMP IS NULL OR prose.created_at < $3
ORDER BY prose.created_at DESC,prose.id DESC
LIMIT $4
`

type GetsProseAllParams struct {
	AuthorID pgtype.UUID
	Username string
	Column3  pgtype.Timestamp
	Limit    int32
}

type GetsProseAllRow struct {
	ID        pgtype.UUID
	Body      string
	CreatedAt pgtype.Timestamp
	UpdatedAt pgtype.Timestamp
	Likes     int32
	Comments  int32
	Mine      bool
	Liked     bool
}

func (q *Queries) GetsProseAll(ctx context.Context, arg GetsProseAllParams) ([]GetsProseAllRow, error) {
	rows, err := q.db.Query(ctx, getsProseAll,
		arg.AuthorID,
		arg.Username,
		arg.Column3,
		arg.Limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []GetsProseAllRow
	for rows.Next() {
		var i GetsProseAllRow
		if err := rows.Scan(
			&i.ID,
			&i.Body,
			&i.CreatedAt,
			&i.UpdatedAt,
			&i.Likes,
			&i.Comments,
			&i.Mine,
			&i.Liked,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}
