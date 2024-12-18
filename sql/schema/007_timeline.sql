-- +goose Up
CREATE TABLE timeline(
    id SERIAL PRIMARY KEY,
    prose_id uuid NOT NULL, 
    user_id uuid NOT NULL
);

CREATE UNIQUE INDEX sorted_prose ON prose(created_at DESC);
CREATE UNIQUE INDEX unique_timeline ON timeline(prose_id,user_id);

-- +goose Down
DROP TABLE timeline;
DROP INDEX sorted_prose;
DROP INDEX unique_timeline;
