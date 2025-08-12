import React, { useState } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Card,
  Row,
  Col,
  Switch,
  InputNumber,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExperimentOutlined,
  ReloadOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { configApi } from '../../services/api';
import type { CrawlConfig, UpdateConfigRequest, CreateConfigRequest } from '../../types/api';

const { Option } = Select;
const { TextArea } = Input;

const Configs: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<CrawlConfig | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // 获取配置列表
  const { data: configsData, isLoading } = useQuery({
    queryKey: ['configs'],
    queryFn: () => configApi.getConfigs({}),
  });

  // 创建配置
  const createConfigMutation = useMutation({
    mutationFn: configApi.createConfig,
    onSuccess: () => {
      message.success('配置创建成功');
      setIsModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['configs'] });
    },
    onError: (error: Error) => {
      message.error(`创建失败: ${error.message}`);
    },
  });

  // 更新配置
  const updateConfigMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateConfigRequest }) =>
      configApi.updateConfig(id, data),
    onSuccess: () => {
      message.success('配置更新成功');
      setIsModalVisible(false);
      setEditingConfig(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['configs'] });
    },
    onError: (error: Error) => {
      message.error(`更新失败: ${error.message}`);
    },
  });

  // 删除配置
  const deleteConfigMutation = useMutation({
    mutationFn: configApi.deleteConfig,
    onSuccess: () => {
      message.success('配置删除成功');
      queryClient.invalidateQueries({ queryKey: ['configs'] });
    },
    onError: (error: Error) => {
      message.error(`删除失败: ${error.message}`);
    },
  });

  // 测试配置
  const testConfigMutation = useMutation({
    mutationFn: (config: CrawlConfig) => configApi.testConfig({
      name: config.name,
      startUrl: config.startUrl,
      allowedDomains: config.allowedDomains,
      deniedDomains: config.deniedDomains,
      urlPatterns: config.urlPatterns,
      maxDepth: config.maxDepth,
      maxPages: config.maxPages,
      requestDelay: config.requestDelay,
      timeout: config.timeout,
      retries: config.retries,
      method: config.method,
      headers: config.headers,
      cookies: config.cookies,
      userAgent: config.userAgent,
      useProxy: config.useProxy,
      proxyConfig: config.proxyConfig,
      enableJavaScript: config.enableJavaScript,
    }),
    onSuccess: () => {
      message.success('配置测试成功');
    },
    onError: (error: Error) => {
      message.error(`测试失败: ${error.message}`);
    },
  });

  const handleCreate = () => {
    setEditingConfig(null);
    form.resetFields();
    // 设置默认值
    form.setFieldsValue({
      method: 'GET',
      maxDepth: 3,
      maxPages: 100,
      requestDelay: 1000,
      timeout: 30000,
      retries: 3,
      useProxy: false,
      enableJavaScript: false,
    });
    setIsModalVisible(true);
  };

  const handleEdit = (config: CrawlConfig) => {
    setEditingConfig(config);
    form.setFieldsValue({
      name: config.name,
      description: config.description,
      startUrl: config.startUrl,
      allowedDomains: config.allowedDomains?.join('\n'),
      deniedDomains: config.deniedDomains?.join('\n'),
      urlPatterns: config.urlPatterns?.join('\n'),
      maxDepth: config.maxDepth,
      maxPages: config.maxPages,
      requestDelay: config.requestDelay,
      timeout: config.timeout,
      retries: config.retries,
      method: config.method,
      userAgent: config.userAgent,
      useProxy: config.useProxy,
      enableJavaScript: config.enableJavaScript,
    });
    setIsModalVisible(true);
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    // 处理数组字段
    const processedValues = {
      ...values,
      allowedDomains: values.allowedDomains && typeof values.allowedDomains === 'string'
        ? values.allowedDomains.split('\n').filter((d: string) => d.trim())
        : undefined,
      deniedDomains: values.deniedDomains && typeof values.deniedDomains === 'string'
        ? values.deniedDomains.split('\n').filter((d: string) => d.trim())
        : undefined,
      urlPatterns: values.urlPatterns && typeof values.urlPatterns === 'string'
        ? values.urlPatterns.split('\n').filter((p: string) => p.trim())
        : undefined,
    };

    if (editingConfig) {
      updateConfigMutation.mutate({
        id: editingConfig.id,
        data: processedValues,
      });
    } else {
      createConfigMutation.mutate(processedValues as CreateConfigRequest);
    }
  };

  const handleDelete = (id: number) => {
    deleteConfigMutation.mutate(id);
  };

  const handleTest = (config: CrawlConfig) => {
    testConfigMutation.mutate(config);
  };

  const columns = [
    {
      title: '配置名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '起始URL',
      dataIndex: 'startUrl',
      key: 'startUrl',
      ellipsis: true,
      render: (url: string) => (
        <Tooltip title={url}>
          <a href={url} target="_blank" rel="noopener noreferrer">
            {url}
          </a>
        </Tooltip>
      ),
    },
    {
      title: '请求方法',
      dataIndex: 'method',
      key: 'method',
      render: (method: string) => (
        <Tag color={method === 'GET' ? 'green' : 'blue'}>{method}</Tag>
      ),
    },
    {
      title: '最大深度',
      dataIndex: 'maxDepth',
      key: 'maxDepth',
    },
    {
      title: '最大页面数',
      dataIndex: 'maxPages',
      key: 'maxPages',
    },
    {
      title: 'JavaScript',
      dataIndex: 'enableJavaScript',
      key: 'enableJavaScript',
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'green' : 'default'}>
          {enabled ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: CrawlConfig) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => {
                // TODO: 实现查看详情功能
                message.info('查看详情功能待实现');
              }}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="测试配置">
            <Button
              type="text"
              icon={<ExperimentOutlined />}
              size="small"
              onClick={() => handleTest(record)}
              loading={testConfigMutation.isPending}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这个配置吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button
                type="text"
                icon={<DeleteOutlined />}
                size="small"
                danger
                loading={deleteConfigMutation.isPending}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const configs = configsData?.data?.data || [];

  return (
    <div>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h1 style={{ margin: 0 }}>爬虫配置</h1>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => queryClient.invalidateQueries({ queryKey: ['configs'] })}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
            >
              创建配置
            </Button>
          </Space>
        </div>

        <Table
          dataSource={configs}
          columns={columns}
          loading={isLoading}
          rowKey="id"
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>

      <Modal
        title={editingConfig ? '编辑配置' : '创建配置'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingConfig(null);
          form.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="配置名称"
                rules={[{ required: true, message: '请输入配置名称' }]}
              >
                <Input placeholder="请输入配置名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="startUrl"
                label="起始URL"
                rules={[
                  { required: true, message: '请输入起始URL' },
                  { type: 'url', message: '请输入有效的URL' },
                ]}
              >
                <Input placeholder="https://example.com" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="配置描述"
          >
            <TextArea
              rows={2}
              placeholder="请输入配置描述"
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="method"
                label="请求方法"
              >
                <Select>
                  <Option value="GET">GET</Option>
                  <Option value="POST">POST</Option>
                  <Option value="PUT">PUT</Option>
                  <Option value="DELETE">DELETE</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="maxDepth"
                label="最大深度"
              >
                <InputNumber min={1} max={10} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="maxPages"
                label="最大页面数"
              >
                <InputNumber min={1} max={10000} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="requestDelay"
                label="请求延迟(ms)"
              >
                <InputNumber min={0} max={10000} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="timeout"
                label="超时时间(ms)"
              >
                <InputNumber min={1000} max={300000} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="retries"
                label="重试次数"
              >
                <InputNumber min={0} max={10} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="allowedDomains"
                label="允许的域名"
                tooltip="每行一个域名"
              >
                <TextArea
                  rows={3}
                  placeholder="example.com\nsubdomain.example.com"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="deniedDomains"
                label="禁止的域名"
                tooltip="每行一个域名"
              >
                <TextArea
                  rows={3}
                  placeholder="ads.example.com\ntracker.example.com"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="urlPatterns"
            label="URL模式"
            tooltip="每行一个正则表达式模式"
          >
            <TextArea
              rows={2}
              placeholder="/product/\d+\n/category/.*"
            />
          </Form.Item>

          <Form.Item
            name="userAgent"
            label="User Agent"
          >
            <Input placeholder="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="useProxy"
                label="使用代理"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="enableJavaScript"
                label="启用JavaScript"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button
                onClick={() => {
                  setIsModalVisible(false);
                  setEditingConfig(null);
                  form.resetFields();
                }}
              >
                取消
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createConfigMutation.isPending || updateConfigMutation.isPending}
              >
                {editingConfig ? '更新' : '创建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Configs;