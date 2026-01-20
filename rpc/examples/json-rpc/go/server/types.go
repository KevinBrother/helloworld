package main

// User represents a user in the system
type User struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
	Age   int    `json:"age"`
}

// CreateUserRequest represents a request to create a user
type CreateUserRequest struct {
	Name  string `json:"name"`
	Email string `json:"email"`
	Age   int    `json:"age"`
}

// GetUserResponse represents the response for GetUser
type GetUserResponse struct {
	User  *User  `json:"user"`
	Error string `json:"error,omitempty"`
}

// CreateUserResponse represents the response for CreateUser
type CreateUserResponse struct {
	ID    int    `json:"id"`
	Error string `json:"error,omitempty"`
}

// ListUsersResponse represents the response for ListUsers
type ListUsersResponse struct {
	Users []*User `json:"users"`
	Error string  `json:"error,omitempty"`
}
