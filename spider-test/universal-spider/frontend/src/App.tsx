import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { store } from './store';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Configs from './pages/Configs';
import Monitoring from './pages/Monitoring';
import Users from './pages/Users';
import { useAuth } from './hooks/useAuth';
import { useAppDispatch } from './hooks/redux';
import { getCurrentUser } from './store/slices/authSlice';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const { token, loading, isAuthenticated, user } = useAuth();

  useEffect(() => {
    // 如果有 token 但未认证且没有用户信息，尝试获取用户信息验证 token
    if (token && !isAuthenticated && !user && !loading) {
      dispatch(getCurrentUser());
    }
    // 如果没有 token 但仍然显示为已认证，清除认证状态
    else if (!token && isAuthenticated) {
      // 这种情况通常不会发生，但为了安全起见
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
  }, [dispatch, token, isAuthenticated, user, loading]);

  // 如果正在验证 token，显示加载状态
  if (token && !isAuthenticated && !user && loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  return <>{children}</>;
}

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider locale={zhCN}>
          <AuthProvider>
            <Router>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Routes>
                          <Route path="/" element={<Navigate to="/dashboard" replace />} />
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/tasks" element={<Tasks />} />
                          <Route path="/configs" element={<Configs />} />
                          <Route path="/monitoring" element={<Monitoring />} />
                          <Route path="/users" element={<Users />} />
                        </Routes>
                      </Layout>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Router>
          </AuthProvider>
        </ConfigProvider>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
