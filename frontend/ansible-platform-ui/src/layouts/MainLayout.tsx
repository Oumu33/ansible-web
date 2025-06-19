import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { logout } from '../services/authService';

// Basic styling for layout components
const styles: { [key: string]: React.CSSProperties } = {
  layout: {
    display: 'flex',
    minHeight: '100vh',
    flexDirection: 'column',
  },
  header: {
    backgroundColor: '#2c3e50',
    color: 'white',
    padding: '10px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '60px',
    boxSizing: 'border-box',
    flexShrink: 0, // Prevent header from shrinking
  },
  headerTitle: {
    margin: 0,
    fontSize: '1.5em',
  },
  headerUser: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  mainContainer: {
    display: 'flex',
    flexGrow: 1,
    height: 'calc(100vh - 60px)', // Full height minus header for the container of sidebar+content
  },
  sidebar: {
    width: '220px',
    backgroundColor: '#34495e',
    color: 'white',
    padding: '20px',
    boxSizing: 'border-box',
    overflowY: 'auto',
    flexShrink: 0, // Prevent sidebar from shrinking
  },
  content: {
    flexGrow: 1,
    padding: '20px',
    backgroundColor: '#ecf0f1',
    overflowY: 'auto',
    boxSizing: 'border-box',
  },
  navList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  navItem: {
    marginBottom: '10px',
  },
  navLink: {
    color: 'white',
    textDecoration: 'none',
    fontSize: '1.1em',
    display: 'block', // Make links block for better click area
    padding: '5px 0',
  },
  logoutButton: {
    background: 'transparent',
    border: '1px solid white',
    color: 'white',
    padding: '5px 10px',
    cursor: 'pointer',
    borderRadius: '4px',
  }
};

const Header: React.FC = () => {
  const { user, logoutUser } = useAuthStore(state => ({ user: state.user, logoutUser: state.logoutUser }));
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    logoutUser();
    navigate('/login');
  };

  return (
    <header style={styles.header}>
      <Link to="/" style={{textDecoration: 'none', color: 'white'}}><h1 style={styles.headerTitle}>Ansible Control</h1></Link>
      {user && (
        <div style={styles.headerUser}>
          <span>Hi, {user?.username}</span>
          <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
        </div>
      )}
    </header>
  );
};

const Sidebar: React.FC = () => {
  return (
    <aside style={styles.sidebar}>
      <nav>
        <ul style={styles.navList}>
          <li style={styles.navItem}><Link to="/" style={styles.navLink}>Dashboard</Link></li>
          <li style={styles.navItem}><Link to="/profile" style={styles.navLink}>Profile</Link></li>
          <li style={styles.navItem}><Link to="/hosts" style={styles.navLink}>Hosts</Link></li>
          <li style={styles.navItem}><Link to="/hostgroups" style={styles.navLink}>Host Groups</Link></li>
          <li style={styles.navItem}><Link to="/playbooks" style={styles.navLink}>Playbooks</Link></li>
          <li style={styles.navItem}><Link to="/tasks" style={styles.navLink}>Task Executions</Link></li>
        </ul>
      </nav>
    </aside>
  );
};

const MainLayout: React.FC = () => {
  return (
    <div style={styles.layout}>
      <Header />
      <div style={styles.mainContainer}>
        <Sidebar />
        <main style={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
