package task

import "time"

type Status string

const (
	StatusAll       Status = ""
	StatusPending   Status = "pending"
	StatusCompleted Status = "completed"
)

type Task struct {
	ID          int64     `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Status      Status    `json:"status"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type CreateInput struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}

type UpdateInput struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}
