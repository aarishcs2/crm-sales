import { supabase } from "../supabaseClient";
import { store } from "../store/store";
import { logout, signin } from "../store/slices/authSlice";

// Constants for session management
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const SESSION_CHECK_INTERVAL_MS = 60 * 1000; // Check every minute
const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // Refresh token 5 minutes before expiry

// Interface for session data
interface SessionData {
  user: any;
  session: any;
  expiresAt: number;
  lastActivity: number;
}

class AuthService {
  private sessionCheckInterval: NodeJS.Timeout | null = null;
  private currentSession: SessionData | null = null;
  private isRefreshing = false;

  /**
   * Initialize the auth service
   */
  public initialize(): void {
    // Start session monitoring
    this.startSessionMonitoring();

    // Set up auth state change listener
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        this.handleSignIn(session);
      } else if (event === 'SIGNED_OUT') {
        this.handleSignOut();
      } else if (event === 'TOKEN_REFRESHED' && session) {
        this.updateSession(session);
      }
    });

    // Check for existing session on initialization
    this.checkExistingSession();
  }

  /**
   * Check if there's an existing session and initialize it
   */
  private async checkExistingSession(): Promise<void> {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        this.handleSignIn(data.session);
      }
    } catch (error) {
      console.error('Error checking existing session:', error);
    }
  }

  /**
   * Handle user sign in
   */
  private handleSignIn(session: any): void {
    if (!session) return;

    // Calculate expiry time
    const expiresAt = new Date(session.expires_at).getTime();
    
    // Store session data
    this.currentSession = {
      user: session.user,
      session,
      expiresAt,
      lastActivity: Date.now()
    };

    // Update Redux store
    store.dispatch(
      signin({
        token: session.access_token,
        user: {
          id: session.user.id,
          email: session.user.email,
          role: session.user.role || 'user'
        },
        session: session.refresh_token
      })
    );

    // Start monitoring session
    this.startSessionMonitoring();
  }

  /**
   * Handle user sign out
   */
  private handleSignOut(): void {
    // Clear session data
    this.currentSession = null;

    // Update Redux store
    store.dispatch(logout());

    // Stop monitoring session
    this.stopSessionMonitoring();
  }

  /**
   * Update the current session data
   */
  private updateSession(session: any): void {
    if (!session || !this.currentSession) return;

    const expiresAt = new Date(session.expires_at).getTime();
    
    this.currentSession = {
      ...this.currentSession,
      session,
      expiresAt,
      lastActivity: Date.now()
    };
  }

  /**
   * Start monitoring the session for expiry and inactivity
   */
  private startSessionMonitoring(): void {
    // Clear any existing interval
    this.stopSessionMonitoring();

    // Set up new interval
    this.sessionCheckInterval = setInterval(() => {
      this.checkSession();
    }, SESSION_CHECK_INTERVAL_MS);

    // Add activity listeners
    this.addActivityListeners();
  }

  /**
   * Stop monitoring the session
   */
  private stopSessionMonitoring(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }

    // Remove activity listeners
    this.removeActivityListeners();
  }

  /**
   * Add listeners for user activity
   */
  private addActivityListeners(): void {
    if (typeof window !== 'undefined') {
      ['mousedown', 'keypress', 'scroll', 'touchstart'].forEach(event => {
        window.addEventListener(event, this.updateActivity);
      });
    }
  }

  /**
   * Remove activity listeners
   */
  private removeActivityListeners(): void {
    if (typeof window !== 'undefined') {
      ['mousedown', 'keypress', 'scroll', 'touchstart'].forEach(event => {
        window.removeEventListener(event, this.updateActivity);
      });
    }
  }

  /**
   * Update the last activity timestamp
   */
  private updateActivity = (): void => {
    if (this.currentSession) {
      this.currentSession.lastActivity = Date.now();
    }
  }

  /**
   * Check the current session status
   */
  private async checkSession(): Promise<void> {
    if (!this.currentSession) return;

    const now = Date.now();
    const { expiresAt, lastActivity } = this.currentSession;

    // Check for session expiry
    if (now >= expiresAt) {
      console.log('Session expired, logging out');
      await this.signOut();
      return;
    }

    // Check for inactivity timeout
    if (now - lastActivity >= SESSION_TIMEOUT_MS) {
      console.log('Session inactive, logging out');
      await this.signOut();
      return;
    }

    // Check if token needs refreshing
    if (expiresAt - now <= TOKEN_REFRESH_THRESHOLD_MS && !this.isRefreshing) {
      this.refreshToken();
    }
  }

  /**
   * Refresh the auth token
   */
  private async refreshToken(): Promise<void> {
    if (this.isRefreshing) return;

    try {
      this.isRefreshing = true;
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Error refreshing token:', error);
        // If refresh fails, sign out
        await this.signOut();
      } else if (data && data.session) {
        this.updateSession(data.session);
      }
    } catch (error) {
      console.error('Error during token refresh:', error);
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Sign in with email and password
   */
  public async signInWithPassword(email: string, password: string): Promise<any> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  }

  /**
   * Sign out the current user
   */
  public async signOut(): Promise<any> {
    try {
      const { error } = await supabase.auth.signOut();
      
      // Always clear local session state, even if API call fails
      this.handleSignOut();
      
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  }

  /**
   * Get the current session
   */
  public async getSession(): Promise<any> {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  }

  /**
   * Get the current user
   */
  public async getUser(): Promise<any> {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  }

  /**
   * Check if the user is authenticated
   */
  public isAuthenticated(): boolean {
    return !!this.currentSession && this.currentSession.expiresAt > Date.now();
  }

  /**
   * Get the current user's ID
   */
  public getUserId(): string | null {
    return this.currentSession?.user?.id || null;
  }
}

// Create a singleton instance
const authService = new AuthService();

export default authService;
