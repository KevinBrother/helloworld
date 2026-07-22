package postgres

import (
	"context"
	"errors"
	"testing"
	"time"

	"example.com/k8s-task-demo/internal/task"
)

func preparedRepository(t *testing.T) (*Repository, context.Context) {
	t.Helper()

	pool := testPool(t)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	t.Cleanup(cancel)

	if err := Migrate(ctx, pool); err != nil {
		t.Fatalf("Migrate() error = %v", err)
	}
	if _, err := pool.Exec(ctx, "TRUNCATE tasks RESTART IDENTITY"); err != nil {
		t.Fatalf("truncate tasks error = %v", err)
	}
	return NewRepository(pool), ctx
}

func TestRepositoryCRUD(t *testing.T) {
	repository, ctx := preparedRepository(t)

	created, err := repository.Create(ctx, task.CreateInput{
		Title:       "Learn StatefulSets",
		Description: "Inspect stable storage",
	})
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	if created.ID != 1 || created.Status != task.StatusPending {
		t.Fatalf("Create() = %#v, want ID 1 and pending status", created)
	}

	got, err := repository.Get(ctx, created.ID)
	if err != nil {
		t.Fatalf("Get() error = %v", err)
	}
	if got.Title != created.Title {
		t.Fatalf("Get().Title = %q, want %q", got.Title, created.Title)
	}

	updated, err := repository.Update(ctx, created.ID, task.UpdateInput{
		Title:       "Learn PersistentVolumes",
		Description: "Delete the pod and verify data",
	})
	if err != nil {
		t.Fatalf("Update() error = %v", err)
	}
	if updated.Title != "Learn PersistentVolumes" {
		t.Fatalf("Update().Title = %q", updated.Title)
	}

	completed, err := repository.SetStatus(ctx, created.ID, task.StatusCompleted)
	if err != nil {
		t.Fatalf("SetStatus() error = %v", err)
	}
	if completed.Status != task.StatusCompleted {
		t.Fatalf("SetStatus().Status = %q", completed.Status)
	}

	if err := repository.Delete(ctx, created.ID); err != nil {
		t.Fatalf("Delete() error = %v", err)
	}
	if _, err := repository.Get(ctx, created.ID); !errors.Is(err, task.ErrNotFound) {
		t.Fatalf("Get() after delete error = %v, want ErrNotFound", err)
	}
}

func TestRepositoryReturnsNotFound(t *testing.T) {
	repository, ctx := preparedRepository(t)

	if _, err := repository.Get(ctx, 404); !errors.Is(err, task.ErrNotFound) {
		t.Fatalf("Get() error = %v, want ErrNotFound", err)
	}
	if _, err := repository.Update(ctx, 404, task.UpdateInput{Title: "Missing"}); !errors.Is(err, task.ErrNotFound) {
		t.Fatalf("Update() error = %v, want ErrNotFound", err)
	}
	if _, err := repository.SetStatus(ctx, 404, task.StatusCompleted); !errors.Is(err, task.ErrNotFound) {
		t.Fatalf("SetStatus() error = %v, want ErrNotFound", err)
	}
	if err := repository.Delete(ctx, 404); !errors.Is(err, task.ErrNotFound) {
		t.Fatalf("Delete() error = %v, want ErrNotFound", err)
	}
}

func TestRepositoryListFiltersStatus(t *testing.T) {
	repository, ctx := preparedRepository(t)

	first, err := repository.Create(ctx, task.CreateInput{Title: "Pending"})
	if err != nil {
		t.Fatalf("Create(first) error = %v", err)
	}
	second, err := repository.Create(ctx, task.CreateInput{Title: "Completed"})
	if err != nil {
		t.Fatalf("Create(second) error = %v", err)
	}
	if _, err := repository.SetStatus(ctx, second.ID, task.StatusCompleted); err != nil {
		t.Fatalf("SetStatus() error = %v", err)
	}

	pending, err := repository.List(ctx, task.StatusPending)
	if err != nil {
		t.Fatalf("List(pending) error = %v", err)
	}
	if len(pending) != 1 || pending[0].ID != first.ID {
		t.Fatalf("List(pending) = %#v, want first task", pending)
	}

	all, err := repository.List(ctx, task.StatusAll)
	if err != nil {
		t.Fatalf("List(all) error = %v", err)
	}
	if len(all) != 2 {
		t.Fatalf("List(all) length = %d, want 2", len(all))
	}
}

func TestRepositoryPing(t *testing.T) {
	repository, ctx := preparedRepository(t)

	if err := repository.Ping(ctx); err != nil {
		t.Fatalf("Ping() error = %v", err)
	}
}
