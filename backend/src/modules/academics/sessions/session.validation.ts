import { z } from 'zod';

export const createSessionSchema = z.object({
  name: z
    .string()
    .min(4, 'Session name must be at least 4 characters (e.g. 2026-2027)')
    .max(50, 'Session name cannot exceed 50 characters')
    .trim(),
  code: z
    .string()
    .min(3, 'Session code must be at least 3 characters (e.g. AY-2026-27)')
    .max(20, 'Session code cannot exceed 20 characters')
    .trim(),
  startDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Valid startDate is required (ISO 8601)' }),
  endDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Valid endDate is required (ISO 8601)' }),
  isCurrent: z.boolean().optional().default(false),
  description: z.string().max(255).optional().nullable(),
}).refine(
  (data) => new Date(data.startDate) < new Date(data.endDate),
  {
    message: 'Start date must be chronologically earlier than end date',
    path: ['startDate'],
  }
);

export const updateSessionSchema = z.object({
  name: z.string().min(4).max(50).trim().optional(),
  code: z.string().min(3).max(20).trim().optional(),
  startDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Valid startDate is required (ISO 8601)' })
    .optional(),
  endDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Valid endDate is required (ISO 8601)' })
    .optional(),
  description: z.string().max(255).optional().nullable(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) < new Date(data.endDate);
    }
    return true;
  },
  {
    message: 'Start date must be chronologically earlier than end date',
    path: ['startDate'],
  }
);

export const sessionQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().optional(),
  isCurrent: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
  isLocked: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
});
