package mem

import (
	"bufio"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/cloudwego/eino/schema"
)

// maxRecordBytes includes the newline; use the same bound for writing and reading.
const maxRecordBytes = 16 * 1024 * 1024

type Session struct {
	ID        string
	CreatedAt time.Time
	path      string
	mu        sync.Mutex
	messages  []*schema.Message
	deleted   bool
}

type sessionHeader struct {
	Type        string    `json:"type"`
	ID          string    `json:"id"`
	CreatedAt   time.Time `json:"created_at"`
	MessageKind string    `json:"message_kind"`
}

// Append persists a complete message before updating the in-memory history.
func (s *Session) Append(message *schema.Message) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.deleted {
		return fmt.Errorf("session %s was deleted", s.ID)
	}
	if err := validateMessage(message); err != nil {
		return err
	}
	data, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("encode message: %w", err)
	}
	data = append(data, '\n')
	if len(data) > maxRecordBytes {
		return fmt.Errorf("message exceeds %d byte record limit", maxRecordBytes)
	}
	// Own the saved value: later mutations of the input must not change history.
	var saved schema.Message
	if err := json.Unmarshal(data, &saved); err != nil {
		return err
	}
	f, err := os.OpenFile(s.path, os.O_WRONLY|os.O_APPEND, 0600)
	if err != nil {
		return fmt.Errorf("open session for append: %w", err)
	}
	info, err := f.Stat()
	if err != nil {
		_ = f.Close()
		return err
	}
	_, writeErr := f.Write(data)
	if writeErr == nil {
		writeErr = f.Sync()
	}
	if writeErr != nil {
		// Roll back a failed append when possible. Crashes are detected on next load.
		rollbackErr := f.Truncate(info.Size())
		return errors.Join(writeErr, rollbackErr, f.Close())
	}
	if err := f.Close(); err != nil {
		return err
	}
	s.messages = append(s.messages, &saved)
	return nil
}

// GetMessages returns a slice snapshot. Treat the messages it contains as read-only.
func (s *Session) GetMessages() []*schema.Message {
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([]*schema.Message(nil), s.messages...)
}

func (s *Session) Title() string {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, message := range s.messages {
		if message.Role != schema.User {
			continue
		}
		title := strings.TrimSpace(message.Content)
		if title == "" {
			continue
		}
		runes := []rune(strings.Join(strings.Fields(title), " "))
		if len(runes) > 60 {
			return string(runes[:60]) + "..."
		}
		return string(runes)
	}
	return "New Session"
}

func createSession(path, id string) (*Session, error) {
	created := time.Now().UTC()
	header := sessionHeader{Type: "session", ID: id, CreatedAt: created, MessageKind: "message"}
	data, err := json.Marshal(header)
	if err != nil {
		return nil, err
	}
	f, err := os.OpenFile(path, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if err != nil {
		return nil, err
	}
	_, err = f.Write(append(data, '\n'))
	if err == nil {
		err = f.Sync()
	}
	err = errors.Join(err, f.Close())
	if err != nil {
		_ = os.Remove(path)
		return nil, err
	}
	return &Session{ID: id, CreatedAt: created, path: path}, nil
}

func loadSession(path, id string) (*Session, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	info, err := f.Stat()
	if err != nil {
		return nil, err
	}
	if info.Size() == 0 {
		return nil, fmt.Errorf("empty session file")
	}
	// Without this check an append could join a truncated final line with new JSON.
	var last [1]byte
	if _, err := f.ReadAt(last[:], info.Size()-1); err != nil {
		return nil, err
	}
	if last[0] != '\n' {
		return nil, fmt.Errorf("session has an unterminated final record")
	}
	scanner := bufio.NewScanner(f)
	scanner.Buffer(make([]byte, 4096), maxRecordBytes)
	if !scanner.Scan() {
		return nil, fmt.Errorf("read session header: %w", errors.Join(scanner.Err(), errors.New("missing header")))
	}
	var header sessionHeader
	if err := json.Unmarshal(scanner.Bytes(), &header); err != nil {
		return nil, fmt.Errorf("decode session header: %w", err)
	}
	if header.Type != "session" || header.ID != id || header.MessageKind != "message" || header.CreatedAt.IsZero() {
		return nil, fmt.Errorf("invalid session header or message kind")
	}
	session := &Session{ID: id, CreatedAt: header.CreatedAt, path: path}
	line := 1
	for scanner.Scan() {
		line++
		var message *schema.Message
		if err := json.Unmarshal(scanner.Bytes(), &message); err != nil {
			return nil, fmt.Errorf("line %d: %w", line, err)
		}
		if err := validateMessage(message); err != nil {
			return nil, fmt.Errorf("line %d: %w", line, err)
		}
		session.messages = append(session.messages, message)
	}
	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("read session: %w", err)
	}
	return session, nil
}

func validateMessage(message *schema.Message) error {
	if message == nil {
		return fmt.Errorf("message must not be nil")
	}
	switch message.Role {
	case schema.User, schema.Assistant, schema.System, schema.Tool:
		return nil
	default:
		return fmt.Errorf("invalid message role %q", message.Role)
	}
}
