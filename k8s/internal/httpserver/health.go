package httpserver

import (
	"context"
	"net/http"
	"time"
)

type healthHandler struct {
	service TaskService
}

func (h healthHandler) live(response http.ResponseWriter, _ *http.Request) {
	writeJSON(response, http.StatusOK, map[string]string{"status": "ok"})
}

func (h healthHandler) ready(response http.ResponseWriter, request *http.Request) {
	ctx, cancel := context.WithTimeout(request.Context(), 2*time.Second)
	defer cancel()

	if err := h.service.Ping(ctx); err != nil {
		writeJSON(response, http.StatusServiceUnavailable, map[string]string{"status": "unavailable"})
		return
	}
	writeJSON(response, http.StatusOK, map[string]string{"status": "ready"})
}
