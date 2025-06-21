import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  message,
  Popconfirm,
  Card,
  Row,
  Col,
  Statistic,
  Badge,
  Tooltip,
  Upload,
  Switch,
  Divider
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  CloudServerOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  QuestionCircleOutlined,
  ExclamationCircleOutlined,
  UploadOutlined,
  DownloadOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchHosts, createHost, updateHost, deleteHost, testHostConnection } from '../store/slices/hostSlice';
import type { Host, HostGroup } from '../types';

const { Option } = Select;
const { TextArea } = Input;

interface HostFormData {
  name: string;
  hostname: string;
  ip_address: string;
  port: number;
  username: string;
  password?: string;
  private_key_path?: string;
  group_id?: number;
  variables: Record<string, any>;
  tags: string[];
}

const HostManagement: React.FC = () => {
  const dispatch = useAppDispatch();
  const { hosts, hostGroups, loading, error } = useAppSelector(state => state.hosts);
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingHost, setEditingHost] = useState<Host | null>(null);
  const [form] = Form.useForm();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<number | undefined>();
  const [usePrivateKey, setUsePrivateKey] = useState(false);

  useEffect(() => {
    dispatch(fetchHosts());
  }, [dispatch]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'offline':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'error':
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
      default:
        return <QuestionCircleOutlined style={{ color: '#d9d9d9' }} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'success';
      case 'offline': return 'error';
      case 'error': return 'warning';
      default: return 'default';
    }
  };

  const handleAdd = () => {
    setEditingHost(null);
    setUsePrivateKey(false);
    form.resetFields();
    form.setFieldsValue({
      port: 22,
      username: 'root',
      variables: {},
      tags: []
    });
    setIsModalVisible(true);
  };

  const handleEdit = (host: Host) => {
    setEditingHost(host);
    setUsePrivateKey(!!host.private_key_path);
    form.setFieldsValue({
      ...host,
      variables: JSON.stringify(host.variables || {}, null, 2),
      tags: host.tags || []
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await dispatch(deleteHost(id)).unwrap();
      message.success('主机删除成功');
    } catch (error) {
      message.error('删除失败: ' + (error as Error).message);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的主机');
      return;
    }

    Modal.confirm({
      title: '确认删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个主机吗？`,
      onOk: async () => {
        try {
          await Promise.all(
            selectedRowKeys.map(id => dispatch(deleteHost(id as number)).unwrap())
          );
          message.success('批量删除成功');
          setSelectedRowKeys([]);
        } catch (error) {
          message.error('批量删除失败');
        }
      }
    });
  };

  const handleTestConnection = async (host: Host) => {
    try {
      await dispatch(testHostConnection(host.id)).unwrap();
      message.success('连接测试已启动');
    } catch (error) {
      message.error('连接测试失败: ' + (error as Error).message);
    }
  };

  const handleSubmit = async (values: HostFormData) => {
    try {
      let variables = {};
      if (values.variables) {
        try {
          variables = typeof values.variables === 'string' 
            ? JSON.parse(values.variables) 
            : values.variables;
        } catch (e) {
          message.error('变量格式错误，请输入有效的JSON');
          return;
        }
      }

      const hostData = {
        ...values,
        variables,
        password: usePrivateKey ? undefined : values.password,
        private_key_path: usePrivateKey ? values.private_key_path : undefined
      };

      if (editingHost) {
        await dispatch(updateHost({ id: editingHost.id, data: hostData })).unwrap();
        message.success('主机更新成功');
      } else {
        await dispatch(createHost(hostData)).unwrap();
        message.success('主机创建成功');
      }
      
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      message.error('操作失败: ' + (error as Error).message);
    }
  };

  const filteredHosts = hosts.filter(host => {
    const matchesSearch = !searchText || 
      host.name.toLowerCase().includes(searchText.toLowerCase()) ||
      host.hostname.toLowerCase().includes(searchText.toLowerCase()) ||
      host.ip_address.includes(searchText);
    
    const matchesStatus = statusFilter === 'all' || host.status === statusFilter;
    const matchesGroup = !groupFilter || host.group_id === groupFilter;
    
    return matchesSearch && matchesStatus && matchesGroup;
  });

  const columns = [
    {
      title: '主机名',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Host) => (
        <Space>
          <CloudServerOutlined />
          <span>{text}</span>
          {record.tags && record.tags.length > 0 && (
            <Space>
              {record.tags.map(tag => (
                <Tag key={tag} size="small">{tag}</Tag>
              ))}
            </Space>
          )}
        </Space>
      )
    },
    {
      title: '地址',
      key: 'address',
      render: (record: Host) => (
        <div>
          <div>{record.hostname}</div>
          <div style={{ color: '#666', fontSize: '12px' }}>
            {record.ip_address}:{record.port}
          </div>
        </div>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: Host) => (
        <Space>
          {getStatusIcon(status)}
          <Badge status={getStatusColor(status) as any} text={status} />
          {record.last_check && (
            <Tooltip title={`最后检查: ${new Date(record.last_check).toLocaleString()}`}>
              <span style={{ color: '#999', fontSize: '12px' }}>检查</span>
            </Tooltip>
          )}
        </Space>
      )
    },
    {
      title: '主机组',
      dataIndex: 'group_id',
      key: 'group_id',
      render: (groupId: number) => {
        const group = hostGroups.find(g => g.id === groupId);
        return group ? <Tag color="blue">{group.name}</Tag> : '-';
      }
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username'
    },
    {
      title: '认证方式',
      key: 'auth_type',
      render: (record: Host) => (
        <Tag color={record.private_key_path ? 'green' : 'orange'}>
          {record.private_key_path ? '密钥' : '密码'}
        </Tag>
      )
    },
    {
      title: '操作',
      key: 'actions',
      render: (record: Host) => (
        <Space>
          <Tooltip title="测试连接">
            <Button
              type="text"
              icon={<PlayCircleOutlined />}
              onClick={() => handleTestConnection(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这个主机吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
  };

  const stats = {
    total: hosts.length,
    online: hosts.filter(h => h.status === 'online').length,
    offline: hosts.filter(h => h.status === 'offline').length,
    unknown: hosts.filter(h => h.status === 'unknown').length
  };

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总主机数"
              value={stats.total}
              prefix={<CloudServerOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="在线主机"
              value={stats.online}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="离线主机"
              value={stats.offline}
              valueStyle={{ color: '#cf1322' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="未知状态"
              value={stats.unknown}
              valueStyle={{ color: '#d46b08' }}
              prefix={<QuestionCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 操作栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Input.Search
                placeholder="搜索主机名、地址..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 250 }}
              />
              <Select
                placeholder="状态筛选"
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 120 }}
              >
                <Option value="all">全部状态</Option>
                <Option value="online">在线</Option>
                <Option value="offline">离线</Option>
                <Option value="unknown">未知</Option>
                <Option value="error">错误</Option>
              </Select>
              <Select
                placeholder="主机组筛选"
                value={groupFilter}
                onChange={setGroupFilter}
                allowClear
                style={{ width: 150 }}
              >
                {hostGroups.map(group => (
                  <Option key={group.id} value={group.id}>{group.name}</Option>
                ))}
              </Select>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => dispatch(fetchHosts())}
                loading={loading}
              >
                刷新
              </Button>
              <Button
                icon={<UploadOutlined />}
                onClick={() => message.info('批量导入功能开发中')}
              >
                批量导入
              </Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={() => message.info('导出功能开发中')}
              >
                导出
              </Button>
              {selectedRowKeys.length > 0 && (
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleBatchDelete}
                >
                  批量删除 ({selectedRowKeys.length})
                </Button>
              )}
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
              >
                添加主机
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 主机列表 */}
      <Card>
        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={filteredHosts}
          rowKey="id"
          loading={loading}
          pagination={{
            total: filteredHosts.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
          }}
        />
      </Card>

      {/* 添加/编辑主机模态框 */}
      <Modal
        title={editingHost ? '编辑主机' : '添加主机'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={600}
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
                label="主机名"
                rules={[{ required: true, message: '请输入主机名' }]}
              >
                <Input placeholder="输入主机名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="group_id"
                label="主机组"
              >
                <Select placeholder="选择主机组" allowClear>
                  {hostGroups.map(group => (
                    <Option key={group.id} value={group.id}>{group.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="hostname"
                label="主机地址"
                rules={[{ required: true, message: '请输入主机地址' }]}
              >
                <Input placeholder="域名或IP地址" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="ip_address"
                label="IP地址"
                rules={[
                  { required: true, message: '请输入IP地址' },
                  { pattern: /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/, message: '请输入有效的IP地址' }
                ]}
              >
                <Input placeholder="192.168.1.100" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="port"
                label="SSH端口"
                rules={[{ required: true, message: '请输入SSH端口' }]}
              >
                <InputNumber min={1} max={65535} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="username"
                label="用户名"
                rules={[{ required: true, message: '请输入用户名' }]}
              >
                <Input placeholder="root" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="认证方式">
                <Switch
                  checked={usePrivateKey}
                  onChange={setUsePrivateKey}
                  checkedChildren="密钥"
                  unCheckedChildren="密码"
                />
              </Form.Item>
            </Col>
          </Row>

          {usePrivateKey ? (
            <Form.Item
              name="private_key_path"
              label="私钥路径"
              rules={[{ required: true, message: '请输入私钥文件路径' }]}
            >
              <Input placeholder="/path/to/private/key" />
            </Form.Item>
          ) : (
            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password placeholder="输入SSH密码" />
            </Form.Item>
          )}

          <Form.Item
            name="tags"
            label="标签"
          >
            <Select
              mode="tags"
              placeholder="添加标签"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="variables"
            label="主机变量 (JSON格式)"
          >
            <TextArea
              rows={4}
              placeholder='{"key": "value"}'
            />
          </Form.Item>

          <Divider />

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editingHost ? '更新' : '创建'}
              </Button>
              <Button onClick={() => setIsModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default HostManagement;