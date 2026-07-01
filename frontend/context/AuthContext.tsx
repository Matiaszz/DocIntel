'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchClient, setAccessToken, ApiError } from '../lib/api';
import { getErrorMessage } from '../lib/errorMessages';
import {
  UserResponse,
  LoginResponse,
  TokenResponse,
  LoginRequest,
  RegisterRequest
} from '../types/api';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (firstName: string, lastName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  updateUser: (firstName: string, lastName: string, email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // Fetch the current user profile using the access token
  const fetchUserProfile = useCallback(async () => {
    try {
      const userData = await fetchClient.internal.user<UserResponse>('/me');
      setUser(userData);
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      // If fetching user profile fails, we might have an invalid token
      setUser(null);
      setAccessToken(null);
    }
  }, []);

  // Attempt silent refresh on mount
  const initAuth = useCallback(async () => {
    try {
      // Call refresh endpoint to see if a valid refreshToken cookie exists
      const refreshResponse = await fetchClient.internal.auth<TokenResponse>('/refresh', {
        method: 'POST'
      });
      
      if (refreshResponse && refreshResponse.accessToken) {
        setAccessToken(refreshResponse.accessToken);
        await fetchUserProfile();
      }
    } catch (err) {
      // Silence error during initialization since it just means the user is not logged in
      console.log('No active session found.');
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserProfile]);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Login handler
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchClient.internal.auth<LoginResponse, LoginRequest>('/login', {
        method: 'POST',
        body: { email, password },
      });

      if (response && response.accessToken) {
        setAccessToken(response.accessToken);
        if (response.user) {
          setUser(response.user);
        } else {
          await fetchUserProfile();
        }
      } else {
        throw new Error('A resposta de autenticação não contém o token de acesso');
      }
    } catch (err) {
      let message = 'Falha ao entrar';
      if (err instanceof ApiError && err.response?.code) {
        message = getErrorMessage(err.response.code);
      } else if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserProfile]);

  // Register handler
  const register = useCallback(async (firstName: string, lastName: string, email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Register the user
      await fetchClient.internal.auth<UserResponse, RegisterRequest>('/register', {
        method: 'POST',
        body: { firstName, lastName, email, password },
      });

      // 2. Automatically log in after registration
      await login(email, password);
    } catch (err) {
      let message = 'Falha ao registrar';
      if (err instanceof ApiError && err.response?.code) {
        message = getErrorMessage(err.response.code);
      } else if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [login]);

  // Logout handler
  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await fetchClient.internal.auth<void>('/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error on server:', err);
    } finally {
      setAccessToken(null);
      setUser(null);
      setError(null);
      setIsLoading(false);
    }
  }, []);

  // Update user handler
  const updateUser = useCallback(async (firstName: string, lastName: string, email: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const updatedUser = await fetchClient.internal.user<User>('/me', {
        method: 'PUT',
        body: { firstName, lastName, email }
      });
      if (updatedUser) {
        setUser(updatedUser);
      }
    } catch (err) {
      let message = 'Falha ao atualizar dados';
      if (err instanceof ApiError && err.response?.code) {
        message = getErrorMessage(err.response.code);
      } else if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
