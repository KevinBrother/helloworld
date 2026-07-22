package httpserver

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"example.com/k8s-task-demo/internal/task"
)

func TestIndexRendersTaskManager(t *testing.T) {
	service := newFakeTaskService()
	service.tasks[1] = task.Task{ID: 1, Title: "Learn Pods", Description: "Inspect pod state", Status: task.StatusPending}

	response := httptest.NewRecorder()
	testHandler(service).ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/", nil))

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", response.Code)
	}
	for _, expected := range []string{
		`<main`,
		`Task Board`,
		`aria-label="Create a task"`,
		`data-filter="pending"`,
		`Learn Pods`,
		`1 task`,
	} {
		if !bytes.Contains(response.Body.Bytes(), []byte(expected)) {
			t.Fatalf("body does not contain %q", expected)
		}
	}
}

func TestIndexShowsEmptyState(t *testing.T) {
	response := httptest.NewRecorder()
	testHandler(newFakeTaskService()).ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/", nil))

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", response.Code)
	}
	if !bytes.Contains(response.Body.Bytes(), []byte(`data-empty-state`)) {
		t.Fatalf("body does not contain empty state")
	}
}

func TestIndexReturnsServiceUnavailableWhenTasksCannotLoad(t *testing.T) {
	service := newFakeTaskService()
	service.pingErr = task.ErrUnavailable

	response := httptest.NewRecorder()
	testHandler(service).ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/", nil))

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want usable page with inline error", response.Code)
	}
}

func TestStaticAssetsAreServed(t *testing.T) {
	for _, target := range []string{"/static/app.css", "/static/app.js"} {
		response := httptest.NewRecorder()
		testHandler(newFakeTaskService()).ServeHTTP(response, httptest.NewRequest(http.MethodGet, target, nil))

		if response.Code != http.StatusOK {
			t.Fatalf("%s status = %d, want 200", target, response.Code)
		}
		if response.Header().Get("Content-Type") == "" {
			t.Fatalf("%s has no Content-Type", target)
		}
	}
}
