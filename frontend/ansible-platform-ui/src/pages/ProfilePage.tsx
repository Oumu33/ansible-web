import React from 'react';
import { useAuthStore } from '../store/authStore';
import { Navigate } from 'react-router-dom';

const ProfilePage: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <div>Loading user profile...</div>;
  }

  if (!isAuthenticated || !user) {
    // This page should be protected by PrivateRoute, but as a fallback:
    return <Navigate to="/login" replace />;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>User Profile</h2>
      <p><strong>Username:</strong> {user.username}</p>
      <p><strong>Email:</strong> {user.email}</p>
      <p><strong>First Name:</strong> {user.first_name || 'N/A'}</p>
      <p><strong>Last Name:</strong> {user.last_name || 'N/A'}</p>
      <p><strong>Role:</strong> {user.profile?.role || 'N/A'}</p>
      {/* Add more profile details or edit functionality later */}
    </div>
  );
};

export default ProfilePage;
