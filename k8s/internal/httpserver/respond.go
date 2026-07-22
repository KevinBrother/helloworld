package httpserver

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"

	"example.com/k8s-task-demo/internal/task"
)

const maxRequestBodyBytes = 1 << 20

type dataEnvelope[T any] struct {
	Data T `json:"data"`
}

type errorEnvelope struct {
	Error apiError `json:"error"`
}

type apiError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func writeJSON(response http.ResponseWriter, status int, body any) {
	response.Header().Set("Content-Type", "application/json; charset=utf-8")
	response.WriteHeader(status)
	_ = json.NewEncoder(response).Encode(body)
}

func writeAPIError(response http.ResponseWriter, status int, code, message string) {
	writeJSON(response, status, errorEnvelope{Error: apiError{Code: code, Message: message}})
}

func decodeJSON(response http.ResponseWriter, request *http.Request, destination any) error {
	request.Body = http.MaxBytesReader(response, request.Body, maxRequestBodyBytes)
	decoder := json.NewDecoder(request.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(destination); err != nil {
		return fmt.Errorf("invalid JSON body: %w", err)
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return errors.New("request body must contain one JSON object")
	}
	return nil
}

func statusForError(err error) (int, string) {
	switch {
	case errors.Is(err, task.ErrInvalid):
		return http.StatusBadRequest, "invalid_request"
	case errors.Is(err, task.ErrNotFound):
		return http.StatusNotFound, "not_found"
	case errors.Is(err, task.ErrUnavailable):
		return http.StatusServiceUnavailable, "service_unavailable"
	default:
		return http.StatusInternalServerError, "internal_error"
	}
}

func publicErrorMessage(err error, status int) string {
	if status >= http.StatusInternalServerError {
		return "the request could not be completed"
	}

	message := err.Error()
	for _, prefix := range []string{
		task.ErrInvalid.Error() + ": ",
		task.ErrNotFound.Error() + ": ",
		task.ErrUnavailable.Error() + ": ",
	} {
		message = strings.TrimPrefix(message, prefix)
	}
	if index := strings.LastIndex(message, "\n"); index >= 0 {
		message = message[index+1:]
	}
	return message
}

func requestIDFromContext(ctx context.Context) string {
	requestID, _ := ctx.Value(requestIDKey{}).(string)
	return requestID
}
