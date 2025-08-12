import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { taskApi } from '../../services/api';
import type { Task, CreateTaskRequest, UpdateTaskRequest, QueryTasksRequest } from '../../types/api';

interface TaskState {
  tasks: Task[];
  currentTask: Task | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  limit: number;
}

const initialState: TaskState = {
  tasks: [],
  currentTask: null,
  loading: false,
  error: null,
  total: 0,
  page: 1,
  limit: 10,
};

// 获取任务列表
export const fetchTasks = createAsyncThunk(
  'task/fetchTasks',
  async (params?: QueryTasksRequest) => {
    const response = await taskApi.getTasks(params);
    return response.data;
  }
);

// 获取单个任务
export const fetchTask = createAsyncThunk(
  'task/fetchTask',
  async (id: number) => {
    const response = await taskApi.getTask(id);
    return response.data;
  }
);

// 创建任务
export const createTask = createAsyncThunk(
  'task/createTask',
  async (data: CreateTaskRequest) => {
    const response = await taskApi.createTask(data);
    return response.data;
  }
);

// 更新任务
export const updateTask = createAsyncThunk(
  'task/updateTask',
  async ({ id, data }: { id: number; data: UpdateTaskRequest }) => {
    const response = await taskApi.updateTask(id, data);
    return response.data;
  }
);

// 删除任务
export const deleteTask = createAsyncThunk(
  'task/deleteTask',
  async (id: number) => {
    await taskApi.deleteTask(id);
    return id;
  }
);

// 启动任务
export const startTask = createAsyncThunk(
  'task/startTask',
  async (id: number) => {
    const response = await taskApi.startTask(id);
    return response.data;
  }
);

// 停止任务
export const stopTask = createAsyncThunk(
  'task/stopTask',
  async (id: number) => {
    const response = await taskApi.stopTask(id);
    return response.data;
  }
);

const taskSlice = createSlice({
  name: 'task',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentTask: (state, action: PayloadAction<Task | null>) => {
      state.currentTask = action.payload;
    },
    updateTaskInList: (state, action: PayloadAction<Task>) => {
      const index = state.tasks.findIndex(task => task.id === action.payload.id);
      if (index !== -1) {
        state.tasks[index] = action.payload;
      }
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload;
    },
    setLimit: (state, action: PayloadAction<number>) => {
      state.limit = action.payload;
    },
    updateTaskStatus: (state, action: PayloadAction<{ id: number; status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' }>) => {
      const { id, status } = action.payload;
      const task = state.tasks.find(t => t.id === id);
      if (task) {
        task.status = status;
      }
      if (state.currentTask?.id === id) {
        state.currentTask.status = status;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // 获取任务列表
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取任务列表失败';
      })
      // 获取单个任务
      .addCase(fetchTask.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTask.fulfilled, (state, action) => {
        state.loading = false;
        state.currentTask = action.payload;
      })
      .addCase(fetchTask.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取任务详情失败';
      })
      // 创建任务
      .addCase(createTask.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createTask.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '创建任务失败';
      })
      // 更新任务
      .addCase(updateTask.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.tasks.findIndex(task => task.id === action.payload.id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }
        if (state.currentTask?.id === action.payload.id) {
          state.currentTask = action.payload;
        }
      })
      .addCase(updateTask.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '更新任务失败';
      })
      // 删除任务
      .addCase(deleteTask.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks = state.tasks.filter(task => task.id !== action.payload);
        state.total -= 1;
        if (state.currentTask?.id === action.payload) {
          state.currentTask = null;
        }
      })
      .addCase(deleteTask.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '删除任务失败';
      })
      // 启动任务
      .addCase(startTask.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(startTask.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.tasks.findIndex(task => task.id === action.payload.id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }
        if (state.currentTask?.id === action.payload.id) {
          state.currentTask = action.payload;
        }
      })
      .addCase(startTask.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '启动任务失败';
      })
      // 停止任务
      .addCase(stopTask.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(stopTask.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.tasks.findIndex(task => task.id === action.payload.id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }
        if (state.currentTask?.id === action.payload.id) {
          state.currentTask = action.payload;
        }
      })
      .addCase(stopTask.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '停止任务失败';
      });
  },
});

export const { clearError, setCurrentTask, updateTaskInList, setPage, setLimit, updateTaskStatus } = taskSlice.actions;
export default taskSlice.reducer;