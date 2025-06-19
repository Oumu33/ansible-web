import React, { useState } from 'react';
import { register } from '../../services/authService';
import { useNavigate } from 'react-router-dom';

const RegistrationForm: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    if (password !== password2) {
      setError("Passwords do not match.");
      return;
    }
    try {
      await register({ username, email, password, password2, first_name: firstName, last_name: lastName });
      setSuccess('Registration successful! You can now log in.');
      // Optionally redirect to login page after a delay or prompt user
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      console.error('Registration failed:', err.response?.data);
      if (err.response?.data) {
        // Handle specific error messages from backend if available
        const errors = err.response.data;
        let errorMessages = [];
        for (const key in errors) {
          errorMessages.push(`${key}: ${errors[key].join ? errors[key].join(', ') : errors[key]}`);
        }
        setError(errorMessages.join('; '));
      } else {
        setError(err.message || 'An error occurred during registration.');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '400px', padding: '20px', border: '1px solid #ccc', borderRadius: '5px' }}>
      <h2>Register</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}
      <div>
        <label htmlFor="reg_username">Username:</label>
        <input type="text" id="reg_username" value={username} onChange={(e) => setUsername(e.target.value)} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box', marginTop: '5px' }}/>
      </div>
      <div>
        <label htmlFor="reg_email">Email:</label>
        <input type="email" id="reg_email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box', marginTop: '5px' }}/>
      </div>
      <div>
        <label htmlFor="reg_password">Password:</label>
        <input type="password" id="reg_password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box', marginTop: '5px' }}/>
      </div>
      <div>
        <label htmlFor="reg_password2">Confirm Password:</label>
        <input type="password" id="reg_password2" value={password2} onChange={(e) => setPassword2(e.target.value)} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box', marginTop: '5px' }}/>
      </div>
       <div>
        <label htmlFor="reg_firstName">First Name (Optional):</label>
        <input type="text" id="reg_firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={{ width: '100%', padding: '8px', boxSizing: 'border-box', marginTop: '5px' }}/>
      </div>
       <div>
        <label htmlFor="reg_lastName">Last Name (Optional):</label>
        <input type="text" id="reg_lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} style={{ width: '100%', padding: '8px', boxSizing: 'border-box', marginTop: '5px' }}/>
      </div>
      <button type="submit" style={{ padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '3px', marginTop: '10px' }}>Register</button>
    </form>
  );
};
export default RegistrationForm;
