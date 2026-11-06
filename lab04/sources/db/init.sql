-- Executed automatically by the postgres image on FIRST start only
-- (when the data directory is empty).
CREATE TABLE IF NOT EXISTS tasks (
    id         SERIAL PRIMARY KEY,
    title      VARCHAR(200) NOT NULL,
    done       BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

INSERT INTO tasks (title, done) VALUES
    ('Install Docker', TRUE),
    ('Write the docker-compose file', FALSE);
