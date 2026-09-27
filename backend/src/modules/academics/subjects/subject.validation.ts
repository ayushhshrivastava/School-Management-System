import { z } from 'zod';

export const createSubjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Subject name is required (e.g. Mathematics, English)')
    .max(100, 'Subject name cannot exceed 100 characters')
    .trim(),
  code: z
    .string()
    .min(1, 'Subject code is required (e.g. MATH, ENG)')
    .max(20, 'Subject code cannot exceed 20 characters')
    .trim(),
  type: z
    .enum(['THEORY', 'PRACTICAL', 'BOTH', 'CO_CURRICULAR'])
    .optional()
    .default('THEORY'),
  displayOrder: z.coerce.number().int().optional().default(0),
  description: z.string().max(255).optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const updateSubjectSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  code: z.string().min(1).max(20).trim().optional(),
  type: z.enum(['THEORY', 'PRACTICAL', 'BOTH', 'CO_CURRICULAR']).optional(),
  displayOrder: z.coerce.number().int().optional(),
  description: z.string().max(255).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const toggleSubjectStatusSchema = z.object({
  isActive: z.boolean(),
});

export const subjectQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  type: z.enum(['THEORY', 'PRACTICAL', 'BOTH', 'CO_CURRICULAR']).optional(),
  search: z.string().optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
});
