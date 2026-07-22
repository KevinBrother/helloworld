package httpserver

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestLiveAlwaysReturnsOK(t *testing.T) {
	service := newFakeTaskService()
	service.pingErr = errors.New("database down")

	response := httptest.NewRecorder()
	testHandler(service).ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/health/live", nil))

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", response.Code)
	}
}

func TestReadyReturnsOKWhenRepositoryResponds(t *testing.T) {
	response := httptest.NewRecorder()
	testHandler(newFakeTaskService()).ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/health/ready", nil))

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", response.Code)
	}
}

func TestReadyReturnsServiceUnavailableWhenRepositoryPingFails(t *testing.T) {
	service := newFakeTaskService()
	service.pingErr = errors.New("database down")

	response := httptest.NewRecorder()
	testHandler(service).ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/health/ready", nil))

	if response.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want 503", response.Code)
	}
}
