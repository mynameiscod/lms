import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  token: string | null;
  login: (email: string, password: string, tenantId?: string) => Promise<void>;
  register: (firstName: string, lastName: string, email: string, password: string, tenantId: string) => Promise<void>;
  logout: (message?: string) => void;
  setUser: (user: User | null) => void;
  updateProfile: (updates: Partial<User>) => void;
  /** Refresh JWT — returns new token or throws */
  refreshAuthToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Track if a refresh is in-flight to avoid concurrent refreshes
  const refreshingRef = useRef(false);

  // Initialize from localStorage and validate user still exists
  useEffect(() => {
    const initializeAuth = async () => {
      const savedUser = localStorage.getItem('user');
      const savedToken = localStorage.getItem('token');
      
      if (savedUser && savedToken) {
        try {
          const parsedUser = JSON.parse(savedUser);
          
          // Validate user still exists and is active
          try {
            const API_URL = process.env.REACT_APP_API_URL || '/api/v1';
            const response = await fetch(`${API_URL}/users/${parsedUser._id}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${savedToken}`,
                'X-Tenant-Id': parsedUser.tenantId,
                'Content-Type': 'application/json'
              }
            });
            
            // ONLY 401 means "this session is no longer valid".
            //
            // This used to treat EVERY non-OK response as "user no longer exists"
            // and wipe the session. That is wrong for 403 (allowed to be logged
            // in, not allowed to read this endpoint), 404 (routing change), and
            // every 5xx or network blip. Because the CareerPilot join finishes
            // with a full page reload, this ran on the very first paint after a
            // successful OTP — so one non-401 response bounced a brand-new member
            // straight to /login with no error shown.
            if (!response.ok) {
              if (response.status === 401) {
                localStorage.removeItem('user');
                localStorage.removeItem('token');
                localStorage.removeItem('tenantId');
                setUser(null);
                setToken(null);
                setLoading(false);
                return;
              }
              // Anything else: keep the session we were given and carry on. If the
              // token really is dead, the next API call returns 401 and the shared
              // handler logs them out properly.
              console.warn(`[auth] validation returned ${response.status}; keeping session`);
              setUser(parsedUser);
              setToken(savedToken);
              setLoading(false);
              return;
            }

            const userData = await response.json();
            // Deactivated is a real logout — but only when the server actually
            // told us so. A missing field is not proof of deactivation.
            if (userData.data && userData.data.isActive === false) {
              localStorage.removeItem('user');
              localStorage.removeItem('token');
              localStorage.removeItem('tenantId');
              setUser(null);
              setToken(null);
              setLoading(false);
              return;
            }
            
            // Use fresh data from API, update localStorage. A 200 with no payload
            // is not a reason to log anyone out — fall back to the stored user.
            const freshUser = userData.data;
            if (!freshUser) {
              console.warn('[auth] validation returned no user payload; keeping session');
              setUser(parsedUser);
              setToken(savedToken);
              setLoading(false);
              return;
            }

            // Fetch effective permissions
            try {
              const permResponse = await fetch(`${API_URL}/users/me/permissions`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${savedToken}`,
                  'X-Tenant-Id': freshUser.tenantId,
                  'Content-Type': 'application/json'
                }
              });
              if (permResponse.ok) {
                const permData = await permResponse.json();
                freshUser.permissions = permData.data?.permissions || [];
              }
            } catch (permError) {
              console.error('Failed to fetch permissions:', permError);
            }

            localStorage.setItem('user', JSON.stringify(freshUser));
            setUser(freshUser);
            setToken(savedToken);
          } catch (validationError) {
            console.error('Failed to validate user:', validationError);
            // If validation fails, still load the user but they might get logged out on next action
            setUser(parsedUser);
            setToken(savedToken);
          }
        } catch (error) {
          console.error('Failed to parse stored user:', error);
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          localStorage.removeItem('tenantId');
        }
      }
      setLoading(false);
    };
    
    initializeAuth();
  }, []);

  const login = async (email: string, password: string, tenantId?: string) => {
    try {
      const API_URL = process.env.REACT_APP_API_URL || '/api/v1';
      const body: any = { email, password };
      if (tenantId) {
        body.tenantId = tenantId;
      }

      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();
      
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      localStorage.setItem('tenantId', data.data.user.tenantId);
      
      setToken(data.data.token);
      setUser(data.data.user);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    tenantId: string
  ) => {
    try {
      const API_URL = process.env.REACT_APP_API_URL || '/api/v1';
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, password, tenantId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }

      const data = await response.json();
      
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      localStorage.setItem('tenantId', tenantId);
      
      setToken(data.data.token);
      setUser(data.data.user);
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  };

  const logout = useCallback((message?: string) => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tenantId');
    if (message) {
      localStorage.setItem('loginMessage', message);
    }
    setToken(null);
    setUser(null);
  }, []);

  // Refresh token using the current valid JWT
  const refreshAuthToken = useCallback(async (): Promise<string> => {
    if (refreshingRef.current) {
      // Wait briefly and return whatever token is now stored
      await new Promise(r => setTimeout(r, 300));
      const stored = localStorage.getItem('token');
      if (stored) return stored;
      throw new Error('Token refresh already in progress');
    }
    refreshingRef.current = true;
    try {
      const currentToken = localStorage.getItem('token');
      if (!currentToken) throw new Error('No token to refresh');
      const API_URL = process.env.REACT_APP_API_URL || '/api/v1';
      const response = await fetch(`${API_URL}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentToken}` }
      });
      if (!response.ok) {
        logout('Your session has expired. Please log in again.');
        throw new Error('Token refresh failed');
      }
      const data = await response.json();
      const newToken: string = data.data.token;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      return newToken;
    } finally {
      refreshingRef.current = false;
    }
  }, [logout]);

  // Global 401 interceptor: override fetch to auto-logout on 401
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.status === 401) {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
        // Don't intercept the login/register/forgot-password/setup-password/refresh endpoints themselves
        const isAuthEndpoint = /\/(login|register|register-organization|forgot-password|reset-password|setup-password|refresh-token)/.test(url);
        if (!isAuthEndpoint) {
          logout('Your session has expired. Please log in again.');
        }
      }
      return response;
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, [logout]);

  const updateProfile = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    token,
    login,
    register,
    logout,
    setUser,
    updateProfile,
    refreshAuthToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};