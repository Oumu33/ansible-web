import React, { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Form,
  Input,
  Button,
  Switch,
  Select,
  InputNumber,
  Upload,
  Avatar,
  Space,
  Divider,
  Alert,
  message,
  Row,
  Col,
  Typography,
  List,
  Badge,
  Modal,
  Table,
  Tag,
  Tooltip,
  Progress,
  Statistic,
  Timeline,
  Descriptions,
  Radio,
  Slider,
  ColorPicker,
  TimePicker,
  DatePicker
} from 'antd';
import {
  UserOutlined,
  SettingOutlined,
  SecurityScanOutlined,
  BellOutlined,
  DatabaseOutlined,
  CloudOutlined,
  MailOutlined,
  KeyOutlined,
  SaveOutlined,
  ReloadOutlined,
  UploadOutlined,
  DownloadOutlined,
  DeleteOutlined,
  EyeOutlined,
  EditOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  LockOutlined,
  UnlockOutlined,
  SyncOutlined,
  HistoryOutlined,
  FileTextOutlined,
  MonitorOutlined,
  GlobalOutlined,
  ThunderboltOutlined,
  ShieldOutlined
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../store';
import { updateProfile, changePassword } from '../store/slices/authSlice';
import type { User } from '../types';
import dayjs from 'dayjs';

const { TabPane } = Tabs;
const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface SystemConfig {
  site_name: string;
  site_description: string;
  site_logo?: string;
  timezone: string;
  language: string;
  theme: 'light' | 'dark' | 'auto';
  session_timeout: number;
  max_login_attempts: number;
  password_policy: {
    min_length: number;
    require_uppercase: boolean;
    require_lowercase: boolean;
    require_numbers: boolean;
    require_symbols: boolean;
    expiry_days: number;
  };
  backup: {
    enabled: boolean;
    schedule: string;
    retention_days: number;
    storage_path: string;
  };
  email: {
    enabled: boolean;
    smtp_host: string;
    smtp_port: number;
    smtp_user: string;
    smtp_password: string;
    use_tls: boolean;
    from_email: string;
  };
  ansible: {
    default_timeout: number;
    max_concurrent_tasks: number;
    log_level: string;
    gather_facts: boolean;
    host_key_checking: boolean;
    retry_files_enabled: boolean;
  };
  monitoring: {
    enabled: boolean;
    metrics_retention_days: number;
    alert_thresholds: {
      cpu_usage: number;
      memory_usage: number;
      disk_usage: number;
      task_failure_rate: number;
    };
  };
}

interface NotificationSettings {
  email_notifications: boolean;
  task_completion: boolean;
  task_failure: boolean;
  system_alerts: boolean;
  security_events: boolean;
  weekly_reports: boolean;
  maintenance_notices: boolean;
}

interface AuditLog {
  id: number;
  user: string;
  action: string;
  resource: string;
  timestamp: string;
  ip_address: string;
  user_agent: string;
  status: 'success' | 'failure';
  details?: string;
}

const Settings: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>({
    site_name: 'Ansible Web管理平台',
    site_description: '基于Web的Ansible自动化运维管理平台',
    timezone: 'Asia/Shanghai',
    language: 'zh-CN',
    theme: 'light',
    session_timeout: 30,
    max_login_attempts: 5,
    password_policy: {
      min_length: 8,
      require_uppercase: true,
      require_lowercase: true,
      require_numbers: true,
      require_symbols: false,
      expiry_days: 90
    },
    backup: {
      enabled: true,
      schedule: '0 2 * * *',
      retention_days: 30,
      storage_path: '/var/backups/ansible-web'
    },
    email: {
      enabled: false,
      smtp_host: '',
      smtp_port: 587,
      smtp_user: '',
      smtp_password: '',
      use_tls: true,
      from_email: ''
    },
    ansible: {
      default_timeout: 300,
      max_concurrent_tasks: 10,
      log_level: 'INFO',
      gather_facts: true,
      host_key_checking: false,
      retry_files_enabled: false
    },
    monitoring: {
      enabled: true,
      metrics_retention_days: 90,
      alert_thresholds: {
        cpu_usage: 80,
        memory_usage: 85,
        disk_usage: 90,
        task_failure_rate: 10
      }
    }
  });
  
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email_notifications: true,
    task_completion: true,
    task_failure: true,
    system_alerts: true,
    security_events: true,
    weekly_reports: false,
    maintenance_notices: true
  });
  
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [systemForm] = Form.useForm();
  const [emailForm] = Form.useForm();
  const [ansibleForm] = Form.useForm();

  useEffect(() => {
    loadAuditLogs();
    loadSystemConfig();
  }, []);

  const loadAuditLogs = async () => {
    // 模拟审计日志数据
    const mockLogs: AuditLog[] = [
      {
        id: 1,
        user: 'admin',
        action: '登录系统',
        resource: 'auth',
        timestamp: '2024-01-15T09:00:00Z',
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        status: 'success'
      },
      {
        id: 2,
        user: 'operator1',
        action: '执行Playbook',
        resource: 'playbook:web-deploy',
        timestamp: '2024-01-15T10:30:00Z',
        ip_address: '192.168.1.101',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        status: 'success'
      },
      {
        id: 3,
        user: 'viewer1',
        action: '尝试删除主机',
        resource: 'host:web-server-01',
        timestamp: '2024-01-15T11:15:00Z',
        ip_address: '192.168.1.102',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        status: 'failure',
        details: '权限不足'
      }
    ];
    setAuditLogs(mockLogs);
  };

  const loadSystemConfig = async () => {
    // 模拟加载系统配置
    systemForm.setFieldsValue(systemConfig);
    emailForm.setFieldsValue(systemConfig.email);
    ansibleForm.setFieldsValue(systemConfig.ansible);
  };

  const handleProfileUpdate = async (values: any) => {
    try {
      setLoading(true);
      await dispatch(updateProfile(values)).unwrap();
      message.success('个人信息更新成功');
    } catch (error) {
      message.error('更新失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (values: any) => {
    try {
      setLoading(true);
      await dispatch(changePassword({
        currentPassword: values.current_password,
        newPassword: values.new_password
      })).unwrap();
      message.success('密码修改成功');
      passwordForm.resetFields();
    } catch (error) {
      message.error('密码修改失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSystemConfigSave = async (values: any) => {
    try {
      setLoading(true);
      // 模拟保存系统配置
      setSystemConfig({ ...systemConfig, ...values });
      message.success('系统配置保存成功');
    } catch (error) {
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailConfigSave = async (values: any) => {
    try {
      setLoading(true);
      // 模拟保存邮件配置
      setSystemConfig({ 
        ...systemConfig, 
        email: { ...systemConfig.email, ...values } 
      });
      message.success('邮件配置保存成功');
    } catch (error) {
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAnsibleConfigSave = async (values: any) => {
    try {
      setLoading(true);
      // 模拟保存Ansible配置
      setSystemConfig({ 
        ...systemConfig, 
        ansible: { ...systemConfig.ansible, ...values } 
      });
      message.success('Ansible配置保存成功');
    } catch (error) {
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmailConfig = async () => {
    try {
      setLoading(true);
      // 模拟测试邮件配置
      await new Promise(resolve => setTimeout(resolve, 2000));
      message.success('测试邮件发送成功');
    } catch (error) {
      message.error('测试邮件发送失败');
    } finally {
      setLoading(false);
    }
  };

  const handleBackupNow = async () => {
    try {
      setLoading(true);
      // 模拟立即备份
      await new Promise(resolve => setTimeout(resolve, 3000));
      message.success('备份创建成功');
    } catch (error) {
      message.error('备份失败');
    } finally {
      setLoading(false);
    }
  };

  const handleExportLogs = () => {
    // 模拟导出审计日志
    const dataStr = JSON.stringify(auditLogs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${dayjs().format('YYYY-MM-DD')}.json`;
    link.click();
    URL.revokeObjectURL(url);
    message.success('审计日志导出成功');
  };

  const auditLogColumns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp: string) => dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '用户',
      dataIndex: 'user',
      key: 'user'
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action'
    },
    {
      title: '资源',
      dataIndex: 'resource',
      key: 'resource'
    },
    {
      title: 'IP地址',
      dataIndex: 'ip_address',
      key: 'ip_address'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'success' ? 'green' : 'red'}>
          {status === 'success' ? '成功' : '失败'}
        </Tag>
      )
    },
    {
      title: '详情',
      dataIndex: 'details',
      key: 'details',
      render: (details: string) => details || '-'
    }
  ];

  return (
    <div>
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        {/* 个人设置 */}
        <TabPane tab={<span><UserOutlined />个人设置</span>} key="profile">
          <Row gutter={24}>
            <Col span={12}>
              <Card title="基本信息" style={{ marginBottom: 16 }}>
                <Form
                  form={profileForm}
                  layout="vertical"
                  initialValues={user}
                  onFinish={handleProfileUpdate}
                >
                  <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <Avatar size={80} icon={<UserOutlined />} />
                    <div style={{ marginTop: 8 }}>
                      <Upload>
                        <Button icon={<UploadOutlined />}>更换头像</Button>
                      </Upload>
                    </div>
                  </div>
                  
                  <Form.Item name="username" label="用户名">
                    <Input disabled />
                  </Form.Item>
                  
                  <Form.Item name="email" label="邮箱" rules={[{ type: 'email' }]}>
                    <Input />
                  </Form.Item>
                  
                  <Form.Item name={['profile', 'full_name']} label="姓名">
                    <Input />
                  </Form.Item>
                  
                  <Form.Item name={['profile', 'phone']} label="电话">
                    <Input />
                  </Form.Item>
                  
                  <Form.Item name={['profile', 'department']} label="部门">
                    <Input />
                  </Form.Item>
                  
                  <Form.Item name={['profile', 'position']} label="职位">
                    <Input />
                  </Form.Item>
                  
                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading}>
                      保存更改
                    </Button>
                  </Form.Item>
                </Form>
              </Card>
            </Col>
            
            <Col span={12}>
              <Card title="修改密码" style={{ marginBottom: 16 }}>
                <Form
                  form={passwordForm}
                  layout="vertical"
                  onFinish={handlePasswordChange}
                >
                  <Form.Item
                    name="current_password"
                    label="当前密码"
                    rules={[{ required: true, message: '请输入当前密码' }]}
                  >
                    <Input.Password />
                  </Form.Item>
                  
                  <Form.Item
                    name="new_password"
                    label="新密码"
                    rules={[
                      { required: true, message: '请输入新密码' },
                      { min: 8, message: '密码长度至少8位' }
                    ]}
                  >
                    <Input.Password />
                  </Form.Item>
                  
                  <Form.Item
                    name="confirm_password"
                    label="确认密码"
                    dependencies={['new_password']}
                    rules={[
                      { required: true, message: '请确认新密码' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('new_password') === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error('两次输入的密码不一致'));
                        },
                      }),
                    ]}
                  >
                    <Input.Password />
                  </Form.Item>
                  
                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading}>
                      修改密码
                    </Button>
                  </Form.Item>
                </Form>
              </Card>
              
              <Card title="通知设置">
                <List
                  dataSource={[
                    { key: 'email_notifications', label: '邮件通知', desc: '接收系统邮件通知' },
                    { key: 'task_completion', label: '任务完成通知', desc: '任务执行完成时通知' },
                    { key: 'task_failure', label: '任务失败通知', desc: '任务执行失败时通知' },
                    { key: 'system_alerts', label: '系统警告', desc: '系统异常时通知' },
                    { key: 'security_events', label: '安全事件', desc: '安全相关事件通知' },
                    { key: 'weekly_reports', label: '周报', desc: '每周发送使用报告' },
                    { key: 'maintenance_notices', label: '维护通知', desc: '系统维护时通知' }
                  ]}
                  renderItem={(item) => (
                    <List.Item
                      actions={[
                        <Switch
                          checked={notificationSettings[item.key as keyof NotificationSettings]}
                          onChange={(checked) => 
                            setNotificationSettings({
                              ...notificationSettings,
                              [item.key]: checked
                            })
                          }
                        />
                      ]}
                    >
                      <List.Item.Meta
                        title={item.label}
                        description={item.desc}
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>
        </TabPane>

        {/* 系统配置 */}
        <TabPane tab={<span><SettingOutlined />系统配置</span>} key="system">
          <Card title="基本设置" style={{ marginBottom: 16 }}>
            <Form
              form={systemForm}
              layout="vertical"
              onFinish={handleSystemConfigSave}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="site_name" label="站点名称">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="timezone" label="时区">
                    <Select>
                      <Option value="Asia/Shanghai">Asia/Shanghai</Option>
                      <Option value="UTC">UTC</Option>
                      <Option value="America/New_York">America/New_York</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              
              <Form.Item name="site_description" label="站点描述">
                <TextArea rows={3} />
              </Form.Item>
              
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="language" label="语言">
                    <Select>
                      <Option value="zh-CN">简体中文</Option>
                      <Option value="en-US">English</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="theme" label="主题">
                    <Radio.Group>
                      <Radio value="light">浅色</Radio>
                      <Radio value="dark">深色</Radio>
                      <Radio value="auto">自动</Radio>
                    </Radio.Group>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="session_timeout" label="会话超时(分钟)">
                    <InputNumber min={5} max={480} />
                  </Form.Item>
                </Col>
              </Row>
              
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading}>
                  保存配置
                </Button>
              </Form.Item>
            </Form>
          </Card>
          
          <Card title="安全设置" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="最大登录尝试次数">
                  <InputNumber 
                    value={systemConfig.max_login_attempts}
                    min={3} 
                    max={10}
                    onChange={(value) => setSystemConfig({
                      ...systemConfig,
                      max_login_attempts: value || 5
                    })}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="密码最小长度">
                  <InputNumber 
                    value={systemConfig.password_policy.min_length}
                    min={6} 
                    max={20}
                    onChange={(value) => setSystemConfig({
                      ...systemConfig,
                      password_policy: {
                        ...systemConfig.password_policy,
                        min_length: value || 8
                      }
                    })}
                  />
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item label="需要大写字母">
                  <Switch 
                    checked={systemConfig.password_policy.require_uppercase}
                    onChange={(checked) => setSystemConfig({
                      ...systemConfig,
                      password_policy: {
                        ...systemConfig.password_policy,
                        require_uppercase: checked
                      }
                    })}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="需要小写字母">
                  <Switch 
                    checked={systemConfig.password_policy.require_lowercase}
                    onChange={(checked) => setSystemConfig({
                      ...systemConfig,
                      password_policy: {
                        ...systemConfig.password_policy,
                        require_lowercase: checked
                      }
                    })}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="需要数字">
                  <Switch 
                    checked={systemConfig.password_policy.require_numbers}
                    onChange={(checked) => setSystemConfig({
                      ...systemConfig,
                      password_policy: {
                        ...systemConfig.password_policy,
                        require_numbers: checked
                      }
                    })}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="需要特殊字符">
                  <Switch 
                    checked={systemConfig.password_policy.require_symbols}
                    onChange={(checked) => setSystemConfig({
                      ...systemConfig,
                      password_policy: {
                        ...systemConfig.password_policy,
                        require_symbols: checked
                      }
                    })}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        </TabPane>

        {/* 邮件配置 */}
        <TabPane tab={<span><MailOutlined />邮件配置</span>} key="email">
          <Card title="SMTP设置">
            <Form
              form={emailForm}
              layout="vertical"
              onFinish={handleEmailConfigSave}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="enabled" label="启用邮件" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="use_tls" label="使用TLS" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>
              
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="smtp_host" label="SMTP服务器">
                    <Input placeholder="smtp.example.com" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="smtp_port" label="端口">
                    <InputNumber min={1} max={65535} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="smtp_user" label="用户名">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="smtp_password" label="密码">
                    <Input.Password />
                  </Form.Item>
                </Col>
              </Row>
              
              <Form.Item name="from_email" label="发件人邮箱">
                <Input placeholder="noreply@example.com" />
              </Form.Item>
              
              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" loading={loading}>
                    保存配置
                  </Button>
                  <Button onClick={handleTestEmailConfig} loading={loading}>
                    测试连接
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>

        {/* Ansible配置 */}
        <TabPane tab={<span><ThunderboltOutlined />Ansible配置</span>} key="ansible">
          <Card title="Ansible设置">
            <Form
              form={ansibleForm}
              layout="vertical"
              onFinish={handleAnsibleConfigSave}
            >
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="default_timeout" label="默认超时时间(秒)">
                    <InputNumber min={30} max={3600} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="max_concurrent_tasks" label="最大并发任务数">
                    <InputNumber min={1} max={50} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="log_level" label="日志级别">
                    <Select>
                      <Option value="DEBUG">DEBUG</Option>
                      <Option value="INFO">INFO</Option>
                      <Option value="WARNING">WARNING</Option>
                      <Option value="ERROR">ERROR</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="gather_facts" label="收集Facts" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="host_key_checking" label="主机密钥检查" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="retry_files_enabled" label="启用重试文件" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>
              
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading}>
                  保存配置
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>

        {/* 备份设置 */}
        <TabPane tab={<span><DatabaseOutlined />备份设置</span>} key="backup">
          <Card title="备份配置">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="启用自动备份">
                  <Switch 
                    checked={systemConfig.backup.enabled}
                    onChange={(checked) => setSystemConfig({
                      ...systemConfig,
                      backup: { ...systemConfig.backup, enabled: checked }
                    })}
                  />
                </Form.Item>
                
                <Form.Item label="备份计划(Cron表达式)">
                  <Input 
                    value={systemConfig.backup.schedule}
                    onChange={(e) => setSystemConfig({
                      ...systemConfig,
                      backup: { ...systemConfig.backup, schedule: e.target.value }
                    })}
                    placeholder="0 2 * * *"
                  />
                </Form.Item>
                
                <Form.Item label="保留天数">
                  <InputNumber 
                    value={systemConfig.backup.retention_days}
                    min={1} 
                    max={365}
                    onChange={(value) => setSystemConfig({
                      ...systemConfig,
                      backup: { ...systemConfig.backup, retention_days: value || 30 }
                    })}
                  />
                </Form.Item>
                
                <Form.Item label="存储路径">
                  <Input 
                    value={systemConfig.backup.storage_path}
                    onChange={(e) => setSystemConfig({
                      ...systemConfig,
                      backup: { ...systemConfig.backup, storage_path: e.target.value }
                    })}
                  />
                </Form.Item>
              </Col>
              
              <Col span={12}>
                <Card title="备份状态" size="small">
                  <Timeline>
                    <Timeline.Item color="green">
                      <Text>2024-01-15 02:00 - 备份成功</Text>
                    </Timeline.Item>
                    <Timeline.Item color="green">
                      <Text>2024-01-14 02:00 - 备份成功</Text>
                    </Timeline.Item>
                    <Timeline.Item color="red">
                      <Text>2024-01-13 02:00 - 备份失败</Text>
                    </Timeline.Item>
                  </Timeline>
                  
                  <Divider />
                  
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Button 
                      type="primary" 
                      icon={<DatabaseOutlined />}
                      onClick={handleBackupNow}
                      loading={loading}
                      block
                    >
                      立即备份
                    </Button>
                    <Button icon={<DownloadOutlined />} block>
                      下载最新备份
                    </Button>
                    <Button icon={<UploadOutlined />} block>
                      恢复备份
                    </Button>
                  </Space>
                </Card>
              </Col>
            </Row>
          </Card>
        </TabPane>

        {/* 监控设置 */}
        <TabPane tab={<span><MonitorOutlined />监控设置</span>} key="monitoring">
          <Card title="监控配置">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="启用监控">
                  <Switch 
                    checked={systemConfig.monitoring.enabled}
                    onChange={(checked) => setSystemConfig({
                      ...systemConfig,
                      monitoring: { ...systemConfig.monitoring, enabled: checked }
                    })}
                  />
                </Form.Item>
                
                <Form.Item label="指标保留天数">
                  <InputNumber 
                    value={systemConfig.monitoring.metrics_retention_days}
                    min={7} 
                    max={365}
                    onChange={(value) => setSystemConfig({
                      ...systemConfig,
                      monitoring: { 
                        ...systemConfig.monitoring, 
                        metrics_retention_days: value || 90 
                      }
                    })}
                  />
                </Form.Item>
              </Col>
              
              <Col span={12}>
                <Card title="告警阈值" size="small">
                  <Form.Item label="CPU使用率(%)">
                    <Slider 
                      value={systemConfig.monitoring.alert_thresholds.cpu_usage}
                      min={50} 
                      max={100}
                      onChange={(value) => setSystemConfig({
                        ...systemConfig,
                        monitoring: {
                          ...systemConfig.monitoring,
                          alert_thresholds: {
                            ...systemConfig.monitoring.alert_thresholds,
                            cpu_usage: value
                          }
                        }
                      })}
                    />
                  </Form.Item>
                  
                  <Form.Item label="内存使用率(%)">
                    <Slider 
                      value={systemConfig.monitoring.alert_thresholds.memory_usage}
                      min={50} 
                      max={100}
                      onChange={(value) => setSystemConfig({
                        ...systemConfig,
                        monitoring: {
                          ...systemConfig.monitoring,
                          alert_thresholds: {
                            ...systemConfig.monitoring.alert_thresholds,
                            memory_usage: value
                          }
                        }
                      })}
                    />
                  </Form.Item>
                  
                  <Form.Item label="磁盘使用率(%)">
                    <Slider 
                      value={systemConfig.monitoring.alert_thresholds.disk_usage}
                      min={70} 
                      max={100}
                      onChange={(value) => setSystemConfig({
                        ...systemConfig,
                        monitoring: {
                          ...systemConfig.monitoring,
                          alert_thresholds: {
                            ...systemConfig.monitoring.alert_thresholds,
                            disk_usage: value
                          }
                        }
                      })}
                    />
                  </Form.Item>
                  
                  <Form.Item label="任务失败率(%)">
                    <Slider 
                      value={systemConfig.monitoring.alert_thresholds.task_failure_rate}
                      min={5} 
                      max={50}
                      onChange={(value) => setSystemConfig({
                        ...systemConfig,
                        monitoring: {
                          ...systemConfig.monitoring,
                          alert_thresholds: {
                            ...systemConfig.monitoring.alert_thresholds,
                            task_failure_rate: value
                          }
                        }
                      })}
                    />
                  </Form.Item>
                </Card>
              </Col>
            </Row>
          </Card>
        </TabPane>

        {/* 审计日志 */}
        <TabPane tab={<span><SecurityScanOutlined />审计日志</span>} key="audit">
          <Card 
            title="审计日志" 
            extra={
              <Button icon={<DownloadOutlined />} onClick={handleExportLogs}>
                导出日志
              </Button>
            }
          >
            <Table
              columns={auditLogColumns}
              dataSource={auditLogs}
              rowKey="id"
              pagination={{
                total: auditLogs.length,
                pageSize: 20,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`
              }}
            />
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default Settings;