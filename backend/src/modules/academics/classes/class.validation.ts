import { z } from 'zod';

export const createClassSchema = z.object({
  name: z
    .string()
    .min(1, 'Class name is required (e.g. Class 1, Nursery)')
    .max(50, 'Class name cannot exceed 50 characters')
    .trim(),
  code: z
    .string()
    .min(1, 'Class code is required (e.g. CLS-01, NUR)')
    .max(20, 'Class code cannot exceed 20 characters')
    .trim(),
  displayOrder: z.coerce.number().int().optional().default(0),
  description: z.string().max(255).optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const updateClassSchema = z.object({
  name: z.string().min(1).max(50).trim().optional(),
  code: z.string().min(1).max(20).trim().optional(),
  displayOrder: z.coerce.number().int().optional(),
  description: z.string().max(255).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const toggleStatusSchema = z.object({
  isActive: z.boolean(),
});

export const classQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  search: z.string().optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
});
