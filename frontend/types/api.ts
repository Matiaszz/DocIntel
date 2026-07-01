export interface ApiErrorResponse {
  status: number;
  error: string;
  code?: string;
  message: string;
  path: string;
  timestamp: string;
}

export interface RequestOptions<TBody = unknown> {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';
  body?: TBody;
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
}

// User DTO
export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

// Auth Request DTOs
export interface LoginRequest {
  email: string;
  password?: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
}

// Auth Response DTOs
export interface LoginResponse {
  accessToken: string;
  user: UserResponse;
}

export interface TokenResponse {
  accessToken: string;
}
