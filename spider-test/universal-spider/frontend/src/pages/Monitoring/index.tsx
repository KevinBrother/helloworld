import React, { useState } from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Progress,
  Table,
  Tag,
  Button,
  Select,
  Space,
} from 'antd';
import {
  ReloadOutlined,
  DownloadOutlined,
  BarChartOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { monitoringApi, taskApi } from '../../services/api';

const { Option } = Select;

const Monitoring: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [timeRange, setTimeRange] = useState('24h');
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line');

  // 获取系统统计
  const { data: systemStats, isLoading: systemStatsLoading } = useQuery({
    queryKey: ['systemStats', refreshKey],
    queryFn: () => monitoringApi.getSystemStats(),
    refetchInterval: 10000, // 10秒刷新一次
  });

  // 获取任务统计
  const { data: taskStats, isLoading: taskStatsLoading } = useQuery({
    queryKey: ['taskStats', refreshKey],
    queryFn: () => monitoringApi.getTaskStats(),
    refetchInterval: 30000, // 30秒刷新一次
  });

  // 获取性能指标
  const { data: performanceData, isLoading: performanceLoading } = useQuery({
    queryKey: ['performanceMetrics', timeRange, refreshKey],
    queryFn: () => {
      const hours = timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : timeRange === '24h' ? 24 : 168;
      return monitoringApi.getPerformanceMetrics({ hours });
    },
    refetchInterval: 60000, // 1分钟刷新一次
  });

  // 获取运行中的任务
  const { data: runningTasks, isLoading: runningTasksLoading } = useQuery({
    queryKey: ['runningTasks', refreshKey],
    queryFn: () => taskApi.getTasks({ status: 'running', limit: 20 }),
    refetchInterval: 5000, // 5秒刷新一次
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleExport = () => {
    // TODO: 实现数据导出功能
    console.log('导出监控数据');
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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '等待中';
      case 'running':
        return '运行中';
      case 'completed':
        return '已完成';
      case 'failed':
        return '失败';
      case 'cancelled':
        return '已取消';
      default:
        return status;
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
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
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
      title: '已爬取页面',
      dataIndex: 'pagesCrawled',
      key: 'pagesCrawled',
    },
    {
      title: '总页面数',
      dataIndex: 'pagesTotal',
      key: 'pagesTotal',
    },
    {
      title: '错误数',
      dataIndex: 'errorCount',
      key: 'errorCount',
      render: (count: number) => (
        <span style={{ color: count > 0 ? '#ff4d4f' : '#52c41a' }}>
          {count}
        </span>
      ),
    },
    {
      title: '开始时间',
      dataIndex: 'startedAt',
      key: 'startedAt',
      render: (date: string) => date ? new Date(date).toLocaleString() : '-',
    },
  ];

  const renderChart = () => {
    const data = performanceData?.data?.data || [];
    
    const chartProps = {
      width: '100%',
      height: 300,
    };

    switch (chartType) {
      case 'area':
        return (
          <ResponsiveContainer {...chartProps}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="responseTime"
                stroke="#1890ff"
                fill="#1890ff"
                fillOpacity={0.3}
                name="响应时间(ms)"
              />
              <Area
                type="monotone"
                dataKey="throughput"
                stroke="#52c41a"
                fill="#52c41a"
                fillOpacity={0.3}
                name="吞吐量"
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'bar':
        return (
          <ResponsiveContainer {...chartProps}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="responseTime" fill="#1890ff" name="响应时间(ms)" />
              <Bar dataKey="throughput" fill="#52c41a" name="吞吐量" />
            </BarChart>
          </ResponsiveContainer>
        );
      default:
        return (
          <ResponsiveContainer {...chartProps}>
            <LineChart data={data}>
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
        );
    }
  };

  // 任务状态分布数据
  const taskStatusData = [
    { name: '运行中', value: taskStats?.data?.data?.running || 0, color: '#1890ff' },
    { name: '已完成', value: taskStats?.data?.data?.completed || 0, color: '#52c41a' },
    { name: '失败', value: taskStats?.data?.data?.failed || 0, color: '#ff4d4f' },
    { name: '等待中', value: taskStats?.data?.data?.pending || 0, color: '#faad14' },
    { name: '已取消', value: taskStats?.data?.data?.cancelled || 0, color: '#d9d9d9' },
  ];

  const runningTasksData = runningTasks?.data?.data || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>系统监控</h1>
        <Space>
          <Select
            value={timeRange}
            onChange={setTimeRange}
            style={{ width: 120 }}
          >
            <Option value="1h">最近1小时</Option>
            <Option value="6h">最近6小时</Option>
            <Option value="24h">最近24小时</Option>
            <Option value="7d">最近7天</Option>
          </Select>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            导出数据
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
            刷新
          </Button>
        </Space>
      </div>

      {/* 系统资源监控 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={8}>
          <Card title="CPU 使用率" loading={systemStatsLoading}>
            <Progress
              type="circle"
              percent={Math.round((systemStats?.data?.data?.cpu?.usage || 0) * 100)}
              format={(percent) => `${percent}%`}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Statistic
                title="CPU 核心数"
                value={systemStats?.data?.data?.cpu?.cores || 0}
                suffix="核"
              />
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="内存使用率" loading={systemStatsLoading}>
            <Progress
              type="circle"
              percent={Math.round((systemStats?.data?.data?.memory?.usage || 0) * 100)}
              format={(percent) => `${percent}%`}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Statistic
                title="已用内存"
                value={(systemStats?.data?.data?.memory?.used || 0) / 1024 / 1024 / 1024}
                suffix="GB"
                precision={2}
              />
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="磁盘使用率" loading={systemStatsLoading}>
            <Progress
              type="circle"
              percent={Math.round((systemStats?.data?.data?.disk?.usage || 0) * 100)}
              format={(percent) => `${percent}%`}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Statistic
                title="已用磁盘"
                value={(systemStats?.data?.data?.disk?.used || 0) / 1024 / 1024 / 1024}
                suffix="GB"
                precision={2}
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* 任务统计和性能图表 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={8}>
          <Card title="任务状态分布" loading={taskStatsLoading}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={taskStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {taskStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Statistic
                title="总任务数"
                value={taskStats?.data?.data?.total || 0}
              />
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <Card
            title="性能趋势"
            loading={performanceLoading}
            extra={
              <Space>
                <Select
                  value={chartType}
                  onChange={setChartType}
                  style={{ width: 100 }}
                >
                  <Option value="line">
                    <LineChartOutlined /> 线图
                  </Option>
                  <Option value="area">
                    <BarChartOutlined /> 面积图
                  </Option>
                  <Option value="bar">
                    <BarChartOutlined /> 柱状图
                  </Option>
                </Select>
              </Space>
            }
          >
            {renderChart()}
          </Card>
        </Col>
      </Row>

      {/* 运行中的任务 */}
      <Card title="运行中的任务" loading={runningTasksLoading}>
        <Table
          dataSource={runningTasksData}
          columns={taskColumns}
          pagination={false}
          size="small"
          rowKey="id"
          scroll={{ x: 800 }}
        />
      </Card>
    </div>
  );
};

export default Monitoring;