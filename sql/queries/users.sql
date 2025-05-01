-- name: CreateUser :one
INSERT INTO users(name,Email,passwd,id,created_at,updated_at, username) VALUES($1,$2,$3,$4,$5,$6, $7)
RETURNING *;

-- name: UpdateUser :one
UPDATE users SET name=$2 ,passwd=$3 ,updated_at=$4 WHERE id=$1
RETURNING *;

-- name: GetUser :one
SELECT * FROM users WHERE Email=$1;

-- name: GetUserbyId :one
SELECT * FROM users WHERE id=$1;

-- name: Is_red :one
INSERT INTO users(is_red) VALUES($1)
RETURNING *;

-- name: Is_Email :one
SELECT EXISTS (SELECT 1 FROM users WHERE Email=$1);

-- name: Is_Username :one
SELECT EXISTS (SELECT 1 FROM users WHERE username=$1);

-- name: GetUsers :many
SELECT Name, username, id, followers, followees ,
CASE WHEN followees.follower_id IS NOT NULL THEN true ELSE false END AS follower,
CASE WHEN followers.followee_id IS NOT NULL THEN true ELSE false END AS following 
FROM users LEFT JOIN follows as followers
ON followers.followee_id=$1 AND followers.follower_id=id
LEFT JOIN follows as followees
ON followees.follower_id=$1 AND followees.followee_id=id
WHERE $2::VARCHAR IS NULL or username> $2 
ORDER BY username ASC LIMIT $3 ;

-- name: GetUsersingle :one
SELECT Name, username, id, followers, followees ,
CASE WHEN followees.follower_id IS NOT NULL THEN true ELSE false END AS follower,
CASE WHEN followers.followee_id IS NOT NULL THEN true ELSE false END AS following
FROM users LEFT JOIN follows as followers
ON followers.followee_id=$1 AND followers.follower_id=id
LEFT JOIN follows as followees
ON followees.follower_id=$1 AND followees.followee_id=id
WHERE username =$2;

-- name: GetUserfromProse :one
SELECT author_id FROM prose WHERE id=$1;