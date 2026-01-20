package main

import (
	"testing"
)

func TestNewUserService(t *testing.T) {
	service := NewUserService()
	if service == nil {
		t.Fatal("NewUserService returned nil")
	}
	if service.users == nil {
		t.Error("users map is not initialized")
	}
	if service.nextID != 1 {
		t.Errorf("expected nextID to be 1, got %d", service.nextID)
	}
}

func TestCreateUser(t *testing.T) {
	service := NewUserService()

	tests := []struct {
		name    string
		req     CreateUserRequest
		wantErr string
	}{
		{
			name: "valid user",
			req: CreateUserRequest{
				Name:  "Alice",
				Email: "alice@example.com",
				Age:   28,
			},
			wantErr: "",
		},
		{
			name: "empty name",
			req: CreateUserRequest{
				Name:  "",
				Email: "test@example.com",
				Age:   25,
			},
			wantErr: "name is required",
		},
		{
			name: "empty email",
			req: CreateUserRequest{
				Name:  "Bob",
				Email: "",
				Age:   25,
			},
			wantErr: "email is required",
		},
		{
			name: "negative age",
			req: CreateUserRequest{
				Name:  "Charlie",
				Email: "charlie@example.com",
				Age:   -1,
			},
			wantErr: "age must be positive",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reply := &CreateUserResponse{}
			service.CreateUser(tt.req, reply)

			if tt.wantErr != "" {
				if reply.Error != tt.wantErr {
					t.Errorf("expected error %q, got %q", tt.wantErr, reply.Error)
				}
			} else {
				if reply.Error != "" {
					t.Errorf("unexpected error: %s", reply.Error)
				}
				if reply.ID == 0 {
					t.Error("expected non-zero ID")
				}
			}
		})
	}
}

func TestGetUser(t *testing.T) {
	service := NewUserService()

	// Create a user first
	createReply := &CreateUserResponse{}
	service.CreateUser(CreateUserRequest{
		Name:  "Alice",
		Email: "alice@example.com",
		Age:   28,
	}, createReply)

	// Test getting the user
	t.Run("get existing user", func(t *testing.T) {
		reply := &GetUserResponse{}
		service.GetUser(createReply.ID, reply)

		if reply.Error != "" {
			t.Errorf("unexpected error: %s", reply.Error)
		}
		if reply.User == nil {
			t.Fatal("expected user to be returned")
		}
		if reply.User.Name != "Alice" {
			t.Errorf("expected name 'Alice', got %q", reply.User.Name)
		}
	})

	// Test getting non-existent user
	t.Run("get non-existent user", func(t *testing.T) {
		reply := &GetUserResponse{}
		service.GetUser(999, reply)

		if reply.Error == "" {
			t.Error("expected error for non-existent user")
		}
	})
}

func TestListUsers(t *testing.T) {
	service := NewUserService()

	// Create multiple users
	for i := 1; i <= 3; i++ {
		service.CreateUser(CreateUserRequest{
			Name:  fmt.Sprintf("User%d", i),
			Email: fmt.Sprintf("user%d@example.com", i),
			Age:   20 + i,
		}, &CreateUserResponse{})
	}

	// List users
	reply := &ListUsersResponse{}
	service.ListUsers(0, reply)

	if len(reply.Users) != 3 {
		t.Errorf("expected 3 users, got %d", len(reply.Users))
	}
}

func TestDeleteUser(t *testing.T) {
	service := NewUserService()

	// Create a user first
	createReply := &CreateUserResponse{}
	service.CreateUser(CreateUserRequest{
		Name:  "Alice",
		Email: "alice@example.com",
		Age:   28,
	}, createReply)

	// Delete the user
	deleteReply := ""
	service.DeleteUser(createReply.ID, &deleteReply)

	// Verify user is deleted
	getReply := &GetUserResponse{}
	service.GetUser(createReply.ID, getReply)

	if getReply.Error == "" {
		t.Error("expected error when getting deleted user")
	}
}

func TestUpdateUser(t *testing.T) {
	service := NewUserService()

	// Create a user first
	createReply := &CreateUserResponse{}
	service.CreateUser(CreateUserRequest{
		Name:  "Alice",
		Email: "alice@example.com",
		Age:   28,
	}, createReply)

	// Update the user
	args := struct {
		ID    int
		Name  string
		Email string
		Age   int
	}{
		ID:    createReply.ID,
		Name:  "Alice Smith",
		Email: "alice.smith@example.com",
		Age:   29,
	}
	reply := &GetUserResponse{}
	service.UpdateUser(args, reply)

	if reply.Error != "" {
		t.Errorf("unexpected error: %s", reply.Error)
	}
	if reply.User.Name != "Alice Smith" {
		t.Errorf("expected name 'Alice Smith', got %q", reply.User.Name)
	}
	if reply.User.Email != "alice.smith@example.com" {
		t.Errorf("expected email 'alice.smith@example.com', got %q", reply.User.Email)
	}
	if reply.User.Age != 29 {
		t.Errorf("expected age 29, got %d", reply.User.Age)
	}
}
