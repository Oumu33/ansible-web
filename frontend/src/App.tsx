import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import { Provider } from 'react-redux';
import { store } from './store';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import HostManagement from './pages/HostManagement';
import PlaybookEditor from './pages/PlaybookEditor';
import TaskMonitor from './pages/TaskMonitor';
import TemplateMarket from './pages/TemplateMarket';
import UserManagement from './pages/UserManagement';
import Settings from './pages/Settings';
import { useAuth } from './hooks/useAuth';
import './App.css';

const { defaultAlgorithm, darkAlgorithm } = theme;

function App() {
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();
    
    if (loading) {
      return <div>Loading...</div>;
    }
    
    return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
  };

  return (
    <Provider store={store}>
      <ConfigProvider
        theme={{
          algorithm: isDarkMode ? darkAlgorithm : defaultAlgorithm,
          token: {
            colorPrimary: '#1890ff',
          },
        }}
      >
        <Router>
          <div className="App">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <Layout onThemeChange={setIsDarkMode}>
                      <Routes>
                        <Route path="/" element={<Navigate to="/dashboard" />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/hosts" element={<HostManagement />} />
                        <Route path="/playbooks" element={<PlaybookEditor />} />
                        <Route path="/tasks" element={<TaskMonitor />} />
                        <Route path="/templates" element={<TemplateMarket />} />
                        <Route path="/users" element={<UserManagement />} />
                        <Route path="/settings" element={<Settings />} />
                      </Routes>
                    </Layout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </div>
        </Router>
      </ConfigProvider>
    </Provider>
  );
}

export default App;