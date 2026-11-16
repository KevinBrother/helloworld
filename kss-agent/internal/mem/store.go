// Package mem implements application-owned conversation persistence, not an Eino component.
package mem

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"
)

var validID = regexp.MustCompile(`^[A-Za-z0-9_-]{1,128}$`)

// Store owns a session directory and an in-process cache. Do not share a session
// between concurrent processes or independently cached Stores.
type Store struct {
	dir   string
	mu    sync.Mutex
	cache map[string]*Session
}

type SessionMeta struct {
	ID        string
	Title     string
	CreatedAt time.Time
}

func NewStore(dir string) (*Store, error) {
	if strings.TrimSpace(dir) == "" {
		return nil, fmt.Errorf("session directory must not be empty")
	}
	if err := os.MkdirAll(dir, 0700); err != nil {
		return nil, fmt.Errorf("create session directory: %w", err)
	}
	return &Store{dir: dir, cache: make(map[string]*Session)}, nil
}

// GetOrCreate generates an ID when empty; an explicit missing ID creates a session.
func (s *Store) GetOrCreate(id string) (*Session, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if id == "" {
		var random [16]byte
		if _, err := rand.Read(random[:]); err != nil {
			return nil, err
		}
		id = hex.EncodeToString(random[:])
	}
	if !validID.MatchString(id) {
		return nil, fmt.Errorf("invalid session ID %q: use 1–128 letters, digits, underscores or hyphens", id)
	}
	if session, ok := s.cache[id]; ok {
		return session, nil
	}
	path := filepath.Join(s.dir, id+".jsonl")
	session, err := loadSession(path, id)
	if os.IsNotExist(err) {
		session, err = createSession(path, id)
	}
	if err != nil {
		return nil, fmt.Errorf("open session %s: %w", id, err)
	}
	s.cache[id] = session
	return session, nil
}

func (s *Store) List() ([]SessionMeta, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	entries, err := os.ReadDir(s.dir)
	if err != nil {
		return nil, err
	}
	result := make([]SessionMeta, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".jsonl") {
			continue
		}
		id := strings.TrimSuffix(entry.Name(), ".jsonl")
		if !validID.MatchString(id) {
			return nil, fmt.Errorf("invalid session filename %q", entry.Name())
		}
		session, err := loadSession(filepath.Join(s.dir, entry.Name()), id)
		if err != nil {
			return nil, fmt.Errorf("list session %s: %w", id, err)
		}
		result = append(result, SessionMeta{ID: id, Title: session.Title(), CreatedAt: session.CreatedAt})
	}
	sort.Slice(result, func(i, j int) bool {
		if result[i].CreatedAt.Equal(result[j].CreatedAt) {
			return result[i].ID < result[j].ID
		}
		return result[i].CreatedAt.After(result[j].CreatedAt)
	})
	return result, nil
}

func (s *Store) Delete(id string) error {
	if !validID.MatchString(id) {
		return fmt.Errorf("invalid session ID %q", id)
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	cached := s.cache[id]
	if cached != nil {
		cached.mu.Lock()
		defer cached.mu.Unlock()
	}
	if err := os.Remove(filepath.Join(s.dir, id+".jsonl")); err != nil && !os.IsNotExist(err) {
		return err
	}
	if cached != nil {
		cached.deleted = true
	}
	delete(s.cache, id)
	return nil
}
