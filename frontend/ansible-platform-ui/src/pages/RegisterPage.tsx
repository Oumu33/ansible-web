import React from 'react';
import RegistrationForm from '../components/auth/RegistrationForm';
import { Link } from 'react-router-dom';

const RegisterPage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <RegistrationForm />
      <p style={{ marginTop: '20px' }}>
        Already have an account? <Link to="/login">Login here</Link>
      </p>
    </div>
  );
};

export default RegisterPage;
