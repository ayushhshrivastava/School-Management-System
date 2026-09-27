import { Request } from 'express';

// Standardized API success response
export interface ApiResponse<T = any> {
  success: true;
  message?: string;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    academicSessionId?: string;
  };
  timestamp: string;
}

// Standardized API error response
export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  errorCode: string;
  errors?: Record<string, string[]>;
  stack?: string;
  timestamp: string;
}

// Authenticated User Context (for future Auth Step 2)
export interface AuthUserContext {
  id: string;
  username: string;
  email: string;
  schoolId: string;
  roles: string[];
  permissions: string[];
  isSuperAdmin: boolean;
}

// Academic Session Context
export interface SessionContext {
  id: string;
  code: string;
  name: string;
  isCurrent: boolean;
  isLocked: boolean;
}

// Extended Express Request
export interface AuthenticatedRequest extends Request {
  user?: AuthUserContext;
  academicSession?: SessionContext;
  correlationId?: string;
}

// Pagination parameters
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
