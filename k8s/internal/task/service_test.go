package task

import (
	"context"
	"errors"
	"testing"
	"time"
)

type fakeRepository struct {
	tasks   map[int64]Task
	nextID  int64
	pingErr error
}

func newFakeRepository() *fakeRepository {
	return &fakeRepository{tasks: make(map[int64]Task), nextID: 1}
}

func (r *fakeRepository) List(_ context.Context, status Status) ([]Task, error) {
	result := make([]Task, 0, len(r.tasks))
	for _, item := range r.tasks {
		if status == StatusAll || item.Status == status {
			result = append(result, item)
		}
	}
	return result, nil
}

func (r *fakeRepository) Get(_ context.Context, id int64) (Task, error) {
	item, ok := r.tasks[id]
	if !ok {
		return Task{}, ErrNotFound
	}
	return item, nil
}

func (r *fakeRepository) Create(_ context.Context, input CreateInput) (Task, error) {
	now := time.Date(2026, time.July, 21, 12, 0, 0, 0, time.UTC)
	item := Task{
		ID:          r.nextID,
		Title:       input.Title,
		Description: input.Description,
		Status:      StatusPending,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	r.tasks[item.ID] = item
	r.nextID++
	return item, nil
}

func (r *fakeRepository) Update(_ context.Context, id int64, input UpdateInput) (Task, error) {
	item, ok := r.tasks[id]
	if !ok {
		return Task{}, ErrNotFound
	}
	item.Title = input.Title
	item.Description = input.Description
	item.UpdatedAt = item.UpdatedAt.Add(time.Minute)
	r.tasks[id] = item
	return item, nil
}

func (r *fakeRepository) SetStatus(_ context.Context, id int64, status Status) (Task, error) {
	item, ok := r.tasks[id]
	if !ok {
		return Task{}, ErrNotFound
	}
	item.Status = status
	item.UpdatedAt = item.UpdatedAt.Add(time.Minute)
	r.tasks[id] = item
	return item, nil
}

func (r *fakeRepository) Delete(_ context.Context, id int64) error {
	if _, ok := r.tasks[id]; !ok {
		return ErrNotFound
	}
	delete(r.tasks, id)
	return nil
}

func (r *fakeRepository) Ping(context.Context) error {
	return r.pingErr
}

func TestServiceCreateRejectsBlankTitle(t *testing.T) {
	service := NewService(newFakeRepository())

	_, err := service.Create(context.Background(), CreateInput{Title: "   "})

	if !errors.Is(err, ErrInvalid) {
		t.Fatalf("Create() error = %v, want ErrInvalid", err)
	}
}

func TestServiceCreateTrimsInputAndDefaultsToPending(t *testing.T) {
	service := NewService(newFakeRepository())

	got, err := service.Create(context.Background(), CreateInput{
		Title:       "  Learn Deployments  ",
		Description: "  Inspect a rollout  ",
	})
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	if got.Title != "Learn Deployments" {
		t.Fatalf("Title = %q, want trimmed title", got.Title)
	}
	if got.Description != "Inspect a rollout" {
		t.Fatalf("Description = %q, want trimmed description", got.Description)
	}
	if got.Status != StatusPending {
		t.Fatalf("Status = %q, want %q", got.Status, StatusPending)
	}
}

func TestServiceCreateRejectsLongFields(t *testing.T) {
	service := NewService(newFakeRepository())

	_, titleErr := service.Create(context.Background(), CreateInput{Title: string(make([]byte, 121))})
	if !errors.Is(titleErr, ErrInvalid) {
		t.Fatalf("long title error = %v, want ErrInvalid", titleErr)
	}

	_, descriptionErr := service.Create(context.Background(), CreateInput{
		Title:       "valid",
		Description: string(make([]byte, 2001)),
	})
	if !errors.Is(descriptionErr, ErrInvalid) {
		t.Fatalf("long description error = %v, want ErrInvalid", descriptionErr)
	}
}

func TestServiceListRejectsUnknownStatus(t *testing.T) {
	service := NewService(newFakeRepository())

	_, err := service.List(context.Background(), Status("unknown"))

	if !errors.Is(err, ErrInvalid) {
		t.Fatalf("List() error = %v, want ErrInvalid", err)
	}
}

func TestServiceUpdateNormalizesFields(t *testing.T) {
	repository := newFakeRepository()
	service := NewService(repository)
	created, err := service.Create(context.Background(), CreateInput{Title: "Original"})
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	got, err := service.Update(context.Background(), created.ID, UpdateInput{
		Title:       "  Updated  ",
		Description: "  Notes  ",
	})
	if err != nil {
		t.Fatalf("Update() error = %v", err)
	}
	if got.Title != "Updated" || got.Description != "Notes" {
		t.Fatalf("Update() = %#v, want normalized fields", got)
	}
}

func TestServiceSetStatusCompletesTask(t *testing.T) {
	repository := newFakeRepository()
	service := NewService(repository)
	created, err := service.Create(context.Background(), CreateInput{Title: "Learn Services"})
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	got, err := service.SetStatus(context.Background(), created.ID, StatusCompleted)
	if err != nil {
		t.Fatalf("SetStatus() error = %v", err)
	}
	if got.Status != StatusCompleted {
		t.Fatalf("Status = %q, want %q", got.Status, StatusCompleted)
	}
}

func TestServiceSetStatusRejectsUnknownStatus(t *testing.T) {
	service := NewService(newFakeRepository())

	_, err := service.SetStatus(context.Background(), 1, Status("blocked"))

	if !errors.Is(err, ErrInvalid) {
		t.Fatalf("SetStatus() error = %v, want ErrInvalid", err)
	}
}

func TestServiceDeleteReturnsNotFound(t *testing.T) {
	service := NewService(newFakeRepository())

	err := service.Delete(context.Background(), 404)

	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("Delete() error = %v, want ErrNotFound", err)
	}
}
