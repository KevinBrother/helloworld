package httpserver

import (
	"html/template"
	"io/fs"
	"log/slog"
	"net/http"

	"example.com/k8s-task-demo/internal/task"
	"example.com/k8s-task-demo/web"
)

type pageHandler struct {
	service  TaskService
	logger   *slog.Logger
	template *template.Template
}

type indexData struct {
	Tasks          []task.Task
	CompletedCount int
	LoadError      string
}

func newPageHandler(service TaskService, logger *slog.Logger) pageHandler {
	parsed := template.Must(template.ParseFS(web.Files, "templates/*.html"))
	return pageHandler{service: service, logger: logger, template: parsed}
}

func (h pageHandler) index(response http.ResponseWriter, request *http.Request) {
	items, err := h.service.List(request.Context(), task.StatusAll)
	data := indexData{Tasks: items}
	if err != nil {
		data.Tasks = []task.Task{}
		data.LoadError = "Check the database connection and readiness endpoint."
		h.logger.ErrorContext(request.Context(), "render task list",
			"request_id", requestIDFromContext(request.Context()),
			"error", err,
		)
	}
	for _, item := range data.Tasks {
		if item.Status == task.StatusCompleted {
			data.CompletedCount++
		}
	}

	response.Header().Set("Content-Type", "text/html; charset=utf-8")
	if err := h.template.ExecuteTemplate(response, "index", data); err != nil {
		h.logger.ErrorContext(request.Context(), "render index page", "error", err)
	}
}

func staticHandler() http.Handler {
	staticFiles, err := fs.Sub(web.Files, "static")
	if err != nil {
		panic("httpserver: static assets unavailable: " + err.Error())
	}
	return http.StripPrefix("/static/", http.FileServer(http.FS(staticFiles)))
}
