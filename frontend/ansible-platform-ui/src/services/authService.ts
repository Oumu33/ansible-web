import axios from 'axios';
import { API_BASE_URL } from '../config/apiConfig';

const AUTH_API_URL = `${API_BASE_URL}/auth`;

interface TokenResponse {
  access: string;
  refresh: string;
}

export interface User { // Export User interface for use in store and components
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  profile: {
    role: string;
  };
}

// Login
export const login = async (credentials: any): Promise<TokenResponse> => {
  const response = await axios.post(`${AUTH_API_URL}/login/`, credentials);
  if (response.data.access && response.data.refresh) {
    localStorage.setItem('accessToken', response.data.access);
    localStorage.setItem('refreshToken', response.data.refresh);
  }
  return response.data;
};

// Register
export const register = async (userData: any): Promise<User> => {
  const response = await axios.post(`${AUTH_API_URL}/register/`, userData);
  return response.data;
};

// Logout
export const logout = async (): Promise<void> => {
  const refreshToken = localStorage.getItem('refreshToken');
  if (refreshToken) {
    try {
      // Notify backend to blacklist the refresh token
      await axios.post(`${AUTH_API_URL}/logout/`, { refresh: refreshToken }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
    } catch (error) {
      console.error('Logout failed on backend:', error);
      // Still proceed to clear local tokens
    }
  }
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  // Potentially notify other parts of the app (e.g. via store)
};

// Get Current User
export const getCurrentUser = async (): Promise<User | null> => {
  const accessToken = localStorage.getItem('accessToken');
  if (!accessToken) {
    return null;
  }
  try {
    const response = await axios.get(`${AUTH_API_URL}/user/`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch current user:', error);
    // Possible token expiry, might need to handle token refresh here or in an interceptor
    return null;
  }
};

// TODO: Implement token refresh logic using an Axios interceptor
// This interceptor would catch 401 errors, try to refresh the token,
// and then retry the original request.
