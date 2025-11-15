import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { User } from '../types';
import { apiClient } from '../lib/api';

interface SignupPayload {
  fullName: string;
  email: string;
  password: string;
  phoneNumber: string;
}

interface CompleteResetPayload {
  token: string;
  email: string;
  password: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (payload: SignupPayload) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  requestPasswordReset: (email: string) => Promise<boolean>;
  completePasswordReset: (payload: CompleteResetPayload) => Promise<boolean>;
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

  const buildUserFromResponse = (rawData: unknown, fallback: { email: string }): User => {
    const data = rawData as
      | {
          _id?: string;
          id?: string;
          email?: string;
          name?: string;
          fullName?: string;
          role?: string;
          phoneNumber?: string;
        }
      | undefined;

    return {
      id: data?._id ?? data?.id ?? fallback.email,
      email: data?.email ?? fallback.email,
      name: data?.name ?? data?.fullName ?? 'Super Admin',
      role: data?.role === 'admin' ? 'admin' : 'super_admin',
      phoneNumber: data?.phoneNumber,
    };
  };

  const persistSession = (authenticatedUser: User, authToken: string) => {
    setUser(authenticatedUser);
    setToken(authToken);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('user', JSON.stringify(authenticatedUser));
        window.localStorage.setItem('authToken', authToken);
      }
    } catch (storageError) {
      console.warn('Failed to persist auth session', storageError);
    }
  };

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
      const response = await apiClient.post('/auth/login', { email, password });
      const { data, token: apiToken } = response.data ?? {};

      if (!apiToken) {
        throw new Error('Authentication token missing in response');
      }

      const authenticatedUser = buildUserFromResponse(data, { email });

      persistSession(authenticatedUser, apiToken);
      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          return false;
        }
        const message =
          (error.response?.data as { message?: string })?.message || 'Failed to log in';
        throw new Error(message);
      }
      throw new Error('Failed to log in');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('user');
      window.localStorage.removeItem('authToken');
    }
  };

  const signup = async (payload: SignupPayload): Promise<boolean> => {
    try {
      const response = await apiClient.post('/auth/signup', payload);
      const { data, token: apiToken } = response.data ?? {};

      if (!apiToken) {
        throw new Error('Authentication token missing in response');
      }

      const registeredUser = buildUserFromResponse(data, { email: payload.email });
      persistSession(registeredUser, apiToken);
      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          (error.response?.data as { message?: string })?.message || 'Failed to sign up';
        throw new Error(message);
      }
      throw new Error('Failed to sign up');
    }
  };

  const requestPasswordReset = async (email: string): Promise<boolean> => {
    try {
      await apiClient.post('/auth/forgot-password', { email });
      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          (error.response?.data as { message?: string })?.message ||
          'Failed to send password reset email';
        throw new Error(message);
      }
      throw new Error('Failed to send password reset email');
    }
  };

  const completePasswordReset = async (
    payload: CompleteResetPayload
  ): Promise<boolean> => {
    try {
      const response = await apiClient.post('/auth/reset-password', payload);
      const { data, token: apiToken } = response.data ?? {};

      if (!apiToken) {
        throw new Error('Authentication token missing in response');
      }

      const resetUser = buildUserFromResponse(data, { email: payload.email });
      persistSession(resetUser, apiToken);
      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          (error.response?.data as { message?: string })?.message ||
          'Failed to reset password';
        throw new Error(message);
      }
      throw new Error('Failed to reset password');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        signup,
        logout,
        isAuthenticated: !!user && !!token,
        requestPasswordReset,
        completePasswordReset,
        isInitialized,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
