import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import MainLayout from './layouts/MainLayout';
import PrivateRoute from './components/common/PrivateRoute';

import HostGroupsPage from './pages/HostGroupsPage';
import EditHostGroupPage from './pages/EditHostGroupPage';
import HostsPage from './pages/HostsPage';
import EditHostPage from './pages/EditHostPage';
import PlaybooksPage from './pages/PlaybooksPage';
import EditPlaybookPage from './pages/EditPlaybookPage';

// Import the new Task Execution pages
import TaskExecutionsPage from './pages/TaskExecutionsPage';
import TaskExecutionDetailPage from './pages/TaskExecutionDetailPage';

// Placeholder for Dashboard
const DashboardPage: React.FC = () => <div style={{padding: '20px'}}><h2>Dashboard</h2><p>Welcome to the Ansible Control Dashboard.</p></div>;

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected Routes - Wrapped by PrivateRoute, which then renders MainLayout */}
        <Route element={<PrivateRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />

            <Route path="/hostgroups" element={<HostGroupsPage />} />
            <Route path="/hostgroups/edit/:id" element={<EditHostGroupPage />} />
            <Route path="/hosts" element={<HostsPage />} />
            <Route path="/hosts/edit/:id" element={<EditHostPage />} />
            <Route path="/playbooks" element={<PlaybooksPage />} />
            <Route path="/playbooks/edit/:id" element={<EditPlaybookPage />} />

            {/* Task Execution Routes */}
            <Route path="/tasks" element={<TaskExecutionsPage />} />
            <Route path="/tasks/:id" element={<TaskExecutionDetailPage />} /> {/* Detail page for a specific task */}
          </Route>
        </Route>

        {/* Fallback for unmatched routes */}
        <Route path="*" element={
          <div style={{ padding: '50px', textAlign: 'center' }}>
            <h2>404 Not Found</h2>
            <Link to="/">Go Home</Link>
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;
