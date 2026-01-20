package main

import (
	"fmt"
	"log"
	"net"
	"net/rpc"
	"net/rpc/jsonrpc"
)

func main() {
	// Create a new UserService
	userService := NewUserService()

	// Register the service with RPC
	err := rpc.Register(userService)
	if err != nil {
		log.Fatal("Failed to register UserService:", err)
	}

	// Start TCP listener
	listener, err := net.Listen("tcp", ":1234")
	if err != nil {
		log.Fatal("Failed to listen:", err)
	}

	log.Println("JSON-RPC server listening on :1234")

	// Accept connections
	for {
		conn, err := listener.Accept()
		if err != nil {
			log.Println("Accept error:", err)
			continue
		}

		log.Printf("New connection from %s", conn.RemoteAddr())

		// Serve JSON-RPC on this connection
		go rpc.ServeCodec(jsonrpc.NewServerCodec(conn))
	}
}
