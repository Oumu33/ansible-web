import create from 'zustand';
import { getCurrentUser, User } from '../services/authService'; // Import User interface

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  checkAuthStatus: () => Promise<void>;
  loginUser: (userData: User) => void; // Called after successful login API call
  logoutUser: () => void; // Called after successful logout API call
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start with loading true to check auth status on init
  error: null,

  checkAuthStatus: async () => {
    set({ isLoading: true, error: null });
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken) {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          set({ user: currentUser, isAuthenticated: true, isLoading: false });
        } else {
          // Token might be invalid or expired
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch (err: any) {
      console.error("Auth check failed:", err);
      set({ user: null, isAuthenticated: false, isLoading: false, error: err.message || 'Authentication check failed' });
    }
  },

  loginUser: (userData: User) => {
    set({ user: userData, isAuthenticated: true, error: null, isLoading: false });
  },

  logoutUser: () => {
    // authService.logout() should have already cleared tokens
    set({ user: null, isAuthenticated: false, error: null, isLoading: false });
  }
}));

// Initialize auth status check when store is created/app loads
// This ensures that if a token exists from a previous session, user state is restored.
useAuthStore.getState().checkAuthStatus();
