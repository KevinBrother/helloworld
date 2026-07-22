package httpserver

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"sync/atomic"

	"example.com/k8s-task-demo/internal/task"
)

type TaskService interface {
	List(context.Context, task.Status) ([]task.Task, error)
	Get(context.Context, int64) (task.Task, error)
	Create(context.Context, task.CreateInput) (task.Task, error)
	Update(context.Context, int64, task.UpdateInput) (task.Task, error)
	SetStatus(context.Context, int64, task.Status) (task.Task, error)
	Delete(context.Context, int64) error
	Ping(context.Context) error
}

type Options struct {
	Service TaskService
	Logger  *slog.Logger
}

func New(options Options) http.Handler {
	if options.Service == nil {
		panic("httpserver: Service is required")
	}
	if options.Logger == nil {
		options.Logger = slog.Default()
	}

	api := apiHandler{service: options.Service, logger: options.Logger}
	health := healthHandler{service: options.Service}
	pages := newPageHandler(options.Service, options.Logger)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /", pages.index)
	mux.Handle("GET /static/", staticHandler())
	mux.HandleFunc("GET /health/live", health.live)
	mux.HandleFunc("GET /health/ready", health.ready)
	mux.HandleFunc("GET /api/v1/tasks", api.list)
	mux.HandleFunc("POST /api/v1/tasks", api.create)
	mux.HandleFunc("GET /api/v1/tasks/{id}", api.get)
	mux.HandleFunc("PUT /api/v1/tasks/{id}", api.update)
	mux.HandleFunc("PATCH /api/v1/tasks/{id}/status", api.setStatus)
	mux.HandleFunc("DELETE /api/v1/tasks/{id}", api.delete)

	return requestMiddleware(options.Logger, mux)
}

type requestIDKey struct{}

var requestSequence atomic.Uint64

func requestMiddleware(logger *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		requestID := request.Header.Get("X-Request-ID")
		if requestID == "" {
			requestID = fmt.Sprintf("req-%016x", requestSequence.Add(1))
		}
		response.Header().Set("X-Request-ID", requestID)
		request = request.WithContext(context.WithValue(request.Context(), requestIDKey{}, requestID))

		recorder := &statusRecorder{ResponseWriter: response, status: http.StatusOK}
		next.ServeHTTP(recorder, request)

		logger.InfoContext(request.Context(), "http request",
			"request_id", requestID,
			"method", request.Method,
			"path", request.URL.Path,
			"status", recorder.status,
		)
	})
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}
