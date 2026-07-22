package httpserver

import (
	"fmt"
	"log/slog"
	"net/http"
	"strconv"

	"example.com/k8s-task-demo/internal/task"
)

type apiHandler struct {
	service TaskService
	logger  *slog.Logger
}

func (h apiHandler) list(response http.ResponseWriter, request *http.Request) {
	status := task.Status(request.URL.Query().Get("status"))
	items, err := h.service.List(request.Context(), status)
	if err != nil {
		h.writeServiceError(response, request, err)
		return
	}
	writeJSON(response, http.StatusOK, dataEnvelope[[]task.Task]{Data: items})
}

func (h apiHandler) get(response http.ResponseWriter, request *http.Request) {
	id, ok := parseID(response, request)
	if !ok {
		return
	}
	item, err := h.service.Get(request.Context(), id)
	if err != nil {
		h.writeServiceError(response, request, err)
		return
	}
	writeJSON(response, http.StatusOK, dataEnvelope[task.Task]{Data: item})
}

func (h apiHandler) create(response http.ResponseWriter, request *http.Request) {
	var input task.CreateInput
	if err := decodeJSON(response, request, &input); err != nil {
		writeAPIError(response, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}

	item, err := h.service.Create(request.Context(), input)
	if err != nil {
		h.writeServiceError(response, request, err)
		return
	}
	response.Header().Set("Location", fmt.Sprintf("/api/v1/tasks/%d", item.ID))
	writeJSON(response, http.StatusCreated, dataEnvelope[task.Task]{Data: item})
}

func (h apiHandler) update(response http.ResponseWriter, request *http.Request) {
	id, ok := parseID(response, request)
	if !ok {
		return
	}

	var input task.UpdateInput
	if err := decodeJSON(response, request, &input); err != nil {
		writeAPIError(response, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}

	item, err := h.service.Update(request.Context(), id, input)
	if err != nil {
		h.writeServiceError(response, request, err)
		return
	}
	writeJSON(response, http.StatusOK, dataEnvelope[task.Task]{Data: item})
}

func (h apiHandler) setStatus(response http.ResponseWriter, request *http.Request) {
	id, ok := parseID(response, request)
	if !ok {
		return
	}

	var input struct {
		Status task.Status `json:"status"`
	}
	if err := decodeJSON(response, request, &input); err != nil {
		writeAPIError(response, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}

	item, err := h.service.SetStatus(request.Context(), id, input.Status)
	if err != nil {
		h.writeServiceError(response, request, err)
		return
	}
	writeJSON(response, http.StatusOK, dataEnvelope[task.Task]{Data: item})
}

func (h apiHandler) delete(response http.ResponseWriter, request *http.Request) {
	id, ok := parseID(response, request)
	if !ok {
		return
	}
	if err := h.service.Delete(request.Context(), id); err != nil {
		h.writeServiceError(response, request, err)
		return
	}
	response.WriteHeader(http.StatusNoContent)
}

func (h apiHandler) writeServiceError(response http.ResponseWriter, request *http.Request, err error) {
	status, code := statusForError(err)
	if status >= http.StatusInternalServerError {
		h.logger.ErrorContext(request.Context(), "request failed",
			"request_id", requestIDFromContext(request.Context()),
			"error", err,
		)
	}
	writeAPIError(response, status, code, publicErrorMessage(err, status))
}

func parseID(response http.ResponseWriter, request *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(request.PathValue("id"), 10, 64)
	if err != nil || id <= 0 {
		writeAPIError(response, http.StatusBadRequest, "invalid_request", "id must be a positive integer")
		return 0, false
	}
	return id, true
}
