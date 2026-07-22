package main

import (
	"context"
	"net"
	"net/http"
	"testing"
	"time"
)

func TestServeStopsWhenContextIsCanceled(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("net.Listen() error = %v", err)
	}

	server := &http.Server{
		Handler: http.HandlerFunc(func(response http.ResponseWriter, _ *http.Request) {
			response.WriteHeader(http.StatusNoContent)
		}),
	}
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() {
		done <- serve(ctx, server, listener, time.Second)
	}()

	response, err := http.Get("http://" + listener.Addr().String())
	if err != nil {
		t.Fatalf("http.Get() error = %v", err)
	}
	response.Body.Close()

	cancel()
	select {
	case err := <-done:
		if err != nil {
			t.Fatalf("serve() error = %v", err)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("serve() did not stop after cancellation")
	}
}
