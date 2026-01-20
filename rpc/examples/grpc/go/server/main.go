package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"sync"
	"time"

	pb "github.com/example/grpc/proto"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
	"google.golang.org/grpc/status"
)

type server struct {
	pb.UnimplementedUserServiceServer
	mu     sync.RWMutex
	users  map[int32]*pb.User
	nextID int32
}

func newServer() *server {
	s := &server{
		users:  make(map[int32]*pb.User),
		nextID: 1,
	}
	// Add some initial users
	s.users[1] = &pb.User{Id: 1, Name: "Alice", Email: "alice@example.com", Age: 28}
	s.users[2] = &pb.User{Id: 2, Name: "Bob", Email: "bob@example.com", Age: 32}
	s.nextID = 3
	return s
}

// GetUser retrieves a user by ID
func (s *server) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.GetUserResponse, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	user, exists := s.users[req.Id]
	if !exists {
		return &pb.GetUserResponse{Error: fmt.Sprintf("user with id %d not found", req.Id)}, nil
	}

	return &pb.GetUserResponse{User: user}, nil
}

// CreateUser creates a new user
func (s *server) CreateUser(ctx context.Context, req *pb.CreateUserRequest) (*pb.CreateUserResponse, error) {
	if req.Name == "" {
		return &pb.CreateUserResponse{Error: "name is required"}, nil
	}
	if req.Email == "" {
		return &pb.CreateUserResponse{Error: "email is required"}, nil
	}
	if req.Age <= 0 {
		return &pb.CreateUserResponse{Error: "age must be positive"}, nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	user := &pb.User{
		Id:    s.nextID,
		Name:  req.Name,
		Email: req.Email,
		Age:   req.Age,
	}

	s.users[s.nextID] = user
	s.nextID++

	return &pb.CreateUserResponse{Id: user.Id}, nil
}

// ListUsers returns all users with optional filtering
func (s *server) ListUsers(ctx context.Context, req *pb.ListUsersRequest) (*pb.ListUsersResponse, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var users []*pb.User
	for _, user := range s.users {
		// Apply filters
		if req.NameContains != "" {
			// Simple contains check
			found := false
			for i := 0; i <= len(user.Name)-len(req.NameContains); i++ {
				if user.Name[i:i+len(req.NameContains)] == req.NameContains {
					found = true
					break
				}
			}
			if !found {
				continue
			}
		}
		if req.MinAge > 0 && user.Age < req.MinAge {
			continue
		}
		if req.MaxAge > 0 && user.Age > req.MaxAge {
			continue
		}
		users = append(users, user)
	}

	return &pb.ListUsersResponse{Users: users}, nil
}

// UpdateUser updates an existing user
func (s *server) UpdateUser(ctx context.Context, req *pb.UpdateUserRequest) (*pb.UpdateUserResponse, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	user, exists := s.users[req.Id]
	if !exists {
		return &pb.UpdateUserResponse{Error: fmt.Sprintf("user with id %d not found", req.Id)}, nil
	}

	if req.Name != "" {
		user.Name = req.Name
	}
	if req.Email != "" {
		user.Email = req.Email
	}
	if req.Age > 0 {
		user.Age = req.Age
	}

	return &pb.UpdateUserResponse{User: user}, nil
}

// DeleteUser deletes a user
func (s *server) DeleteUser(ctx context.Context, req *pb.DeleteUserRequest) (*pb.DeleteUserResponse, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.users[req.Id]; !exists {
		return &pb.DeleteUserResponse{
			Success: false,
			Message: fmt.Sprintf("user with id %d not found", req.Id),
		}, nil
	}

	delete(s.users, req.Id)
	return &pb.DeleteUserResponse{
		Success: true,
		Message: "user deleted successfully",
	}, nil
}

// StreamUsers streams users to the client (server streaming)
func (s *server) StreamUsers(req *pb.StreamUsersRequest, stream pb.UserService_StreamUsersServer) error {
	s.mu.RLock()
	users := make([]*pb.User, 0, len(s.users))
	for _, user := range s.users {
		users = append(users, user)
	}
	s.mu.RUnlock()

	count := int(req.Count)
	if count <= 0 || count > len(users) {
		count = len(users)
	}

	for i := 0; i < count; i++ {
		if err := stream.Send(users[i]); err != nil {
			return err
		}
		time.Sleep(500 * time.Millisecond) // Simulate delay
	}

	return nil
}

// CreateUsers creates multiple users from client stream (client streaming)
func (s *server) CreateUsers(stream pb.UserService_CreateUsersServer) error {
	var ids []int32
	var count int

	for {
		req, err := stream.Recv()
		if err != nil {
			break
		}

		if req.Name == "" || req.Email == "" || req.Age <= 0 {
			continue
		}

		s.mu.Lock()
		user := &pb.User{
			Id:    s.nextID,
			Name:  req.Name,
			Email: req.Email,
			Age:   req.Age,
		}
		s.users[s.nextID] = user
		ids = append(ids, s.nextID)
		s.nextID++
		s.mu.Unlock()
		count++
	}

	return stream.SendAndClose(&pb.CreateUsersResponse{
		Ids:   ids,
		Count: int32(count),
	})
}

// UserChat implements bidirectional streaming
func (s *server) UserChat(stream pb.UserService_UserChatServer) error {
	for {
		req, err := stream.Recv()
		if err != nil {
			break
		}

		// Echo back with timestamp
		resp := &pb.UserChatResponse{
			Message: fmt.Sprintf("Received from user %d: %s", req.UserId, req.Message),
			Timestamp: time.Now().Unix(),
		}

		if err := stream.Send(resp); err != nil {
			return err
		}
	}

	return nil
}

// Logging interceptor
func loggingInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
	log.Printf("[gRPC] Calling %s", info.FullMethod)
	start := time.Now()

	resp, err := handler(ctx, req)

	log.Printf("[gRPC] %s took %v", info.FullMethod, time.Since(start))

	if err != nil {
		st, _ := status.FromError(err)
		log.Printf("[gRPC] Error: %s", st.Message())
	}

	return resp, err
}

func main() {
	lis, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("Failed to listen: %v", err)
	}

	// Create server with interceptor
	s := grpc.NewServer(
		grpc.ChainUnaryInterceptor(loggingInterceptor),
	)

	pb.RegisterUserServiceServer(s, newServer())

	// Enable reflection for grpcurl debugging
	reflection.Register(s)

	log.Println("gRPC server listening on :50051")

	if err := s.Serve(lis); err != nil {
		log.Fatalf("Failed to serve: %v", err)
	}
}
