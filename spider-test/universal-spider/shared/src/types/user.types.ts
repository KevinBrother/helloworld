// 用户相关类型
export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role?: 'admin' | 'user' | 'viewer';
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  password?: string;
  role?: 'admin' | 'user' | 'viewer';
  isActive?: boolean;
}

export interface QueryUsersRequest {
  page?: number;
  limit?: number;
  username?: string;
  email?: string;
  role?: 'admin' | 'user' | 'viewer';
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

// 认证相关类型
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}