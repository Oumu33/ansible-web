import React, { useState } from 'react';
import {
  Layout as AntLayout,
  Menu,
  Button,
  Avatar,
  Dropdown,
  Switch,
  Space,
  Badge,
  notification,
} from 'antd';
import {
  DashboardOutlined,
  ServerOutlined,
  FileTextOutlined,
  MonitorOutlined,
  AppstoreOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  BellOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SunOutlined,
  MoonOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { logout } from '../store/slices/authSlice';
import './Layout.css';

const { Header, Sider, Content } = AntLayout;

interface LayoutProps {
  children: React.ReactNode;
  onThemeChange: (isDark: boolean) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, onThemeChange }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  
  const { user } = useSelector((state: RootState) => state.auth);
  const { runningTasks } = useSelector((state: RootState) => state.tasks);

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表板',
    },
    {
      key: '/hosts',
      icon: <ServerOutlined />,
      label: '主机管理',
    },
    {
      key: '/playbooks',
      icon: <FileTextOutlined />,
      label: 'Playbook编辑器',
    },
    {
      key: '/tasks',
      icon: <MonitorOutlined />,
      label: '任务监控',
    },
    {
      key: '/templates',
      icon: <AppstoreOutlined />,
      label: '模板市场',
    },
    {
      key: '/users',
      icon: <UserOutlined />,
      label: '用户管理',
      disabled: user?.role !== 'admin',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '系统设置',
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const handleThemeChange = (checked: boolean) => {
    setIsDarkMode(checked);
    onThemeChange(checked);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
    notification.success({
      message: '退出成功',
      description: '您已成功退出系统',
    });
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '账户设置',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  return (
    <AntLayout className="layout">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        className="layout-sider"
        width={250}
      >
        <div className="logo">
          <img src="/logo.svg" alt="Ansible Web" />
          {!collapsed && <span>Ansible Web</span>}
        </div>
        
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      
      <AntLayout className="site-layout">
        <Header className="layout-header">
          <div className="header-left">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="trigger"
            />
          </div>
          
          <div className="header-right">
            <Space size="middle">
              {/* 主题切换 */}
              <Space>
                <SunOutlined />
                <Switch
                  checked={isDarkMode}
                  onChange={handleThemeChange}
                  checkedChildren={<MoonOutlined />}
                  unCheckedChildren={<SunOutlined />}
                />
                <MoonOutlined />
              </Space>
              
              {/* 通知 */}
              <Badge count={runningTasks?.length || 0} size="small">
                <Button
                  type="text"
                  icon={<BellOutlined />}
                  onClick={() => navigate('/tasks')}
                />
              </Badge>
              
              {/* 用户菜单 */}
              <Dropdown
                menu={{ items: userMenuItems }}
                placement="bottomRight"
                arrow
              >
                <Space className="user-info">
                  <Avatar icon={<UserOutlined />} />
                  <span>{user?.username}</span>
                </Space>
              </Dropdown>
            </Space>
          </div>
        </Header>
        
        <Content className="layout-content">
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;