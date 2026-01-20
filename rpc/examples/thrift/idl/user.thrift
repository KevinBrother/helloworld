namespace go user

// User struct
struct User {
    1: i32 id,
    2: string name,
    3: string email,
    4: i32 age,
}

// Request and response types
struct GetUserRequest {
    1: i32 id,
}

struct GetUserResponse {
    1: User user,
    2: string error,
}

struct CreateUserRequest {
    1: string name,
    2: string email,
    3: i32 age,
}

struct CreateUserResponse {
    1: i32 id,
    2: string error,
}

struct ListUsersRequest {
    // Empty for now, can add filters later
}

struct ListUsersResponse {
    1: list<User> users,
    2: string error,
}

struct UpdateUserRequest {
    1: i32 id,
    2: string name,
    3: string email,
    4: i32 age,
}

struct UpdateUserResponse {
    1: User user,
    2: string error,
}

struct DeleteUserRequest {
    1: i32 id,
}

struct DeleteUserResponse {
    1: bool success,
    2: string message,
}

// Exception for errors
exception UserException {
    1: string message,
    2: i32 code,
}

// UserService interface
service UserService {
    GetUserResponse getUser(1: GetUserRequest req) throws (1: UserException e),
    CreateUserResponse createUser(1: CreateUserRequest req) throws (1: UserException e),
    ListUsersResponse listUsers(1: ListUsersRequest req) throws (1: UserException e),
    UpdateUserResponse updateUser(1: UpdateUserRequest req) throws (1: UserException e),
    DeleteUserResponse deleteUser(1: DeleteUserRequest req) throws (1: UserException e),
}
