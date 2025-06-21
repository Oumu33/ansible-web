import React, { useEffect, useState } from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Progress,
  Table,
  Tag,
  Timeline,
  Alert,
  Spin,
  Button,
  Space,
} from 'antd';
import {
  ServerOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchDashboardStats } from '../store/slices/dashboardSlice';
import { fetchRecentTasks } from '../store/slices/tasksSlice';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [refreshing, setRefreshing] = useState(false);
  
  const { stats, loading, error } = useSelector((state: RootState) => state.dashboard);
  const { recentTasks } = useSelector((state: RootState) => state.tasks);

  useEffect(() => {
    dispatch(fetchDashboardStats());
    dispatch(fetchRecentTasks());
  }, [dispatch]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      dispatch(fetchDashboardStats()),
      dispatch(fetchRecentTasks()),
    ]);
    setRefreshing(false);
  };

  const taskStatusColors = {
    success: '#52c41a',
    failed: '#ff4d4f',
    running: '#1890ff',
    pending: '#faad14',
  };

  const recentTasksColumns = [
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
      render: (status: string) => {
        const color = taskStatusColors[status as keyof typeof taskStatusColors] || 'default';
        const icon = {
          success: <CheckCircleOutlined />,
          failed: <ExclamationCircleOutlined />,
          running: <ClockCircleOutlined />,
          pending: <ClockCircleOutlined />,
        }[status];
        
        return (
          <Tag color={color} icon={icon}>
            {status.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: '执行时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '耗时',
      dataIndex: 'duration',
      key: 'duration',
      render: (duration: number) => duration ? `${duration}s` : '-',
    },
  ];

  if (loading && !stats) {
    return (
      <div className="dashboard-loading">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="加载失败"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={handleRefresh}>
            重试
          </Button>
        }
      />
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>仪表板</h1>
        <Button
          icon={<ReloadOutlined />}
          onClick={handleRefresh}
          loading={refreshing}
        >
          刷新
        </Button>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} className="stats-row">
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总主机数"
              value={stats?.totalHosts || 0}
              prefix={<ServerOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="在线主机"
              value={stats?.onlineHosts || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <Progress
              percent={stats?.totalHosts ? Math.round((stats.onlineHosts / stats.totalHosts) * 100) : 0}
              size="small"
              showInfo={false}
              strokeColor="#52c41a"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Playbook数量"
              value={stats?.totalPlaybooks || 0}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="今日执行"
              value={stats?.todayExecutions || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="charts-row">
        {/* 执行趋势图 */}
        <Col xs={24} lg={16}>
          <Card title="执行趋势" className="chart-card">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={stats?.executionTrend || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="executions"
                  stroke="#1890ff"
                  fill="#1890ff"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* 任务状态分布 */}
        <Col xs={24} lg={8}>
          <Card title="任务状态分布" className="chart-card">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats?.taskStatusDistribution || []}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {(stats?.taskStatusDistribution || []).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={taskStatusColors[entry.name as keyof typeof taskStatusColors]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="details-row">
        {/* 最近任务 */}
        <Col xs={24} lg={16}>
          <Card title="最近任务" className="recent-tasks-card">
            <Table
              dataSource={recentTasks}
              columns={recentTasksColumns}
              pagination={{ pageSize: 5, showSizeChanger: false }}
              size="small"
              rowKey="id"
            />
          </Card>
        </Col>

        {/* 系统活动 */}
        <Col xs={24} lg={8}>
          <Card title="系统活动" className="activity-card">
            <Timeline
              items={stats?.recentActivities?.map((activity: any) => ({
                color: activity.type === 'error' ? 'red' : 'blue',
                children: (
                  <div>
                    <div className="activity-title">{activity.title}</div>
                    <div className="activity-time">
                      {new Date(activity.timestamp).toLocaleString()}
                    </div>
                  </div>
                ),
              })) || []}
            />
          </Card>
        </Col>
      </Row>

      {/* 系统健康状态 */}
      <Row gutter={[16, 16]} className="health-row">
        <Col span={24}>
          <Card title="系统健康状态">
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <div className="health-item">
                  <div className="health-label">CPU使用率</div>
                  <Progress
                    percent={stats?.systemHealth?.cpu || 0}
                    status={stats?.systemHealth?.cpu > 80 ? 'exception' : 'normal'}
                  />
                </div>
              </Col>
              <Col xs={24} sm={8}>
                <div className="health-item">
                  <div className="health-label">内存使用率</div>
                  <Progress
                    percent={stats?.systemHealth?.memory || 0}
                    status={stats?.systemHealth?.memory > 80 ? 'exception' : 'normal'}
                  />
                </div>
              </Col>
              <Col xs={24} sm={8}>
                <div className="health-item">
                  <div className="health-label">磁盘使用率</div>
                  <Progress
                    percent={stats?.systemHealth?.disk || 0}
                    status={stats?.systemHealth?.disk > 80 ? 'exception' : 'normal'}
                  />
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;