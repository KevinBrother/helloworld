package task

import (
	"context"
	"errors"
)

var (
	ErrNotFound    = errors.New("task not found")
	ErrInvalid     = errors.New("invalid task")
	ErrUnavailable = errors.New("task repository unavailable")
)

type Repository interface {
	List(context.Context, Status) ([]Task, error)
	Get(context.Context, int64) (Task, error)
	Create(context.Context, CreateInput) (Task, error)
	Update(context.Context, int64, UpdateInput) (Task, error)
	SetStatus(context.Context, int64, Status) (Task, error)
	Delete(context.Context, int64) error
	Ping(context.Context) error
}
