package main

import (
	"context"
	"fmt"
	"io"
	"log"
	"time"

	pb "github.com/example/grpc/proto"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

func main() {
	// Connect to the server
	conn, err := grpc.Dial("localhost:50051", grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}
	defer conn.Close()

	client := pb.NewUserServiceClient(conn)

	fmt.Println("=== gRPC Client Demo ===\n")

	// 1. List initial users
	fmt.Println("1. Listing initial users...")
	listResp, err := client.ListUsers(context.Background(), &pb.ListUsersRequest{})
	if err != nil {
		log.Fatalf("ListUsers failed: %v", err)
	}
	fmt.Printf("   Total users: %d\n", len(listResp.Users))
	for _, u := range listResp.Users {
		fmt.Printf("   - ID: %d, Name: %s, Email: %s, Age: %d\n", u.Id, u.Name, u.Email, u.Age)
	}

	// 2. Get a specific user
	fmt.Println("\n2. Getting user by ID...")
	getResp, err := client.GetUser(context.Background(), &pb.GetUserRequest{Id: 1})
	if err != nil {
		log.Fatalf("GetUser failed: %v", err)
	}
	if getResp.Error != "" {
		fmt.Printf("   Error: %s\n", getResp.Error)
	} else {
		fmt.Printf("   User: %+v\n", getResp.User)
	}

	// 3. Create a new user
	fmt.Println("\n3. Creating new user...")
	createResp, err := client.CreateUser(context.Background(), &pb.CreateUserRequest{
		Name:  "Charlie",
		Email: "charlie@example.com",
		Age:   24,
	})
	if err != nil {
		log.Fatalf("CreateUser failed: %v", err)
	}
	fmt.Printf("   Created user with ID: %d\n", createResp.Id)

	// 4. List with filter
	fmt.Println("\n4. Listing users with name filter...")
	filterResp, err := client.ListUsers(context.Background(), &pb.ListUsersRequest{
		NameContains: "a",
	})
	if err != nil {
		log.Fatalf("ListUsers failed: %v", err)
	}
	fmt.Printf("   Users containing 'a': %d\n", len(filterResp.Users))

	// 5. Update user
	fmt.Println("\n5. Updating user...")
	updateResp, err := client.UpdateUser(context.Background(), &pb.UpdateUserRequest{
		Id:    1,
		Name:  "Alice Smith",
		Email: "alice.smith@example.com",
		Age:   29,
	})
	if err != nil {
		log.Fatalf("UpdateUser failed: %v", err)
	}
	fmt.Printf("   Updated user: %+v\n", updateResp.User)

	// 6. Delete user
	fmt.Println("\n6. Deleting user...")
	deleteResp, err := client.DeleteUser(context.Background(), &pb.DeleteUserRequest{Id: 3})
	if err != nil {
		log.Fatalf("DeleteUser failed: %v", err)
	}
	fmt.Printf("   Success: %v, Message: %s\n", deleteResp.Success, deleteResp.Message)

	// 7. Server streaming - StreamUsers
	fmt.Println("\n7. Server streaming - StreamUsers...")
	stream, err := client.StreamUsers(context.Background(), &pb.StreamUsersRequest{Count: 3})
	if err != nil {
		log.Fatalf("StreamUsers failed: %v", err)
	}
	for {
		user, err := stream.Recv()
		if err == io.EOF {
			break
		}
		if err != nil {
			log.Printf("StreamUsers recv error: %v", err)
			break
		}
		fmt.Printf("   Streamed: ID=%d, Name=%s\n", user.Id, user.Name)
	}

	// 8. Client streaming - CreateUsers
	fmt.Println("\n8. Client streaming - CreateUsers...")
	createStream, err := client.CreateUsers(context.Background())
	if err != nil {
		log.Fatalf("CreateUsers stream failed: %v", err)
	}

	usersToCreate := []*pb.CreateUserRequest{
		{Name: "Diana", Email: "diana@example.com", Age: 27},
		{Name: "Eve", Email: "eve@example.com", Age: 25},
		{Name: "Frank", Email: "frank@example.com", Age: 30},
	}

	for _, u := range usersToCreate {
		if err := createStream.Send(u); err != nil {
			log.Printf("CreateUsers send error: %v", err)
		}
		fmt.Printf("   Sent: %s\n", u.Name)
	}

	createUsersResp, err := createStream.CloseAndRecv()
	if err != nil {
		log.Fatalf("CreateUsers CloseAndRecv failed: %v", err)
	}
	fmt.Printf("   Created %d users with IDs: %v\n", createUsersResp.Count, createUsersResp.Ids)

	// 9. Bidirectional streaming - UserChat
	fmt.Println("\n9. Bidirectional streaming - UserChat...")
	chatStream, err := client.UserChat(context.Background())
	if err != nil {
		log.Fatalf("UserChat failed: %v", err)
	}

	// Send messages in a goroutine
	go func() {
		messages := []string{"Hello!", "How are you?", "Goodbye!"}
		for _, msg := range messages {
			if err := chatStream.Send(&pb.UserChatRequest{
				Message: msg,
				UserId:  1,
			}); err != nil {
				log.Printf("UserChat send error: %v", err)
				return
			}
			time.Sleep(300 * time.Millisecond)
		}
		chatStream.CloseSend()
	}()

	// Receive responses
	for i := 0; i < 3; i++ {
		resp, err := chatStream.Recv()
		if err == io.EOF {
			break
		}
		if err != nil {
			log.Printf("UserChat recv error: %v", err)
			break
		}
		fmt.Printf("   Received: %s (timestamp: %d)\n", resp.Message, resp.Timestamp)
	}

	fmt.Println("\n=== Demo completed successfully ===")
}
