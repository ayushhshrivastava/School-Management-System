import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError';
import { ApiErrorResponse } from '../../types';
import { logger } from '../logger/logger';
import { config } from '../../config';

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  const timestamp = new Date().toISOString();

  // 1. Handled Application Errors
  if (err instanceof AppError) {
    const response: ApiErrorResponse = {
      success: false,
      statusCode: err.statusCode,
      message: err.message,
      errorCode: err.errorCode,
      errors: err.errors,
      stack: config.NODE_ENV === 'development' ? err.stack : undefined,
      timestamp,
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // 2. Zod Request Validation Errors
  if (err instanceof ZodError) {
    const errors: Record<string, string[]> = {};
    err.errors.forEach((issue) => {
      const field = issue.path.join('.') || 'general';
      if (!errors[field]) errors[field] = [];
      errors[field].push(issue.message);
    });

    const response: ApiErrorResponse = {
      success: false,
      statusCode: 422,
      message: 'Request validation failed',
      errorCode: 'VALIDATION_ERROR',
      errors,
      stack: config.NODE_ENV === 'development' ? err.stack : undefined,
      timestamp,
    };
    res.status(422).json(response);
    return;
  }

  // 3. Unhandled Server Errors
  logger.error('Unhandled Exception: %s', err.message, { stack: err.stack, path: req.path });

  const response: ApiErrorResponse = {
    success: false,
    statusCode: 500,
    message: config.NODE_ENV === 'production' ? 'Internal server error occurred' : err.message,
    errorCode: 'INTERNAL_SERVER_ERROR',
    stack: config.NODE_ENV === 'development' ? err.stack : undefined,
    timestamp,
  };

  res.status(500).json(response);
}
