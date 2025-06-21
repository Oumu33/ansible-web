import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Space,
  Tag,
  Avatar,
  Tooltip,
  Popconfirm,
  message,
  Row,
  Col,
  Statistic,
  Badge,
  Tabs,
  Tree,
  Transfer,
  Descriptions,
  Alert,
  DatePicker,
  TimePicker,
  Checkbox,
  Radio,
  Divider,
  Typography,
  Upload,
  Progress
} from 'antd';
import {
  UserOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  LockOutlined,
  UnlockOutlined,
  KeyOutlined,
  TeamOutlined,
  SafetyOutlined,
  SettingOutlined,
  EyeOutlined,
  UserAddOutlined,
  UserDeleteOutlined,
  CrownOutlined,
  ShieldOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  UploadOutlined,
  DownloadOutlined,
  ReloadOutlined,
  SearchOutlined,
  FilterOutlined
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../store';
import type { User, Role, Permission } from '../types';
import dayjs from 'dayjs';

const { Option } = Select;
const { TabPane } = Tabs;
const { Text, Title } = Typography;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

interface UserFormData {
  username: string;
  email: string;
  password?: string;
  role: string;
  is_active: boolean;
  permissions: string[];
  profile?: {
    full_name?: string;
    phone?: string;
    department?: string;
    position?: string;
  };
}

interface RoleFormData {
  name: string;
  description: string;
  permissions: string[];
  is_active: boolean;
}

const UserManagement: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user: currentUser } = useAppSelector(state => state.auth);
  
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isUserModalVisible, setIsUserModalVisible] = useState(false);
  const [isRoleModalVisible, setIsRoleModalVisible] = useState(false);
  const [isPermissionModalVisible, setIsPermissionModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [searchText, setSearchText] = useState('');
  const [filterRole, setFilterRole] = useState<string | undefined>();
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  
  const [userForm] = Form.useForm();
  const [roleForm] = Form.useForm();

  // 模拟数据
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 模拟API调用
      const mockUsers: User[] = [
        {
          id: 1,
          username: 'admin',
          email: 'admin@example.com',
          role: 'admin',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-15T10:30:00Z',
          last_login: '2024-01-15T09:00:00Z',
          profile: {
            full_name: '系统管理员',
            phone: '13800138000',
            department: 'IT部门',
            position: '系统管理员'
          }
        },
        {
          id: 2,
          username: 'operator1',
          email: 'operator1@example.com',
          role: 'operator',
          is_active: true,
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-14T16:20:00Z',
          last_login: '2024-01-14T15:30:00Z',
          profile: {
            full_name: '运维工程师1',
            phone: '13800138001',
            department: '运维部门',
            position: '高级运维工程师'
          }
        },
        {
          id: 3,
          username: 'viewer1',
          email: 'viewer1@example.com',
          role: 'viewer',
          is_active: false,
          created_at: '2024-01-03T00:00:00Z',
          updated_at: '2024-01-10T11:15:00Z',
          last_login: '2024-01-10T10:45:00Z',
          profile: {
            full_name: '只读用户1',
            phone: '13800138002',
            department: '业务部门',
            position: '业务分析师'
          }
        }
      ];

      const mockRoles: Role[] = [
        {
          id: 1,
          name: 'admin',
          description: '系统管理员，拥有所有权限',
          permissions: ['user:read', 'user:write', 'user:delete', 'host:read', 'host:write', 'host:delete', 'playbook:read', 'playbook:write', 'playbook:delete', 'task:read', 'task:write', 'task:delete'],
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 2,
          name: 'operator',
          description: '运维操作员，可以管理主机和执行任务',
          permissions: ['host:read', 'host:write', 'playbook:read', 'playbook:write', 'task:read', 'task:write'],
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 3,
          name: 'viewer',
          description: '只读用户，只能查看信息',
          permissions: ['host:read', 'playbook:read', 'task:read'],
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];

      const mockPermissions: Permission[] = [
        { id: 1, name: 'user:read', description: '查看用户信息', category: 'user' },
        { id: 2, name: 'user:write', description: '编辑用户信息', category: 'user' },
        { id: 3, name: 'user:delete', description: '删除用户', category: 'user' },
        { id: 4, name: 'host:read', description: '查看主机信息', category: 'host' },
        { id: 5, name: 'host:write', description: '编辑主机信息', category: 'host' },
        { id: 6, name: 'host:delete', description: '删除主机', category: 'host' },
        { id: 7, name: 'playbook:read', description: '查看Playbook', category: 'playbook' },
        { id: 8, name: 'playbook:write', description: '编辑Playbook', category: 'playbook' },
        { id: 9, name: 'playbook:delete', description: '删除Playbook', category: 'playbook' },
        { id: 10, name: 'task:read', description: '查看任务', category: 'task' },
        { id: 11, name: 'task:write', description: '执行任务', category: 'task' },
        { id: 12, name: 'task:delete', description: '删除任务记录', category: 'task' }
      ];

      setUsers(mockUsers);
      setRoles(mockRoles);
      setPermissions(mockPermissions);
    } catch (error) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = () => {
    setSelectedUser(null);
    userForm.resetFields();
    setIsUserModalVisible(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    userForm.setFieldsValue({
      ...user,
      permissions: user.permissions || []
    });
    setIsUserModalVisible(true);
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      // 模拟API调用
      setUsers(users.filter(u => u.id !== userId));
      message.success('用户删除成功');
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    try {
      // 模拟API调用
      const updatedUsers = users.map(u => 
        u.id === user.id ? { ...u, is_active: !u.is_active } : u
      );
      setUsers(updatedUsers);
      message.success(`用户${user.is_active ? '禁用' : '启用'}成功`);
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleResetPassword = async (user: User) => {
    try {
      // 模拟API调用
      message.success(`用户 ${user.username} 的密码重置成功，新密码已发送到邮箱`);
    } catch (error) {
      message.error('密码重置失败');
    }
  };

  const handleUserSubmit = async (values: UserFormData) => {
    try {
      if (selectedUser) {
        // 编辑用户
        const updatedUsers = users.map(u => 
          u.id === selectedUser.id ? { ...u, ...values, updated_at: new Date().toISOString() } : u
        );
        setUsers(updatedUsers);
        message.success('用户更新成功');
      } else {
        // 创建用户
        const newUser: User = {
          id: Math.max(...users.map(u => u.id)) + 1,
          ...values,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_login: null
        };
        setUsers([...users, newUser]);
        message.success('用户创建成功');
      }
      setIsUserModalVisible(false);
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleCreateRole = () => {
    setSelectedRole(null);
    roleForm.resetFields();
    setIsRoleModalVisible(true);
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    roleForm.setFieldsValue(role);
    setIsRoleModalVisible(true);
  };

  const handleDeleteRole = async (roleId: number) => {
    try {
      // 检查是否有用户使用此角色
      const usersWithRole = users.filter(u => u.role === roles.find(r => r.id === roleId)?.name);
      if (usersWithRole.length > 0) {
        message.error('该角色正在被使用，无法删除');
        return;
      }
      
      setRoles(roles.filter(r => r.id !== roleId));
      message.success('角色删除成功');
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleRoleSubmit = async (values: RoleFormData) => {
    try {
      if (selectedRole) {
        // 编辑角色
        const updatedRoles = roles.map(r => 
          r.id === selectedRole.id ? { ...r, ...values, updated_at: new Date().toISOString() } : r
        );
        setRoles(updatedRoles);
        message.success('角色更新成功');
      } else {
        // 创建角色
        const newRole: Role = {
          id: Math.max(...roles.map(r => r.id)) + 1,
          ...values,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setRoles([...roles, newRole]);
        message.success('角色创建成功');
      }
      setIsRoleModalVisible(false);
    } catch (error) {
      message.error('操作失败');
    }
  };

  const getFilteredUsers = () => {
    return users.filter(user => {
      const matchesSearch = !searchText || 
        user.username.toLowerCase().includes(searchText.toLowerCase()) ||
        user.email.toLowerCase().includes(searchText.toLowerCase()) ||
        user.profile?.full_name?.toLowerCase().includes(searchText.toLowerCase());
      
      const matchesRole = !filterRole || user.role === filterRole;
      const matchesStatus = !filterStatus || 
        (filterStatus === 'active' && user.is_active) ||
        (filterStatus === 'inactive' && !user.is_active);
      
      return matchesSearch && matchesRole && matchesStatus;
    });
  };

  const userColumns = [
    {
      title: '用户',
      key: 'user',
      render: (record: User) => (
        <Space>
          <Avatar icon={<UserOutlined />} />
          <div>
            <div style={{ fontWeight: 'bold' }}>{record.username}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>{record.profile?.full_name}</div>
          </div>
        </Space>
      )
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email'
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        const roleInfo = roles.find(r => r.name === role);
        const colors: Record<string, string> = {
          admin: 'red',
          operator: 'blue',
          viewer: 'green'
        };
        return <Tag color={colors[role] || 'default'}>{roleInfo?.description || role}</Tag>;
      }
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean) => (
        <Badge 
          status={isActive ? 'success' : 'error'} 
          text={isActive ? '启用' : '禁用'} 
        />
      )
    },
    {
      title: '最后登录',
      dataIndex: 'last_login',
      key: 'last_login',
      render: (lastLogin: string | null) => 
        lastLogin ? dayjs(lastLogin).format('YYYY-MM-DD HH:mm') : '从未登录'
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD')
    },
    {
      title: '操作',
      key: 'actions',
      render: (record: User) => (
        <Space>
          <Tooltip title="查看详情">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              onClick={() => handleEditUser(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => handleEditUser(record)}
            />
          </Tooltip>
          <Tooltip title={record.is_active ? '禁用' : '启用'}>
            <Button 
              type="text" 
              icon={record.is_active ? <LockOutlined /> : <UnlockOutlined />}
              onClick={() => handleToggleUserStatus(record)}
            />
          </Tooltip>
          <Tooltip title="重置密码">
            <Button 
              type="text" 
              icon={<KeyOutlined />}
              onClick={() => handleResetPassword(record)}
            />
          </Tooltip>
          {currentUser?.role === 'admin' && record.username !== 'admin' && (
            <Popconfirm
              title="确定要删除这个用户吗？"
              onConfirm={() => handleDeleteUser(record.id)}
            >
              <Tooltip title="删除">
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  const roleColumns = [
    {
      title: '角色名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Role) => (
        <Space>
          <CrownOutlined style={{ color: name === 'admin' ? '#ff4d4f' : '#1890ff' }} />
          <div>
            <div style={{ fontWeight: 'bold' }}>{name}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>{record.description}</div>
          </div>
        </Space>
      )
    },
    {
      title: '权限数量',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (permissions: string[]) => (
        <Badge count={permissions.length} style={{ backgroundColor: '#52c41a' }} />
      )
    },
    {
      title: '用户数量',
      key: 'user_count',
      render: (record: Role) => {
        const count = users.filter(u => u.role === record.name).length;
        return <Badge count={count} style={{ backgroundColor: '#1890ff' }} />;
      }
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean) => (
        <Badge 
          status={isActive ? 'success' : 'error'} 
          text={isActive ? '启用' : '禁用'} 
        />
      )
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD')
    },
    {
      title: '操作',
      key: 'actions',
      render: (record: Role) => (
        <Space>
          <Tooltip title="编辑">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => handleEditRole(record)}
            />
          </Tooltip>
          {record.name !== 'admin' && (
            <Popconfirm
              title="确定要删除这个角色吗？"
              onConfirm={() => handleDeleteRole(record.id)}
            >
              <Tooltip title="删除">
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  const permissionTreeData = () => {
    const categories = [...new Set(permissions.map(p => p.category))];
    return categories.map(category => ({
      title: category.toUpperCase(),
      key: category,
      children: permissions
        .filter(p => p.category === category)
        .map(p => ({
          title: `${p.name} - ${p.description}`,
          key: p.name
        }))
    }));
  };

  const filteredUsers = getFilteredUsers();
  const activeUsers = users.filter(u => u.is_active).length;
  const totalUsers = users.length;
  const adminUsers = users.filter(u => u.role === 'admin').length;
  const recentLogins = users.filter(u => u.last_login && dayjs().diff(dayjs(u.last_login), 'day') <= 7).length;

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总用户数"
              value={totalUsers}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="活跃用户"
              value={activeUsers}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="管理员"
              value={adminUsers}
              prefix={<CrownOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="近7天登录"
              value={recentLogins}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab={`用户管理 (${totalUsers})`} key="users">
          <Card>
            {/* 搜索和筛选 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Input.Search
                  placeholder="搜索用户名、邮箱或姓名..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onSearch={setSearchText}
                />
              </Col>
              <Col span={4}>
                <Select
                  placeholder="角色筛选"
                  value={filterRole}
                  onChange={setFilterRole}
                  style={{ width: '100%' }}
                  allowClear
                >
                  {roles.map(role => (
                    <Option key={role.name} value={role.name}>{role.description}</Option>
                  ))}
                </Select>
              </Col>
              <Col span={4}>
                <Select
                  placeholder="状态筛选"
                  value={filterStatus}
                  onChange={setFilterStatus}
                  style={{ width: '100%' }}
                  allowClear
                >
                  <Option value="active">启用</Option>
                  <Option value="inactive">禁用</Option>
                </Select>
              </Col>
              <Col span={8}>
                <Space>
                  <Button type="primary" icon={<UserAddOutlined />} onClick={handleCreateUser}>
                    添加用户
                  </Button>
                  <Button icon={<ReloadOutlined />} onClick={loadData}>
                    刷新
                  </Button>
                </Space>
              </Col>
            </Row>

            <Table
              columns={userColumns}
              dataSource={filteredUsers}
              rowKey="id"
              loading={loading}
              pagination={{
                total: filteredUsers.length,
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`
              }}
            />
          </Card>
        </TabPane>

        <TabPane tab={`角色管理 (${roles.length})`} key="roles">
          <Card>
            <div style={{ marginBottom: 16 }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateRole}>
                添加角色
              </Button>
            </div>

            <Table
              columns={roleColumns}
              dataSource={roles}
              rowKey="id"
              loading={loading}
              pagination={false}
            />
          </Card>
        </TabPane>

        <TabPane tab={`权限管理 (${permissions.length})`} key="permissions">
          <Card>
            <Alert
              message="权限说明"
              description="系统采用基于角色的访问控制(RBAC)，通过角色分配权限给用户。权限分为不同类别，每个权限控制特定的操作。"
              type="info"
              style={{ marginBottom: 16 }}
            />
            
            <Tree
              treeData={permissionTreeData()}
              defaultExpandAll
              showIcon
              style={{ background: '#fafafa', padding: 16, borderRadius: 4 }}
            />
          </Card>
        </TabPane>
      </Tabs>

      {/* 用户编辑模态框 */}
      <Modal
        title={selectedUser ? '编辑用户' : '添加用户'}
        open={isUserModalVisible}
        onCancel={() => setIsUserModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={userForm}
          layout="vertical"
          onFinish={handleUserSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="username"
                label="用户名"
                rules={[{ required: true, message: '请输入用户名' }]}
              >
                <Input disabled={!!selectedUser} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="email"
                label="邮箱"
                rules={[
                  { required: true, message: '请输入邮箱' },
                  { type: 'email', message: '请输入有效的邮箱地址' }
                ]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>

          {!selectedUser && (
            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password />
            </Form.Item>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="role"
                label="角色"
                rules={[{ required: true, message: '请选择角色' }]}
              >
                <Select>
                  {roles.filter(r => r.is_active).map(role => (
                    <Option key={role.name} value={role.name}>{role.description}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="is_active"
                label="状态"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch checkedChildren="启用" unCheckedChildren="禁用" />
              </Form.Item>
            </Col>
          </Row>

          <Divider>个人信息</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name={['profile', 'full_name']} label="姓名">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={['profile', 'phone']} label="电话">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name={['profile', 'department']} label="部门">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={['profile', 'position']} label="职位">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {selectedUser ? '更新' : '创建'}
              </Button>
              <Button onClick={() => setIsUserModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 角色编辑模态框 */}
      <Modal
        title={selectedRole ? '编辑角色' : '添加角色'}
        open={isRoleModalVisible}
        onCancel={() => setIsRoleModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={roleForm}
          layout="vertical"
          onFinish={handleRoleSubmit}
        >
          <Form.Item
            name="name"
            label="角色名称"
            rules={[{ required: true, message: '请输入角色名称' }]}
          >
            <Input disabled={selectedRole?.name === 'admin'} />
          </Form.Item>

          <Form.Item
            name="description"
            label="角色描述"
            rules={[{ required: true, message: '请输入角色描述' }]}
          >
            <TextArea rows={3} />
          </Form.Item>

          <Form.Item
            name="permissions"
            label="权限"
            rules={[{ required: true, message: '请选择权限' }]}
          >
            <Tree
              checkable
              treeData={permissionTreeData()}
              defaultExpandAll
            />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="状态"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch 
              checkedChildren="启用" 
              unCheckedChildren="禁用" 
              disabled={selectedRole?.name === 'admin'}
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {selectedRole ? '更新' : '创建'}
              </Button>
              <Button onClick={() => setIsRoleModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagement;