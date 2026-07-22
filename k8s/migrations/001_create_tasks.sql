CREATE TABLE tasks (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(120) NOT NULL,
    description VARCHAR(2000) NOT NULL DEFAULT '',
    status VARCHAR(16) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX tasks_status_updated_at_idx
    ON tasks (status, updated_at DESC);
