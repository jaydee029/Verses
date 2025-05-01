-- name: GetNotifications :many
SELECT id, user_id,prose_id, actors, type, read, generated_at FROM notifications WHERE user_id=$1
AND read=false
AND ($2::TIMESTAMP IS NULL OR generated_at < $2)
ORDER BY generated_at DESC
LIMIT $3;

-- name: ReadNotificationSingle :exec
UPDATE notifications SET read=true WHERE user_id=$1 AND id=$2;


-- name: ReadNotificationAll :exec
UPDATE notifications SET read=true WHERE user_id=$1;

-- name: NotificationActorExists :one
SELECT EXISTS 
(SELECT 1 FROM notifications WHERE user_id=$1 AND type='folllow' AND  $2::VARCHAR= ANY(actors) AND read=false) as exists;

-- name: NotificationExists :one
SELECT id FROM notifications WHERE user_id=$1 AND type='follow' AND read=false;

-- name: InsertNotification :exec
INSERT INTO notifications(id,user_id,actors,type,generated_at) VALUES($1,$2,$3,$4,$5);

-- name: UpdateNotification :one
UPDATE notifications 
SET actors= append_array(actors,$1::VARCHAR) 
AND generated_at=$2 
WHERE id=$3 RETURNING actors;

-- name: InsertCommentNotification :one
INSERT INTO notifications(id, user_id,actors,type,prose_id,generated_at ) VALUES($1,$2,$3, 'comment',$4,$5) ON CONFLICT (user_id,prose_id,type,read) 
DO UPDATE SET actors= notifications.actors || $3, generated_at=$5
RETURNING id,generated_at,actors;