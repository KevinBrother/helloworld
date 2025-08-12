import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Switch,
  Select,
  InputNumber,
  Divider,
  message,
  Space,
  Row,
  Col,
  Typography,
  Alert,
  Tabs,
  Upload,
  Avatar,
} from 'antd';
import type { UploadChangeParam } from 'antd/es/upload';
import {
  SaveOutlined,
  ReloadOutlined,
  UserOutlined,
  UploadOutlined,
  SettingOutlined,
  SecurityScanOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { userApi } from '../../services/api';
import type { UpdateUserRequest } from '../../types/api';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

interface SystemSettings {
  maxConcurrentTasks: number;
  defaultTimeout: number;
  enableNotifications: boolean;
  logLevel: string;
  autoCleanupDays: number;
  enableMetrics: boolean;
  enableCache: boolean;
  cacheExpiration: number;
}

const Settings: React.FC = () => {
  const [profileForm] = Form.useForm();
  const [systemForm] = Form.useForm();
  const [securityForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('profile');
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 获取用户信息
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ['user', user?.id],
    queryFn: () => user ? userApi.getUser(user.id) : null,
    enabled: !!user?.id,
  });

  // 获取系统设置
  const { data: systemSettings, isLoading: systemLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async (): Promise<SystemSettings> => {
      // 模拟 API 调用
      return {
        maxConcurrentTasks: 10,
        defaultTimeout: 30,
        enableNotifications: true,
        logLevel: 'info',
        autoCleanupDays: 30,
        enableMetrics: true,
        enableCache: true,
        cacheExpiration: 3600,
      };
    },
  });

  // 更新用户信息
  const updateProfileMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUserRequest }) =>
      userApi.updateUser(id, data),
    onSuccess: () => {
      message.success('个人信息更新成功');
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
    onError: (error: Error) => {
      message.error(`更新失败: ${error.message}`);
    },
  });

  // 更新系统设置
  const updateSystemMutation = useMutation({
    mutationFn: async (settings: SystemSettings) => {
      // 模拟 API 调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      return settings;
    },
    onSuccess: () => {
      message.success('系统设置更新成功');
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    },
    onError: (error: Error) => {
      message.error(`更新失败: ${error.message}`);
    },
  });

  // 修改密码
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      // 模拟 API 调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      return data;
    },
    onSuccess: () => {
      message.success('密码修改成功');
      securityForm.resetFields();
    },
    onError: (error: Error) => {
      message.error(`修改失败: ${error.message}`);
    },
  });

  const handleProfileSubmit = (values: UpdateUserRequest) => {
    if (user) {
      updateProfileMutation.mutate({ id: user.id, data: values });
    }
  };

  const handleSystemSubmit = (values: SystemSettings) => {
    updateSystemMutation.mutate(values);
  };

  const handlePasswordSubmit = (values: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('两次输入的密码不一致');
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });
  };

  const handleAvatarUpload = (info: UploadChangeParam) => {
    if (info.file.status === 'done') {
      message.success('头像上传成功');
    } else if (info.file.status === 'error') {
      message.error('头像上传失败');
    }
  };

  // 初始化表单数据
  React.useEffect(() => {
    if (userData?.data) {
      profileForm.setFieldsValue({
        username: userData.data.username,
        email: userData.data.email,
        role: userData.data.role,
        isActive: userData.data.isActive,
      });
    }
  }, [userData, profileForm]);

  React.useEffect(() => {
    if (systemSettings) {
      systemForm.setFieldsValue(systemSettings);
    }
  }, [systemSettings, systemForm]);

  return (
    <div>
      <Card>
        <Title level={2} style={{ marginBottom: 24 }}>
          <SettingOutlined /> 系统设置
        </Title>

        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane
            tab={
              <span>
                <UserOutlined />
                个人信息
              </span>
            }
            key="profile"
          >
            <Card loading={userLoading}>
              <Row gutter={24}>
                <Col span={6}>
                  <div style={{ textAlign: 'center' }}>
                    <Avatar
                      size={120}
                      icon={<UserOutlined />}
                      style={{ marginBottom: 16 }}
                    >
                      {user?.username?.charAt(0).toUpperCase()}
                    </Avatar>
                    <br />
                    <Upload
                      name="avatar"
                      showUploadList={false}
                      action="/api/upload/avatar"
                      onChange={handleAvatarUpload}
                    >
                      <Button icon={<UploadOutlined />} size="small">
                        更换头像
                      </Button>
                    </Upload>
                  </div>
                </Col>
                <Col span={18}>
                  <Form
                    form={profileForm}
                    layout="vertical"
                    onFinish={handleProfileSubmit}
                  >
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          name="username"
                          label="用户名"
                          rules={[
                            { required: true, message: '请输入用户名' },
                            { min: 3, message: '用户名至少3个字符' },
                          ]}
                        >
                          <Input placeholder="请输入用户名" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          name="email"
                          label="邮箱"
                          rules={[
                            { required: true, message: '请输入邮箱' },
                            { type: 'email', message: '请输入有效的邮箱地址' },
                          ]}
                        >
                          <Input placeholder="请输入邮箱" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="role" label="角色">
                          <Select disabled>
                            <Option value="admin">管理员</Option>
                            <Option value="user">用户</Option>
                            <Option value="viewer">观察者</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="isActive" label="账户状态" valuePropName="checked">
                          <Switch
                            disabled
                            checkedChildren="活跃"
                            unCheckedChildren="禁用"
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item>
                      <Space>
                        <Button
                          type="primary"
                          htmlType="submit"
                          icon={<SaveOutlined />}
                          loading={updateProfileMutation.isPending}
                        >
                          保存更改
                        </Button>
                        <Button
                          icon={<ReloadOutlined />}
                          onClick={() => {
                            profileForm.resetFields();
                            queryClient.invalidateQueries({ queryKey: ['user'] });
                          }}
                        >
                          重置
                        </Button>
                      </Space>
                    </Form.Item>
                  </Form>
                </Col>
              </Row>
            </Card>
          </TabPane>

          <TabPane
            tab={
              <span>
                <SecurityScanOutlined />
                安全设置
              </span>
            }
            key="security"
          >
            <Card>
              <Title level={4}>修改密码</Title>
              <Alert
                message="密码安全提示"
                description="为了您的账户安全，建议定期更换密码，密码应包含字母、数字和特殊字符。"
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
              />
              
              <Form
                form={securityForm}
                layout="vertical"
                onFinish={handlePasswordSubmit}
                style={{ maxWidth: 400 }}
              >
                <Form.Item
                  name="currentPassword"
                  label="当前密码"
                  rules={[{ required: true, message: '请输入当前密码' }]}
                >
                  <Input.Password placeholder="请输入当前密码" />
                </Form.Item>

                <Form.Item
                  name="newPassword"
                  label="新密码"
                  rules={[
                    { required: true, message: '请输入新密码' },
                    { min: 6, message: '密码至少6个字符' },
                  ]}
                >
                  <Input.Password placeholder="请输入新密码" />
                </Form.Item>

                <Form.Item
                  name="confirmPassword"
                  label="确认新密码"
                  rules={[
                    { required: true, message: '请确认新密码' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('newPassword') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('两次输入的密码不一致'));
                      },
                    }),
                  ]}
                >
                  <Input.Password placeholder="请确认新密码" />
                </Form.Item>

                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={changePasswordMutation.isPending}
                  >
                    修改密码
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </TabPane>

          <TabPane
            tab={
              <span>
                <SettingOutlined />
                系统配置
              </span>
            }
            key="system"
          >
            <Card loading={systemLoading}>
              <Alert
                message="系统配置说明"
                description="修改系统配置可能会影响爬虫的运行性能和稳定性，请谨慎操作。"
                type="warning"
                showIcon
                style={{ marginBottom: 24 }}
              />

              <Form
                form={systemForm}
                layout="vertical"
                onFinish={handleSystemSubmit}
              >
                <Title level={5}>任务配置</Title>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="maxConcurrentTasks"
                      label="最大并发任务数"
                      rules={[{ required: true, message: '请输入最大并发任务数' }]}
                    >
                      <InputNumber
                        min={1}
                        max={100}
                        style={{ width: '100%' }}
                        placeholder="请输入最大并发任务数"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="defaultTimeout"
                      label="默认超时时间（秒）"
                      rules={[{ required: true, message: '请输入默认超时时间' }]}
                    >
                      <InputNumber
                        min={1}
                        max={300}
                        style={{ width: '100%' }}
                        placeholder="请输入默认超时时间"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Divider />
                <Title level={5}>系统功能</Title>
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item name="enableNotifications" label="启用通知" valuePropName="checked">
                      <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="enableMetrics" label="启用监控" valuePropName="checked">
                      <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="enableCache" label="启用缓存" valuePropName="checked">
                      <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="logLevel"
                      label="日志级别"
                      rules={[{ required: true, message: '请选择日志级别' }]}
                    >
                      <Select placeholder="请选择日志级别">
                        <Option value="debug">Debug</Option>
                        <Option value="info">Info</Option>
                        <Option value="warn">Warning</Option>
                        <Option value="error">Error</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="autoCleanupDays"
                      label="自动清理天数"
                      rules={[{ required: true, message: '请输入自动清理天数' }]}
                    >
                      <InputNumber
                        min={1}
                        max={365}
                        style={{ width: '100%' }}
                        placeholder="请输入自动清理天数"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="cacheExpiration"
                  label="缓存过期时间（秒）"
                  rules={[{ required: true, message: '请输入缓存过期时间' }]}
                >
                  <InputNumber
                    min={60}
                    max={86400}
                    style={{ width: '100%' }}
                    placeholder="请输入缓存过期时间"
                  />
                </Form.Item>

                <Form.Item>
                  <Space>
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<SaveOutlined />}
                      loading={updateSystemMutation.isPending}
                    >
                      保存配置
                    </Button>
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={() => {
                        systemForm.resetFields();
                        queryClient.invalidateQueries({ queryKey: ['system-settings'] });
                      }}
                    >
                      重置
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Card>
          </TabPane>

          <TabPane
            tab={
              <span>
                <BellOutlined />
                通知设置
              </span>
            }
            key="notifications"
          >
            <Card>
              <Title level={4}>通知偏好</Title>
              <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                配置您希望接收的通知类型和方式
              </Text>

              <Form layout="vertical">
                <Title level={5}>邮件通知</Title>
                <Form.Item name="emailTaskComplete" valuePropName="checked">
                  <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                  <span style={{ marginLeft: 8 }}>任务完成通知</span>
                </Form.Item>
                <Form.Item name="emailTaskFailed" valuePropName="checked">
                  <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                  <span style={{ marginLeft: 8 }}>任务失败通知</span>
                </Form.Item>
                <Form.Item name="emailSystemAlert" valuePropName="checked">
                  <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                  <span style={{ marginLeft: 8 }}>系统告警通知</span>
                </Form.Item>

                <Divider />
                <Title level={5}>浏览器通知</Title>
                <Form.Item name="browserTaskComplete" valuePropName="checked">
                  <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                  <span style={{ marginLeft: 8 }}>任务完成通知</span>
                </Form.Item>
                <Form.Item name="browserTaskFailed" valuePropName="checked">
                  <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                  <span style={{ marginLeft: 8 }}>任务失败通知</span>
                </Form.Item>

                <Form.Item>
                  <Button type="primary" icon={<SaveOutlined />}>
                    保存通知设置
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default Settings;