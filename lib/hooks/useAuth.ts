import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import authService from '../services/authService';
import { RootState } from '../store/store';
import { updateActivity } from '../store/slices/authSlice';
import { toast } from 'sonner';

export function useAuth() {
  const dispatch = useDispatch();
  const router = useRouter();
  const [isInitialized, setIsInitialized] = useState(false);
  const authState = useSelector((state: RootState) => state.auth);
  
  // Initialize auth service
  useEffect(() => {
    if (!isInitialized) {
      authService.initialize();
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // Set up activity tracking
  useEffect(() => {
    if (!authState.isAuthenticated) return;

    const updateUserActivity = () => {
      dispatch(updateActivity());
    };

    // Add event listeners for user activity
    const events = ['mousedown', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, updateUserActivity);
    });

    // Clean up event listeners
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateUserActivity);
      });
    };
  }, [authState.isAuthenticated, dispatch]);

  // Check session expiration
  useEffect(() => {
    if (!authState.isAuthenticated || !authState.expiresAt) return;

    const checkSessionExpiry = () => {
      const now = Date.now();
      
      // If session is expired, log out
      if (authState.expiresAt && now >= authState.expiresAt) {
        handleLogout();
        toast.error('Your session has expired. Please log in again.');
      }
    };

    // Check session expiry every minute
    const interval = setInterval(checkSessionExpiry, 60 * 1000);
    
    // Also check immediately
    checkSessionExpiry();

    return () => clearInterval(interval);
  }, [authState.isAuthenticated, authState.expiresAt]);

  // Check for inactivity timeout
  useEffect(() => {
    if (!authState.isAuthenticated || !authState.lastActivity) return;

    const checkInactivity = () => {
      const now = Date.now();
      const inactiveTime = now - (authState.lastActivity || 0);
      const maxInactiveTime = 30 * 60 * 1000; // 30 minutes
      
      if (inactiveTime >= maxInactiveTime) {
        handleLogout();
        toast.error('You have been logged out due to inactivity.');
      }
    };

    const interval = setInterval(checkInactivity, 60 * 1000);
    
    return () => clearInterval(interval);
  }, [authState.isAuthenticated, authState.lastActivity]);

  // Login function
  const handleLogin = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await authService.signInWithPassword(email, password);
      
      if (error) throw error;
      
      return { success: true, data };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Failed to login' 
      };
    }
  }, []);

  // Logout function
  const handleLogout = useCallback(async () => {
    try {
      await authService.signOut();
      router.push('/login');
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Failed to logout' 
      };
    }
  }, [router]);

  // Check if user is authenticated
  const isAuthenticated = useCallback(() => {
    return authService.isAuthenticated();
  }, []);

  return {
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    login: handleLogin,
    logout: handleLogout,
    checkAuth: isAuthenticated
  };
}
