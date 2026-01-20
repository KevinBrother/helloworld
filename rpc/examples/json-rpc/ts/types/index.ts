/**
 * User type definition
 */
export interface User {
  id: number;
  name: string;
  email: string;
  age: number;
}

/**
 * Create user request
 */
export interface CreateUserRequest {
  name: string;
  email: string;
  age: number;
}

/**
 * JSON-RPC 2.0 Request
 */
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params: unknown;
  id: number | string;
}

/**
 * JSON-RPC 2.0 Response
 */
export interface JsonRpcResponse<T = unknown> {
  jsonrpc: '2.0';
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
  id: number | string;
}

/**
 * Service method definitions
 */
export interface UserService {
  getUser(id: number): Promise<User>;
  create(user: CreateUserRequest): Promise<number>;
  list(): Promise<User[]>;
  update(id: number, user: Partial<CreateUserRequest>): Promise<User>;
  delete(id: number): Promise<string>;
}
