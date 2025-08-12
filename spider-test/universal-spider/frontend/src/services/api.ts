import axios from 'axios';
import type {
  LoginRequest,
  RegisterRequest,
  QueryUsersRequest,
  CreateUserRequest,
  UpdateUserRequest,
  QueryTasksRequest,
  CreateTaskRequest,
  UpdateTaskRequest,
  QueryConfigsRequest,
  CreateConfigRequest,
  UpdateConfigRequest,
} from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// 创建 axios 实例
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加认证 token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 认证相关 API
export const authApi = {
  login: (data: LoginRequest) => apiClient.post('/auth/login', data),
  logout: () => apiClient.post('/auth/logout'),
  getCurrentUser: () => apiClient.get('/auth/profile'),
  register: (data: RegisterRequest) => apiClient.post('/auth/register', data),
};

// 用户管理 API
export const userApi = {
  getUsers: (params?: QueryUsersRequest) => apiClient.get('/users', { params }),
  getUser: (id: number) => apiClient.get(`/users/${id}`),
  createUser: (data: CreateUserRequest) => apiClient.post('/users', data),
  updateUser: (id: number, data: UpdateUserRequest) => apiClient.patch(`/users/${id}`, data),
  deleteUser: (id: number) => apiClient.delete(`/users/${id}`),
};

// 任务管理 API
export const taskApi = {
  getTasks: (params?: QueryTasksRequest) => apiClient.get('/tasks', { params }),
  getTask: (id: number) => apiClient.get(`/tasks/${id}`),
  createTask: (data: CreateTaskRequest) => apiClient.post('/tasks', data),
  updateTask: (id: number, data: UpdateTaskRequest) => apiClient.patch(`/tasks/${id}`, data),
  deleteTask: (id: number) => apiClient.delete(`/tasks/${id}`),
  startTask: (id: number) => apiClient.post(`/tasks/${id}/start`),
  stopTask: (id: number) => apiClient.post(`/tasks/${id}/stop`),
  getTaskLogs: (id: number, params?: Record<string, unknown>) => apiClient.get(`/tasks/${id}/logs`, { params }),
};

// 配置管理 API
export const configApi = {
  getConfigs: (params?: QueryConfigsRequest) => apiClient.get('/crawl-configs', { params }),
  getConfig: (id: number) => apiClient.get(`/crawl-configs/${id}`),
  createConfig: (data: CreateConfigRequest) => apiClient.post('/crawl-configs', data),
  updateConfig: (id: number, data: UpdateConfigRequest) => apiClient.patch(`/crawl-configs/${id}`, data),
  deleteConfig: (id: number) => apiClient.delete(`/crawl-configs/${id}`),
  testConfig: (data: CreateConfigRequest) => apiClient.post('/crawl-configs/test', data),
};

// 监控相关 API
export const monitoringApi = {
  getSystemStats: () => apiClient.get('/monitoring/system'),
  getTaskStats: () => apiClient.get('/monitoring/tasks'),
  getPerformanceMetrics: (params?: Record<string, unknown>) => apiClient.get('/monitoring/performance', { params }),
};

export default apiClient;