package toolfilesystem

import (
	"context"
	"errors"
	"io"
	"testing"

	localbk "github.com/cloudwego/eino-ext/adk/backend/local"
	"github.com/cloudwego/eino/adk/filesystem"
	"github.com/cloudwego/eino/components/tool"
	"github.com/cloudwego/eino/schema"
)

func manualExecuteForTest(t *testing.T, backend manualBackend) tool.StreamableTool {
	t.Helper()
	tools, err := newManualTools(context.Background(), backend, true)
	if err != nil {
		t.Fatal(err)
	}
	for _, item := range tools {
		info, err := item.Info(context.Background())
		if err != nil {
			t.Fatal(err)
		}
		if info.Name == "execute" {
			return item.(tool.StreamableTool)
		}
	}
	t.Fatal("execute tool missing")
	return nil
}

func TestManualExecuteStreamFailureAndClose(t *testing.T) {
	ctx := context.Background()
	local, err := localbk.NewBackend(ctx, &localbk.Config{})
	if err != nil {
		t.Fatal(err)
	}
	sentinel := errors.New("shell boundary failed")
	t.Run("start error", func(t *testing.T) {
		backend := &recordingShellBackend{manualBackend: local, err: sentinel}
		_, err := manualExecuteForTest(t, backend).StreamableRun(ctx, `{"command":"fake"}`)
		if !errors.Is(err, sentinel) {
			t.Fatalf("error=%v", err)
		}
	})
	t.Run("receive error", func(t *testing.T) {
		upstream, writer := schema.Pipe[*filesystem.ExecuteResponse](2)
		writer.Send(&filesystem.ExecuteResponse{Output: "first"}, nil)
		writer.Send(nil, sentinel)
		writer.Close()
		backend := &recordingShellBackend{manualBackend: local, stream: upstream}
		stream, err := manualExecuteForTest(t, backend).StreamableRun(ctx, `{"command":"fake"}`)
		if err != nil {
			t.Fatal(err)
		}
		defer stream.Close()
		if chunk, err := stream.Recv(); err != nil || chunk != "first" {
			t.Fatalf("chunk=%q err=%v", chunk, err)
		}
		if _, err := stream.Recv(); !errors.Is(err, sentinel) {
			t.Fatalf("error=%v", err)
		}
	})
	t.Run("close propagates", func(t *testing.T) {
		upstream, writer := schema.Pipe[*filesystem.ExecuteResponse](0)
		defer writer.Close()
		backend := &recordingShellBackend{manualBackend: local, stream: upstream}
		stream, err := manualExecuteForTest(t, backend).StreamableRun(ctx, `{"command":"fake"}`)
		if err != nil {
			t.Fatal(err)
		}
		stream.Close()
		if closed := writer.Send(&filesystem.ExecuteResponse{Output: "unused"}, nil); !closed {
			t.Fatal("upstream reader not closed")
		}
	})
	t.Run("nil chunk skipped", func(t *testing.T) {
		backend := &recordingShellBackend{manualBackend: local, stream: schema.StreamReaderFromArray([]*filesystem.ExecuteResponse{nil, {Output: "after nil"}})}
		stream, err := manualExecuteForTest(t, backend).StreamableRun(ctx, `{"command":"fake"}`)
		if err != nil {
			t.Fatal(err)
		}
		defer stream.Close()
		if chunk, err := stream.Recv(); err != nil || chunk != "after nil" {
			t.Fatalf("chunk=%q err=%v", chunk, err)
		}
		if _, err := stream.Recv(); err != io.EOF {
			t.Fatalf("error=%v", err)
		}
	})
}
