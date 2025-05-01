-- name: CreateComment :one
INSERT INTO comments(prose_id,user_id,body,created_at) VALUES($1,$2,$3,$4)
RETURNING *;

-- name: GetComments :many
-- $3:nullable
SELECT c.id, c.body, c.created_at, c.likes_count, u.username,
CASE WHEN c.user_id=$1 THEN true ELSE false END AS Mine,
CASE WHEN Likes.user_id IS NOT NULL THEN true ELSE false END AS Liked
From comments AS c INNER JOIN users as u ON 
c.user_id=u.id
LEFT JOIN comment_likes as Likes
ON Likes.user_id=$1 AND Likes.comment_id=c.id
WHERE c.prose_id=$2 
ORDER BY c.id DESC;

-- name: UpdateCommentCount :exec
UPDATE prose
SET comments=comments+1 WHERE id=$1;

-- name: AddCommentLike :exec
INSERT INTO comment_likes(comment_id,user_id) VALUES($1,$2);

-- name: RemoveCommentLike :exec
DELETE FROM comment_likes WHERE comment_id=$1 AND user_id=$2;

-- name: IncreaseCommentLikeCount :one
UPDATE comments
SET likes_count=likes_count+1 WHERE id=$1 RETURNING likes_count;

-- name: DecreaseCommentLikeCount :one
UPDATE comments
SET likes_count=likes_count-1 WHERE id=$1 RETURNING likes_count;

-- name: IfCommentLiked :one
SELECT EXISTS (SELECT 1 FROM comment_likes WHERE comment_id=$1 AND user_id=$2);