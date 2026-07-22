package postgres

import (
	"context"
	"errors"
	"fmt"

	"example.com/k8s-task-demo/internal/task"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const taskColumns = "id, title, description, status, created_at, updated_at"

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) List(ctx context.Context, status task.Status) ([]task.Task, error) {
	query := "SELECT " + taskColumns + " FROM tasks"
	args := make([]any, 0, 1)
	if status != task.StatusAll {
		query += " WHERE status = $1"
		args = append(args, status)
	}
	query += " ORDER BY updated_at DESC, id DESC"

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list tasks: %w", err)
	}
	defer rows.Close()

	items := make([]task.Task, 0)
	for rows.Next() {
		item, err := scanTask(rows)
		if err != nil {
			return nil, fmt.Errorf("scan task list: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate task list: %w", err)
	}
	return items, nil
}

func (r *Repository) Get(ctx context.Context, id int64) (task.Task, error) {
	item, err := scanTask(r.pool.QueryRow(ctx,
		"SELECT "+taskColumns+" FROM tasks WHERE id = $1",
		id,
	))
	return item, mapQueryError("get task", err)
}

func (r *Repository) Create(ctx context.Context, input task.CreateInput) (task.Task, error) {
	item, err := scanTask(r.pool.QueryRow(ctx, `
		INSERT INTO tasks (title, description)
		VALUES ($1, $2)
		RETURNING `+taskColumns,
		input.Title,
		input.Description,
	))
	return item, mapQueryError("create task", err)
}

func (r *Repository) Update(ctx context.Context, id int64, input task.UpdateInput) (task.Task, error) {
	item, err := scanTask(r.pool.QueryRow(ctx, `
		UPDATE tasks
		SET title = $2, description = $3, updated_at = NOW()
		WHERE id = $1
		RETURNING `+taskColumns,
		id,
		input.Title,
		input.Description,
	))
	return item, mapQueryError("update task", err)
}

func (r *Repository) SetStatus(ctx context.Context, id int64, status task.Status) (task.Task, error) {
	item, err := scanTask(r.pool.QueryRow(ctx, `
		UPDATE tasks
		SET status = $2, updated_at = NOW()
		WHERE id = $1
		RETURNING `+taskColumns,
		id,
		status,
	))
	return item, mapQueryError("set task status", err)
}

func (r *Repository) Delete(ctx context.Context, id int64) error {
	result, err := r.pool.Exec(ctx, "DELETE FROM tasks WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("delete task: %w", err)
	}
	if result.RowsAffected() == 0 {
		return task.ErrNotFound
	}
	return nil
}

func (r *Repository) Ping(ctx context.Context) error {
	if err := r.pool.Ping(ctx); err != nil {
		return fmt.Errorf("%w: %v", task.ErrUnavailable, err)
	}
	return nil
}

type rowScanner interface {
	Scan(...any) error
}

func scanTask(row rowScanner) (task.Task, error) {
	var item task.Task
	err := row.Scan(
		&item.ID,
		&item.Title,
		&item.Description,
		&item.Status,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	return item, err
}

func mapQueryError(operation string, err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return task.ErrNotFound
	}
	return fmt.Errorf("%s: %w", operation, err)
}
