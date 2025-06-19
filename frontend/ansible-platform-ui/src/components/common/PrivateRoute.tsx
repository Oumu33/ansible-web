import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface PrivateRouteProps {
  // We can add role-based access control here later if needed
  // allowedRoles?: string[];
}

const PrivateRoute: React.FC<PrivateRouteProps> = (/*{ allowedRoles }*/) => {
  const { isAuthenticated, isLoading } = useAuthStore((state) => ({
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
  }));
  const location = useLocation();

  if (isLoading) {
    // Show a loading spinner or a blank page while checking auth status
    // This prevents flashing the login page for authenticated users on refresh
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
  }

  if (!isAuthenticated) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to so we can send them along after they login.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // TODO: Role-based access control can be implemented here if  is provided
  // const userRole = useAuthStore.getState().user?.profile?.role;
  // if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
  //   // Redirect to an unauthorized page or home
  //   return <Navigate to="/unauthorized" replace />;
  // }

  return <Outlet />; // Render child route elements
};

export default PrivateRoute;
