import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { userApi } from '../../services/api';
import type { User, CreateUserRequest, UpdateUserRequest, QueryUsersRequest } from '../../types/api';

interface UserState {
  users: User[];
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  limit: number;
}

const initialState: UserState = {
  users: [],
  currentUser: null,
  loading: false,
  error: null,
  total: 0,
  page: 1,
  limit: 10,
};

// 获取用户列表
export const fetchUsers = createAsyncThunk(
  'user/fetchUsers',
  async (params?: QueryUsersRequest) => {
    const response = await userApi.getUsers(params);
    return response.data;
  }
);

// 获取单个用户
export const fetchUser = createAsyncThunk(
  'user/fetchUser',
  async (id: number) => {
    const response = await userApi.getUser(id);
    return response.data;
  }
);

// 创建用户
export const createUser = createAsyncThunk(
  'user/createUser',
  async (data: CreateUserRequest) => {
    const response = await userApi.createUser(data);
    return response.data;
  }
);

// 更新用户
export const updateUser = createAsyncThunk(
  'user/updateUser',
  async ({ id, data }: { id: number; data: UpdateUserRequest }) => {
    const response = await userApi.updateUser(id, data);
    return response.data;
  }
);

// 删除用户
export const deleteUser = createAsyncThunk(
  'user/deleteUser',
  async (id: number) => {
    await userApi.deleteUser(id);
    return id;
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentUser: (state, action: PayloadAction<User | null>) => {
      state.currentUser = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // 获取用户列表
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取用户列表失败';
      })
      // 获取单个用户
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.currentUser = action.payload;
      })
      // 创建用户
      .addCase(createUser.fulfilled, (state, action) => {
        state.users.unshift(action.payload);
        state.total += 1;
      })
      // 更新用户
      .addCase(updateUser.fulfilled, (state, action) => {
        const index = state.users.findIndex(user => user.id === action.payload.id);
        if (index !== -1) {
          state.users[index] = action.payload;
        }
        if (state.currentUser?.id === action.payload.id) {
          state.currentUser = action.payload;
        }
      })
      // 删除用户
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.users = state.users.filter(user => user.id !== action.payload);
        state.total -= 1;
        if (state.currentUser?.id === action.payload) {
          state.currentUser = null;
        }
      });
  },
});

export const { clearError, setCurrentUser } = userSlice.actions;
export default userSlice.reducer;