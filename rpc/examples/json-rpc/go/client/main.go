package main

import (
	"fmt"
	"log"
	"net"
	"net/rpc"
	"net/rpc/jsonrpc"
	"time"
)

func main() {
	// Connect to the RPC server
	conn, err := net.Dial("tcp", "localhost:1234")
	if err != nil {
		log.Fatal("Failed to connect:", err)
	}
	defer conn.Close()

	// Create JSON-RPC client
	client := rpc.NewClientWithCodec(jsonrpc.NewClientCodec(conn))
	defer client.Close()

	fmt.Println("=== JSON-RPC Client Demo ===\n")

	// 1. Create users
	fmt.Println("1. Creating users...")
	createUserReq := CreateUserRequest{
		Name:  "Alice",
		Email: "alice@example.com",
		Age:   28,
	}
	var createUserReply CreateUserResponse
	err = client.Call("UserService.CreateUser", createUserReq, &createUserReply)
	if err != nil {
		log.Fatal("CreateUser error:", err)
	}
	fmt.Printf("   Created user with ID: %d\n", createUserReply.ID)

	createUserReq2 := CreateUserRequest{
		Name:  "Bob",
		Email: "bob@example.com",
		Age:   32,
	}
	var createUserReply2 CreateUserResponse
	err = client.Call("UserService.CreateUser", createUserReq2, &createUserReply2)
	if err != nil {
		log.Fatal("CreateUser error:", err)
	}
	fmt.Printf("   Created user with ID: %d\n", createUserReply2.ID)

	createUserReq3 := CreateUserRequest{
		Name:  "Charlie",
		Email: "charlie@example.com",
		Age:   24,
	}
	var createUserReply3 CreateUserResponse
	err = client.Call("UserService.CreateUser", createUserReq3, &createUserReply3)
	if err != nil {
		log.Fatal("CreateUser error:", err)
	}
	fmt.Printf("   Created user with ID: %d\n", createUserReply3.ID)

	// 2. Get a specific user
	fmt.Println("\n2. Getting user by ID...")
	var getUserReply GetUserResponse
	err = client.Call("UserService.GetUser", 1, &getUserReply)
	if err != nil {
		log.Fatal("GetUser error:", err)
	}
	if getUserReply.Error != "" {
		fmt.Printf("   Error: %s\n", getUserReply.Error)
	} else {
		fmt.Printf("   User: %+v\n", getUserReply.User)
	}

	// 3. List all users
	fmt.Println("\n3. Listing all users...")
	var listUsersReply ListUsersResponse
	err = client.Call("UserService.ListUsers", 0, &listUsersReply)
	if err != nil {
		log.Fatal("ListUsers error:", err)
	}
	fmt.Printf("   Total users: %d\n", len(listUsersReply.Users))
	for _, u := range listUsersReply.Users {
		fmt.Printf("   - ID: %d, Name: %s, Email: %s, Age: %d\n", u.ID, u.Name, u.Email, u.Age)
	}

	// 4. Update a user
	fmt.Println("\n4. Updating user...")
	updateArgs := struct {
		ID    int
		Name  string
		Email string
		Age   int
	}{
		ID:    1,
		Name:  "Alice Smith",
		Email: "alice.smith@example.com",
		Age:   29,
	}
	var updateReply GetUserResponse
	err = client.Call("UserService.UpdateUser", updateArgs, &updateReply)
	if err != nil {
		log.Fatal("UpdateUser error:", err)
	}
	if updateReply.Error != "" {
		fmt.Printf("   Error: %s\n", updateReply.Error)
	} else {
		fmt.Printf("   Updated user: %+v\n", updateReply.User)
	}

	// 5. Delete a user
	fmt.Println("\n5. Deleting user...")
	var deleteReply string
	err = client.Call("UserService.DeleteUser", 3, &deleteReply)
	if err != nil {
		log.Fatal("DeleteUser error:", err)
	}
	fmt.Printf("   %s\n", deleteReply)

	// 6. List users again to verify deletion
	fmt.Println("\n6. Listing users after deletion...")
	var listUsersReply2 ListUsersResponse
	err = client.Call("UserService.ListUsers", 0, &listUsersReply2)
	if err != nil {
		log.Fatal("ListUsers error:", err)
	}
	fmt.Printf("   Total users: %d\n", len(listUsersReply2.Users))

	// 7. Test error handling - get non-existent user
	fmt.Println("\n7. Testing error handling...")
	var errorReply GetUserResponse
	err = client.Call("UserService.GetUser", 999, &errorReply)
	if err != nil {
		log.Fatal("GetUser error:", err)
	}
	if errorReply.Error != "" {
		fmt.Printf("   Expected error: %s\n", errorReply.Error)
	}

	// 8. Test validation error
	fmt.Println("\n8. Testing validation...")
	var validationReply CreateUserResponse
	validationReq := CreateUserRequest{
		Name: "", // Empty name should fail
	}
	err = client.Call("UserService.CreateUser", validationReq, &validationReply)
	if err != nil {
		log.Fatal("CreateUser error:", err)
	}
	if validationReply.Error != "" {
		fmt.Printf("   Validation error: %s\n", validationReply.Error)
	}

	fmt.Println("\n=== Demo completed successfully ===")

	// Small delay to ensure all messages are sent
	time.Sleep(100 * time.Millisecond)
}
