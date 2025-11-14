import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { User } from '../types';
import { apiClient } from '../lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  resetPassword: (email: string) => Promise<boolean>;
  isInitialized: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsInitialized(true);
      return;
    }

    try {
      const storedUser = window.localStorage.getItem('user');
      const storedToken = window.localStorage.getItem('authToken');

      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (error) {
          console.warn('Failed to parse stored user', error);
          window.localStorage.removeItem('user');
        }
      }

      if (storedToken) {
        setToken(storedToken);
      }
    } catch (error) {
      console.error('Failed to restore auth session', error);
      try {
        window.localStorage.removeItem('user');
        window.localStorage.removeItem('authToken');
      } catch (cleanupError) {
        console.warn('Failed to clear stored auth data', cleanupError);
      }
      setUser(null);
      setToken(null);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await apiClient.post('/auth/signin', { email, password });
      const { data, token: apiToken } = response.data ?? {};

      if (!apiToken) {
        throw new Error('Authentication token missing in response');
      }

      const authenticatedUser: User = {
        id: data?._id ?? data?.id ?? 'admin',
        email: data?.email ?? email,
        name: data?.name ?? 'Super Admin',
        role: data?.role === 'admin' ? 'admin' : 'super_admin',
      };

      setUser(authenticatedUser);
      setToken(apiToken);
      localStorage.setItem('user', JSON.stringify(authenticatedUser));
      localStorage.setItem('authToken', apiToken);
      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          return false;
        }
        const message =
          (error.response?.data as { message?: string })?.message || 'Failed to sign in';
        throw new Error(message);
      }
      throw new Error('Failed to sign in');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    // Mock reset password
    console.log('Password reset requested for:', email);
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!user && !!token,
        resetPassword,
        isInitialized,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
