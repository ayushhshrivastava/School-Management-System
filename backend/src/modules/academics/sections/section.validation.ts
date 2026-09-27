import { z } from 'zod';

export const createSectionSchema = z.object({
  classId: z.string().uuid('Valid class UUID is required'),
  name: z
    .string()
    .min(1, 'Section name is required (e.g. A, B, Rose)')
    .max(50, 'Section name cannot exceed 50 characters')
    .trim(),
  code: z
    .string()
    .min(1, 'Section code is required (e.g. A, B)')
    .max(20, 'Section code cannot exceed 20 characters')
    .trim(),
  capacity: z.coerce.number().int().positive().optional().default(40),
  displayOrder: z.coerce.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const updateSectionSchema = z.object({
  name: z.string().min(1).max(50).trim().optional(),
  code: z.string().min(1).max(20).trim().optional(),
  capacity: z.coerce.number().int().positive().optional(),
  displayOrder: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const toggleSectionStatusSchema = z.object({
  isActive: z.boolean(),
});

export const sectionQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  classId: z.string().uuid().optional(),
  search: z.string().optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
});
