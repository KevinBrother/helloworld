package httpserver

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"example.com/k8s-task-demo/internal/task"
)

type fakeTaskService struct {
	tasks   map[int64]task.Task
	nextID  int64
	pingErr error
}

func newFakeTaskService() *fakeTaskService {
	return &fakeTaskService{tasks: make(map[int64]task.Task), nextID: 1}
}

func (s *fakeTaskService) List(_ context.Context, status task.Status) ([]task.Task, error) {
	items := make([]task.Task, 0, len(s.tasks))
	for _, item := range s.tasks {
		if status == task.StatusAll || item.Status == status {
			items = append(items, item)
		}
	}
	return items, nil
}

func (s *fakeTaskService) Get(_ context.Context, id int64) (task.Task, error) {
	item, ok := s.tasks[id]
	if !ok {
		return task.Task{}, task.ErrNotFound
	}
	return item, nil
}

func (s *fakeTaskService) Create(_ context.Context, input task.CreateInput) (task.Task, error) {
	if input.Title == "" {
		return task.Task{}, errors.Join(task.ErrInvalid, errors.New("title is required"))
	}
	now := time.Date(2026, time.July, 21, 12, 0, 0, 0, time.UTC)
	item := task.Task{
		ID:          s.nextID,
		Title:       input.Title,
		Description: input.Description,
		Status:      task.StatusPending,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	s.tasks[item.ID] = item
	s.nextID++
	return item, nil
}

func (s *fakeTaskService) Update(_ context.Context, id int64, input task.UpdateInput) (task.Task, error) {
	item, ok := s.tasks[id]
	if !ok {
		return task.Task{}, task.ErrNotFound
	}
	item.Title = input.Title
	item.Description = input.Description
	s.tasks[id] = item
	return item, nil
}

func (s *fakeTaskService) SetStatus(_ context.Context, id int64, status task.Status) (task.Task, error) {
	item, ok := s.tasks[id]
	if !ok {
		return task.Task{}, task.ErrNotFound
	}
	item.Status = status
	s.tasks[id] = item
	return item, nil
}

func (s *fakeTaskService) Delete(_ context.Context, id int64) error {
	if _, ok := s.tasks[id]; !ok {
		return task.ErrNotFound
	}
	delete(s.tasks, id)
	return nil
}

func (s *fakeTaskService) Ping(context.Context) error {
	return s.pingErr
}

func testHandler(service TaskService) http.Handler {
	return New(Options{
		Service: service,
		Logger:  slog.New(slog.NewTextHandler(io.Discard, nil)),
	})
}

func performJSONRequest(t *testing.T, handler http.Handler, method, target string, body any) *httptest.ResponseRecorder {
	t.Helper()

	var requestBody io.Reader
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("json.Marshal() error = %v", err)
		}
		requestBody = bytes.NewReader(data)
	}
	request := httptest.NewRequest(method, target, requestBody)
	if body != nil {
		request.Header.Set("Content-Type", "application/json")
	}
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	return response
}

func TestAPIListTasks(t *testing.T) {
	service := newFakeTaskService()
	service.tasks[1] = task.Task{ID: 1, Title: "Learn Pods", Status: task.StatusPending}

	response := performJSONRequest(t, testHandler(service), http.MethodGet, "/api/v1/tasks?status=pending", nil)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", response.Code, response.Body.String())
	}
	var envelope struct {
		Data []task.Task `json:"data"`
	}
	if err := json.NewDecoder(response.Body).Decode(&envelope); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(envelope.Data) != 1 || envelope.Data[0].Title != "Learn Pods" {
		t.Fatalf("data = %#v, want one task", envelope.Data)
	}
}

func TestAPICreateTask(t *testing.T) {
	response := performJSONRequest(t, testHandler(newFakeTaskService()), http.MethodPost, "/api/v1/tasks", map[string]string{
		"title":       "Learn Deployments",
		"description": "Observe a rollout",
	})

	if response.Code != http.StatusCreated {
		t.Fatalf("status = %d, want 201; body=%s", response.Code, response.Body.String())
	}
	if location := response.Header().Get("Location"); location != "/api/v1/tasks/1" {
		t.Fatalf("Location = %q, want task resource URL", location)
	}
}

func TestAPICreateRejectsInvalidJSON(t *testing.T) {
	request := httptest.NewRequest(http.MethodPost, "/api/v1/tasks", bytes.NewBufferString("{"))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()

	testHandler(newFakeTaskService()).ServeHTTP(response, request)

	if response.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", response.Code)
	}
	if !bytes.Contains(response.Body.Bytes(), []byte(`"code":"invalid_request"`)) {
		t.Fatalf("body = %s, want invalid_request error", response.Body.String())
	}
}

func TestAPIUpdateMissingTask(t *testing.T) {
	response := performJSONRequest(t, testHandler(newFakeTaskService()), http.MethodPut, "/api/v1/tasks/404", map[string]string{
		"title": "Missing",
	})

	if response.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404; body=%s", response.Code, response.Body.String())
	}
}

func TestAPISetStatus(t *testing.T) {
	service := newFakeTaskService()
	service.tasks[1] = task.Task{ID: 1, Title: "Learn Services", Status: task.StatusPending}

	response := performJSONRequest(t, testHandler(service), http.MethodPatch, "/api/v1/tasks/1/status", map[string]string{
		"status": "completed",
	})

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", response.Code, response.Body.String())
	}
	if service.tasks[1].Status != task.StatusCompleted {
		t.Fatalf("stored status = %q, want completed", service.tasks[1].Status)
	}
}

func TestAPIDeleteTask(t *testing.T) {
	service := newFakeTaskService()
	service.tasks[1] = task.Task{ID: 1, Title: "Delete me", Status: task.StatusPending}

	response := performJSONRequest(t, testHandler(service), http.MethodDelete, "/api/v1/tasks/1", nil)

	if response.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want 204", response.Code)
	}
}
