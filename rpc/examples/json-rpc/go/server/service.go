package main

import (
	"errors"
	"fmt"
	"net/rpc"
	"sync"
)

// UserService provides user management operations
type UserService struct {
	mu     sync.RWMutex
	users  map[int]*User
	nextID int
}

// NewUserService creates a new UserService
func NewUserService() *UserService {
	return &UserService{
		users:  make(map[int]*User),
		nextID: 1,
	}
}

// GetUser retrieves a user by ID
// RPC methods must have the signature: func (t *T) MethodName(argType T1, replyType T2) error
func (s *UserService) GetUser(id int, reply *GetUserResponse) error {
	s.mu.RLock()
	defer s.mu.RUnlock()

	user, exists := s.users[id]
	if !exists {
		reply.Error = fmt.Sprintf("user with id %d not found", id)
		return nil
	}

	reply.User = user
	return nil
}

// CreateUser creates a new user
func (s *UserService) CreateUser(req CreateUserRequest, reply *CreateUserResponse) error {
	if req.Name == "" {
		reply.Error = "name is required"
		return nil
	}
	if req.Email == "" {
		reply.Error = "email is required"
		return nil
	}
	if req.Age <= 0 {
		reply.Error = "age must be positive"
		return nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	user := &User{
		ID:    s.nextID,
		Name:  req.Name,
		Email: req.Email,
		Age:   req.Age,
	}

	s.users[s.nextID] = user
	reply.ID = s.nextID
	s.nextID++

	return nil
}

// ListUsers returns all users
func (s *UserService) ListUsers(_ int, reply *ListUsersResponse) error {
	s.mu.RLock()
	defer s.mu.RUnlock()

	users := make([]*User, 0, len(s.users))
	for _, user := range s.users {
		users = append(users, user)
	}

	reply.Users = users
	return nil
}

// Ensure UserService implements rpc.Service interface
var _ rpc.ServerInterface = (*UserService)(nil)

// DeleteUser deletes a user by ID
func (s *UserService) DeleteUser(id int, reply *string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.users[id]; !exists {
		*reply = fmt.Sprintf("user with id %d not found", id)
		return nil
	}

	delete(s.users, id)
	*reply = "user deleted successfully"
	return nil
}

// UpdateUser updates an existing user
func (s *UserService) UpdateUser(args struct {
	ID    int
	Name  string
	Email string
	Age   int
}, reply *GetUserResponse) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	user, exists := s.users[args.ID]
	if !exists {
		reply.Error = fmt.Sprintf("user with id %d not found", args.ID)
		return nil
	}

	if args.Name != "" {
		user.Name = args.Name
	}
	if args.Email != "" {
		user.Email = args.Email
	}
	if args.Age > 0 {
		user.Age = args.Age
	}

	reply.User = user
	return nil
}

// ErrorExample demonstrates error handling in RPC
func (s *UserService) ErrorExample(_ int, reply *string) error {
	*reply = "error occurred"
	return errors.New("this is a deliberate error")
}
