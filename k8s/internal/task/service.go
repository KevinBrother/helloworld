package task

import (
	"context"
	"fmt"
	"strings"
)

const (
	maxTitleLength       = 120
	maxDescriptionLength = 2000
)

type Service struct {
	repository Repository
}

func NewService(repository Repository) *Service {
	return &Service{repository: repository}
}

func (s *Service) List(ctx context.Context, status Status) ([]Task, error) {
	if !validListStatus(status) {
		return nil, fmt.Errorf("%w: unsupported status %q", ErrInvalid, status)
	}
	return s.repository.List(ctx, status)
}

func (s *Service) Get(ctx context.Context, id int64) (Task, error) {
	if id <= 0 {
		return Task{}, fmt.Errorf("%w: id must be positive", ErrInvalid)
	}
	return s.repository.Get(ctx, id)
}

func (s *Service) Create(ctx context.Context, input CreateInput) (Task, error) {
	normalized, err := normalizeInput(input.Title, input.Description)
	if err != nil {
		return Task{}, err
	}
	return s.repository.Create(ctx, CreateInput(normalized))
}

func (s *Service) Update(ctx context.Context, id int64, input UpdateInput) (Task, error) {
	if id <= 0 {
		return Task{}, fmt.Errorf("%w: id must be positive", ErrInvalid)
	}
	normalized, err := normalizeInput(input.Title, input.Description)
	if err != nil {
		return Task{}, err
	}
	return s.repository.Update(ctx, id, UpdateInput(normalized))
}

func (s *Service) SetStatus(ctx context.Context, id int64, status Status) (Task, error) {
	if id <= 0 {
		return Task{}, fmt.Errorf("%w: id must be positive", ErrInvalid)
	}
	if status != StatusPending && status != StatusCompleted {
		return Task{}, fmt.Errorf("%w: unsupported status %q", ErrInvalid, status)
	}
	return s.repository.SetStatus(ctx, id, status)
}

func (s *Service) Delete(ctx context.Context, id int64) error {
	if id <= 0 {
		return fmt.Errorf("%w: id must be positive", ErrInvalid)
	}
	return s.repository.Delete(ctx, id)
}

func (s *Service) Ping(ctx context.Context) error {
	return s.repository.Ping(ctx)
}

func validListStatus(status Status) bool {
	return status == StatusAll || status == StatusPending || status == StatusCompleted
}

func normalizeInput(title, description string) (CreateInput, error) {
	title = strings.TrimSpace(title)
	description = strings.TrimSpace(description)

	switch {
	case title == "":
		return CreateInput{}, fmt.Errorf("%w: title is required", ErrInvalid)
	case len([]rune(title)) > maxTitleLength:
		return CreateInput{}, fmt.Errorf("%w: title must not exceed %d characters", ErrInvalid, maxTitleLength)
	case len([]rune(description)) > maxDescriptionLength:
		return CreateInput{}, fmt.Errorf("%w: description must not exceed %d characters", ErrInvalid, maxDescriptionLength)
	default:
		return CreateInput{Title: title, Description: description}, nil
	}
}
