import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Progress,
  Modal,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  Statistic,
  Timeline,
  Typography,
  Tooltip,
  Popconfirm,
  Badge,
  Drawer,
  Alert,
  Tabs,
  List,
  Empty
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  EyeOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FilterOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
  FileTextOutlined,
  BugOutlined
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchTasks, cancelTask, deleteTask, getTaskLogs } from '../store/slices/taskSlice';
import type { TaskExecution } from '../types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Text, Title } = Typography;
const { TabPane } = Tabs;

interface TaskFilter {
  status?: string;
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  searchText?: string;
  playbookId?: number;
  executedBy?: number;
}

const TaskMonitor: React.FC = () => {
  const dispatch = useAppDispatch();
  const { tasks, loading, error } = useAppSelector(state => state.tasks);
  const { playbooks } = useAppSelector(state => state.playbooks);
  const { users } = useAppSelector(state => state.auth);
  
  const [selectedTask, setSelectedTask] = useState<TaskExecution | null>(null);
  const [isLogModalVisible, setIsLogModalVisible] = useState(false);
  const [isFilterDrawerVisible, setIsFilterDrawerVisible] = useState(false);
  const [taskLogs, setTaskLogs] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [filters, setFilters] = useState<TaskFilter>({});
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(fetchTasks());
  }, [dispatch]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        dispatch(fetchTasks());
      }, refreshInterval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, dispatch]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'failed':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'running':
        return <SyncOutlined spin style={{ color: '#1890ff' }} />;
      case 'cancelled':
        return <StopOutlined style={{ color: '#d9d9d9' }} />;
      case 'pending':
        return <ClockCircleOutlined style={{ color: '#faad14' }} />;
      default:
        return <ExclamationCircleOutlined style={{ color: '#d9d9d9' }} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'success';
      case 'failed': return 'error';
      case 'running': return 'processing';
      case 'cancelled': return 'default';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success': return '成功';
      case 'failed': return '失败';
      case 'running': return '运行中';
      case 'cancelled': return '已取消';
      case 'pending': return '等待中';
      default: return '未知';
    }
  };

  const handleViewLogs = async (task: TaskExecution) => {
    setSelectedTask(task);
    try {
      const logs = await dispatch(getTaskLogs(task.task_id)).unwrap();
      setTaskLogs(logs);
    } catch (error) {
      setTaskLogs('获取日志失败: ' + (error as Error).message);
    }
    setIsLogModalVisible(true);
  };

  const handleCancelTask = async (taskId: string) => {
    try {
      await dispatch(cancelTask(taskId)).unwrap();
      message.success('任务取消成功');
    } catch (error) {
      message.error('取消失败: ' + (error as Error).message);
    }
  };

  const handleDeleteTask = async (id: number) => {
    try {
      await dispatch(deleteTask(id)).unwrap();
      message.success('任务删除成功');
    } catch (error) {
      message.error('删除失败: ' + (error as Error).message);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的任务');
      return;
    }

    Modal.confirm({
      title: '确认删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个任务吗？`,
      onOk: async () => {
        try {
          await Promise.all(
            selectedRowKeys.map(id => dispatch(deleteTask(id as number)).unwrap())
          );
          message.success('批量删除成功');
          setSelectedRowKeys([]);
        } catch (error) {
          message.error('批量删除失败');
        }
      }
    });
  };

  const handleExportLogs = (task: TaskExecution) => {
    const logs = task.logs || '暂无日志';
    const blob = new Blob([logs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `task_${task.task_id}_logs.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const applyFilters = () => {
    let filteredTasks = [...tasks];

    if (filters.status && filters.status !== 'all') {
      filteredTasks = filteredTasks.filter(task => task.status === filters.status);
    }

    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      filteredTasks = filteredTasks.filter(task => 
        task.name.toLowerCase().includes(searchLower) ||
        task.task_id.toLowerCase().includes(searchLower)
      );
    }

    if (filters.dateRange) {
      const [start, end] = filters.dateRange;
      filteredTasks = filteredTasks.filter(task => {
        const taskDate = dayjs(task.created_at);
        return taskDate.isAfter(start) && taskDate.isBefore(end);
      });
    }

    if (filters.playbookId) {
      filteredTasks = filteredTasks.filter(task => task.playbook_id === filters.playbookId);
    }

    if (filters.executedBy) {
      filteredTasks = filteredTasks.filter(task => task.executed_by === filters.executedBy);
    }

    return filteredTasks;
  };

  const filteredTasks = applyFilters();

  const columns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: TaskExecution) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          <div style={{ color: '#666', fontSize: '12px' }}>
            ID: {record.task_id}
          </div>
        </div>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: TaskExecution) => (
        <Space>
          {getStatusIcon(status)}
          <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
          {record.progress !== undefined && record.progress > 0 && (
            <Progress
              percent={record.progress}
              size="small"
              style={{ width: 60 }}
              showInfo={false}
            />
          )}
        </Space>
      )
    },
    {
      title: 'Playbook',
      dataIndex: 'playbook_id',
      key: 'playbook_id',
      render: (playbookId: number) => {
        const playbook = playbooks.find(p => p.id === playbookId);
        return playbook ? (
          <Tag color="blue">{playbook.name}</Tag>
        ) : (
          <Text type="secondary">-</Text>
        );
      }
    },
    {
      title: '执行时间',
      key: 'execution_time',
      render: (record: TaskExecution) => {
        const started = record.started_at ? dayjs(record.started_at) : null;
        const finished = record.finished_at ? dayjs(record.finished_at) : null;
        const created = dayjs(record.created_at);
        
        return (
          <div>
            <div style={{ fontSize: '12px' }}>
              创建: {created.format('MM-DD HH:mm')}
            </div>
            {started && (
              <div style={{ fontSize: '12px' }}>
                开始: {started.format('MM-DD HH:mm')}
              </div>
            )}
            {finished && (
              <div style={{ fontSize: '12px' }}>
                结束: {finished.format('MM-DD HH:mm')}
              </div>
            )}
            {started && finished && (
              <div style={{ fontSize: '12px', color: '#666' }}>
                耗时: {finished.diff(started, 'second')}秒
              </div>
            )}
          </div>
        );
      }
    },
    {
      title: '执行者',
      dataIndex: 'executed_by',
      key: 'executed_by',
      render: (userId: number) => {
        const user = users?.find(u => u.id === userId);
        return user ? user.username : '-';
      }
    },
    {
      title: '操作',
      key: 'actions',
      render: (record: TaskExecution) => (
        <Space>
          <Tooltip title="查看日志">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewLogs(record)}
            />
          </Tooltip>
          <Tooltip title="导出日志">
            <Button
              type="text"
              icon={<DownloadOutlined />}
              onClick={() => handleExportLogs(record)}
            />
          </Tooltip>
          {record.status === 'running' && (
            <Popconfirm
              title="确定要取消这个任务吗？"
              onConfirm={() => handleCancelTask(record.task_id)}
              okText="确定"
              cancelText="取消"
            >
              <Tooltip title="取消任务">
                <Button
                  type="text"
                  danger
                  icon={<StopOutlined />}
                />
              </Tooltip>
            </Popconfirm>
          )}
          {['success', 'failed', 'cancelled'].includes(record.status) && (
            <Popconfirm
              title="确定要删除这个任务记录吗？"
              onConfirm={() => handleDeleteTask(record.id)}
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
          )}
        </Space>
      )
    }
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    getCheckboxProps: (record: TaskExecution) => ({
      disabled: record.status === 'running'
    })
  };

  const stats = {
    total: tasks.length,
    running: tasks.filter(t => t.status === 'running').length,
    success: tasks.filter(t => t.status === 'success').length,
    failed: tasks.filter(t => t.status === 'failed').length,
    pending: tasks.filter(t => t.status === 'pending').length
  };

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card>
            <Statistic
              title="总任务数"
              value={stats.total}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="运行中"
              value={stats.running}
              valueStyle={{ color: '#1890ff' }}
              prefix={<SyncOutlined spin={stats.running > 0} />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="成功"
              value={stats.success}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="失败"
              value={stats.failed}
              valueStyle={{ color: '#cf1322' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="等待中"
              value={stats.pending}
              valueStyle={{ color: '#d46b08' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#666' }}>自动刷新</div>
              <Badge status={autoRefresh ? 'processing' : 'default'} />
              <Button
                type="link"
                size="small"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                {autoRefresh ? '关闭' : '开启'}
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 操作栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Input.Search
                placeholder="搜索任务名称或ID..."
                value={filters.searchText}
                onChange={(e) => setFilters({ ...filters, searchText: e.target.value })}
                style={{ width: 250 }}
              />
              <Select
                placeholder="状态筛选"
                value={filters.status}
                onChange={(status) => setFilters({ ...filters, status })}
                style={{ width: 120 }}
                allowClear
              >
                <Option value="all">全部状态</Option>
                <Option value="running">运行中</Option>
                <Option value="success">成功</Option>
                <Option value="failed">失败</Option>
                <Option value="pending">等待中</Option>
                <Option value="cancelled">已取消</Option>
              </Select>
              <Button
                icon={<FilterOutlined />}
                onClick={() => setIsFilterDrawerVisible(true)}
              >
                高级筛选
              </Button>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => dispatch(fetchTasks())}
                loading={loading}
              >
                刷新
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
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 任务列表 */}
      <Card>
        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={filteredTasks}
          rowKey="id"
          loading={loading}
          pagination={{
            total: filteredTasks.length,
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 日志查看模态框 */}
      <Modal
        title={`任务日志 - ${selectedTask?.name}`}
        open={isLogModalVisible}
        onCancel={() => setIsLogModalVisible(false)}
        footer={[
          <Button key="export" onClick={() => selectedTask && handleExportLogs(selectedTask)}>
            导出日志
          </Button>,
          <Button key="close" onClick={() => setIsLogModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={1000}
      >
        {selectedTask && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Space>
                <Tag>任务ID: {selectedTask.task_id}</Tag>
                <Tag color={getStatusColor(selectedTask.status)}>
                  {getStatusText(selectedTask.status)}
                </Tag>
                {selectedTask.progress !== undefined && (
                  <Progress percent={selectedTask.progress} size="small" style={{ width: 100 }} />
                )}
              </Space>
            </div>
            
            <Tabs defaultActiveKey="logs">
              <TabPane tab="执行日志" key="logs">
                <div
                  ref={logContainerRef}
                  style={{
                    background: '#000',
                    color: '#fff',
                    padding: 16,
                    borderRadius: 4,
                    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                    fontSize: '12px',
                    lineHeight: '1.4',
                    maxHeight: 400,
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {taskLogs || '暂无日志'}
                </div>
              </TabPane>
              
              <TabPane tab="任务详情" key="details">
                <div style={{ padding: 16 }}>
                  <Row gutter={[16, 16]}>
                    <Col span={12}>
                      <Text strong>任务名称:</Text> {selectedTask.name}
                    </Col>
                    <Col span={12}>
                      <Text strong>任务ID:</Text> {selectedTask.task_id}
                    </Col>
                    <Col span={12}>
                      <Text strong>状态:</Text> 
                      <Tag color={getStatusColor(selectedTask.status)} style={{ marginLeft: 8 }}>
                        {getStatusText(selectedTask.status)}
                      </Tag>
                    </Col>
                    <Col span={12}>
                      <Text strong>进度:</Text> {selectedTask.progress || 0}%
                    </Col>
                    <Col span={12}>
                      <Text strong>创建时间:</Text> {dayjs(selectedTask.created_at).format('YYYY-MM-DD HH:mm:ss')}
                    </Col>
                    <Col span={12}>
                      <Text strong>开始时间:</Text> {selectedTask.started_at ? dayjs(selectedTask.started_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
                    </Col>
                    <Col span={12}>
                      <Text strong>结束时间:</Text> {selectedTask.finished_at ? dayjs(selectedTask.finished_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
                    </Col>
                    <Col span={12}>
                      <Text strong>执行者:</Text> {users?.find(u => u.id === selectedTask.executed_by)?.username || '-'}
                    </Col>
                  </Row>
                  
                  {selectedTask.error_message && (
                    <Alert
                      type="error"
                      message="错误信息"
                      description={selectedTask.error_message}
                      style={{ marginTop: 16 }}
                    />
                  )}
                  
                  {selectedTask.target_hosts && selectedTask.target_hosts.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <Text strong>目标主机:</Text>
                      <div style={{ marginTop: 8 }}>
                        {selectedTask.target_hosts.map((hostId: number, index: number) => (
                          <Tag key={index} style={{ marginBottom: 4 }}>
                            主机ID: {hostId}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedTask.extra_vars && Object.keys(selectedTask.extra_vars).length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <Text strong>额外变量:</Text>
                      <pre style={{ 
                        background: '#f5f5f5', 
                        padding: 8, 
                        borderRadius: 4, 
                        marginTop: 8,
                        fontSize: '12px'
                      }}>
                        {JSON.stringify(selectedTask.extra_vars, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </TabPane>
            </Tabs>
          </div>
        )}
      </Modal>

      {/* 高级筛选抽屉 */}
      <Drawer
        title="高级筛选"
        placement="right"
        onClose={() => setIsFilterDrawerVisible(false)}
        open={isFilterDrawerVisible}
        width={400}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Text strong>时间范围</Text>
            <RangePicker
              value={filters.dateRange}
              onChange={(dates) => setFilters({ ...filters, dateRange: dates as [dayjs.Dayjs, dayjs.Dayjs] })}
              style={{ width: '100%', marginTop: 8 }}
            />
          </div>
          
          <div>
            <Text strong>Playbook</Text>
            <Select
              value={filters.playbookId}
              onChange={(playbookId) => setFilters({ ...filters, playbookId })}
              placeholder="选择Playbook"
              style={{ width: '100%', marginTop: 8 }}
              allowClear
            >
              {playbooks.map(playbook => (
                <Option key={playbook.id} value={playbook.id}>{playbook.name}</Option>
              ))}
            </Select>
          </div>
          
          <div>
            <Text strong>执行者</Text>
            <Select
              value={filters.executedBy}
              onChange={(executedBy) => setFilters({ ...filters, executedBy })}
              placeholder="选择执行者"
              style={{ width: '100%', marginTop: 8 }}
              allowClear
            >
              {users?.map(user => (
                <Option key={user.id} value={user.id}>{user.username}</Option>
              ))}
            </Select>
          </div>
          
          <div>
            <Text strong>自动刷新间隔</Text>
            <Select
              value={refreshInterval}
              onChange={setRefreshInterval}
              style={{ width: '100%', marginTop: 8 }}
            >
              <Option value={3000}>3秒</Option>
              <Option value={5000}>5秒</Option>
              <Option value={10000}>10秒</Option>
              <Option value={30000}>30秒</Option>
              <Option value={60000}>1分钟</Option>
            </Select>
          </div>
          
          <Button
            type="primary"
            block
            onClick={() => {
              setFilters({});
              setIsFilterDrawerVisible(false);
            }}
          >
            清除所有筛选
          </Button>
        </Space>
      </Drawer>
    </div>
  );
};

export default TaskMonitor;