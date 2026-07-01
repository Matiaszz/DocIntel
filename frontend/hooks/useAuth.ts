import { useAuth as useAuthContext } from '../context/AuthContext';

/**
 * Custom hook to access authentication context.
 * Exposes: user, isAuthenticated, isLoading, error, login, register, logout, clearError.
 */
export function useAuth() {
  return useAuthContext();
}
