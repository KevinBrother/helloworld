import React, { useState } from 'react';
import { Row, Col, Card, Statistic, Progress, Table, Tag, Button } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { taskApi, monitoringApi } from '../../services/api';

const Dashboard: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  // 获取任务统计
  const { data: taskStats, isLoading: taskStatsLoading } = useQuery({
    queryKey: ['taskStats', refreshKey],
    queryFn: () => monitoringApi.getTaskStats(),
    refetchInterval: 30000, // 30秒刷新一次
  });

  // 获取系统统计
  const { data: systemStats, isLoading: systemStatsLoading } = useQuery({
    queryKey: ['systemStats', refreshKey],
    queryFn: () => monitoringApi.getSystemStats(),
    refetchInterval: 10000, // 10秒刷新一次
  });

  // 获取最近任务
  const { data: recentTasks, isLoading: recentTasksLoading } = useQuery({
    queryKey: ['recentTasks', refreshKey],
    queryFn: () => taskApi.getTasks({ limit: 10, sortBy: 'updatedAt', sortOrder: 'DESC' }),
    refetchInterval: 30000,
  });

  // 获取性能指标
  const { data: performanceData } = useQuery({
    queryKey: ['performanceMetrics', refreshKey],
    queryFn: () => monitoringApi.getPerformanceMetrics({ hours: 24 }),
    refetchInterval: 60000, // 1分钟刷新一次
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'processing';
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'cancelled':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <PlayCircleOutlined />;
      case 'completed':
        return <CheckCircleOutlined />;
      case 'failed':
        return <ExclamationCircleOutlined />;
      case 'cancelled':
        return <PauseCircleOutlined />;
      default:
        return <ClockCircleOutlined />;
    }
  };

  const taskColumns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
          {status === 'pending' && '等待中'}
          {status === 'running' && '运行中'}
          {status === 'completed' && '已完成'}
          {status === 'failed' && '失败'}
          {status === 'cancelled' && '已取消'}
        </Tag>
      ),
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      render: (progress: number) => (
        <Progress percent={progress} size="small" />
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (date: string) => new Date(date).toLocaleString(),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>仪表板</h1>
        <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
          刷新
        </Button>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={taskStatsLoading}>
            <Statistic
              title="总任务数"
              value={taskStats?.data?.total || 0}
              prefix={<UnorderedListOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={taskStatsLoading}>
            <Statistic
              title="运行中"
              value={taskStats?.data?.running || 0}
              valueStyle={{ color: '#1890ff' }}
              prefix={<PlayCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={taskStatsLoading}>
            <Statistic
              title="已完成"
              value={taskStats?.data?.completed || 0}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={taskStatsLoading}>
            <Statistic
              title="失败"
              value={taskStats?.data?.failed || 0}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 系统资源 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={8}>
          <Card title="CPU 使用率" loading={systemStatsLoading}>
            <Progress
              type="circle"
              percent={Math.round((systemStats?.data?.cpu?.usage || 0) * 100)}
              format={(percent) => `${percent}%`}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="内存使用率" loading={systemStatsLoading}>
            <Progress
              type="circle"
              percent={Math.round((systemStats?.data?.memory?.usage || 0) * 100)}
              format={(percent) => `${percent}%`}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="磁盘使用率" loading={systemStatsLoading}>
            <Progress
              type="circle"
              percent={Math.round((systemStats?.data?.disk?.usage || 0) * 100)}
              format={(percent) => `${percent}%`}
            />
          </Card>
        </Col>
      </Row>

      {/* 性能图表和最近任务 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title="性能趋势">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData?.data || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="responseTime"
                  stroke="#1890ff"
                  name="响应时间(ms)"
                />
                <Line
                  type="monotone"
                  dataKey="throughput"
                  stroke="#52c41a"
                  name="吞吐量"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="最近任务">
            <Table
              dataSource={recentTasks?.data?.data || []}
              columns={taskColumns}
              loading={recentTasksLoading}
              pagination={false}
              size="small"
              rowKey="id"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;