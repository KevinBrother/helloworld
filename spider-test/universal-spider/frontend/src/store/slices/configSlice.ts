import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { configApi } from '../../services/api';
import type { CrawlConfig, CreateConfigRequest, UpdateConfigRequest, QueryConfigsRequest } from '../../types/api';

interface ConfigState {
  configs: CrawlConfig[];
  currentConfig: CrawlConfig | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  limit: number;
}

const initialState: ConfigState = {
  configs: [],
  currentConfig: null,
  loading: false,
  error: null,
  total: 0,
  page: 1,
  limit: 10,
};

// 获取配置列表
export const fetchConfigs = createAsyncThunk(
  'config/fetchConfigs',
  async (params?: QueryConfigsRequest) => {
    const response = await configApi.getConfigs(params);
    return response.data;
  }
);

// 获取单个配置
export const fetchConfig = createAsyncThunk(
  'config/fetchConfig',
  async (id: number) => {
    const response = await configApi.getConfig(id);
    return response.data;
  }
);

// 创建配置
export const createConfig = createAsyncThunk(
  'config/createConfig',
  async (data: CreateConfigRequest) => {
    const response = await configApi.createConfig(data);
    return response.data;
  }
);

// 更新配置
export const updateConfig = createAsyncThunk(
  'config/updateConfig',
  async ({ id, data }: { id: number; data: UpdateConfigRequest }) => {
    const response = await configApi.updateConfig(id, data);
    return response.data;
  }
);

// 删除配置
export const deleteConfig = createAsyncThunk(
  'config/deleteConfig',
  async (id: number) => {
    await configApi.deleteConfig(id);
    return id;
  }
);

// 测试配置
export const testConfig = createAsyncThunk(
  'config/testConfig',
  async (data: CreateConfigRequest) => {
    const response = await configApi.testConfig(data);
    return response.data;
  }
);

const configSlice = createSlice({
  name: 'config',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentConfig: (state, action: PayloadAction<CrawlConfig | null>) => {
      state.currentConfig = action.payload;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload;
    },
    setLimit: (state, action: PayloadAction<number>) => {
      state.limit = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // 获取配置列表
      .addCase(fetchConfigs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchConfigs.fulfilled, (state, action) => {
        state.loading = false;
        state.configs = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
      })
      .addCase(fetchConfigs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取配置列表失败';
      })
      // 获取单个配置
      .addCase(fetchConfig.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchConfig.fulfilled, (state, action) => {
        state.loading = false;
        state.currentConfig = action.payload;
      })
      .addCase(fetchConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取配置详情失败';
      })
      // 创建配置
      .addCase(createConfig.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createConfig.fulfilled, (state, action) => {
        state.loading = false;
        state.configs.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '创建配置失败';
      })
      // 更新配置
      .addCase(updateConfig.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateConfig.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.configs.findIndex(config => config.id === action.payload.id);
        if (index !== -1) {
          state.configs[index] = action.payload;
        }
        if (state.currentConfig?.id === action.payload.id) {
          state.currentConfig = action.payload;
        }
      })
      .addCase(updateConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '更新配置失败';
      })
      // 删除配置
      .addCase(deleteConfig.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteConfig.fulfilled, (state, action) => {
        state.loading = false;
        state.configs = state.configs.filter(config => config.id !== action.payload);
        state.total -= 1;
        if (state.currentConfig?.id === action.payload) {
          state.currentConfig = null;
        }
      })
      .addCase(deleteConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '删除配置失败';
      })
      // 测试配置
      .addCase(testConfig.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(testConfig.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(testConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '测试配置失败';
      });
  },
});

export const { clearError, setCurrentConfig, setPage, setLimit } = configSlice.actions;
export default configSlice.reducer;