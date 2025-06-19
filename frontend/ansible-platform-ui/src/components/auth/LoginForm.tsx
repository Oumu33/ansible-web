import React, { useState } from 'react';
import { login, getCurrentUser } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom'; // For redirection

interface LoginFormProps {
  onLoginSuccess?: () => void; // Optional callback
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const loginUserToStore = useAuthStore((state) => state.loginUser);
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await login({ username, password });
      // Fetch user details to populate store, or login service could return user
      const currentUser = await getCurrentUser();
      if (currentUser) {
        loginUserToStore(currentUser);
        if (onLoginSuccess) onLoginSuccess();
        navigate('/'); // Redirect to dashboard or home page
      } else {
        setError('Login successful, but failed to fetch user details.');
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      setError(err.response?.data?.detail || err.message || 'An error occurred during login.');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px', padding: '20px', border: '1px solid #ccc', borderRadius: '5px' }}>
      <h2>Login</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div>
        <label htmlFor="username">Username:</label>
        <input
          type="text"
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          style={{ width: '100%', padding: '8px', boxSizing: 'border-box', marginTop: '5px' }}
        />
      </div>
      <div>
        <label htmlFor="password">Password:</label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: '100%', padding: '8px', boxSizing: 'border-box', marginTop: '5px' }}
        />
      </div>
      <button type="submit" style={{ padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '3px', marginTop: '10px' }}>Login</button>
    </form>
  );
};

export default LoginForm;
