import { z } from 'zod';

export const upsertConfigSchema = z.object({
  category: z
    .string()
    .min(1, 'Category is required (e.g. general, academic, fees, grading)')
    .max(50)
    .trim(),
  key: z
    .string()
    .min(1, 'Key is required')
    .max(100)
    .trim(),
  value: z.string({ required_error: 'Value is required' }),
  dataType: z
    .enum(['string', 'number', 'boolean', 'json'])
    .optional()
    .default('string'),
  isPublic: z.boolean().optional().default(false),
  description: z.string().max(255).optional().nullable(),
});

export const batchConfigSchema = z.object({
  configs: z
    .array(upsertConfigSchema)
    .min(1, 'At least one configuration setting must be provided'),
});

export const configQuerySchema = z.object({
  category: z.string().optional(),
  isPublic: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
});
