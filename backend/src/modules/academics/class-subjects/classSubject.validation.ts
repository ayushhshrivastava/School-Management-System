import { z } from 'zod';

export const createClassSubjectSchema = z.object({
  classId: z.string().uuid('Valid class UUID is required'),
  subjectId: z.string().uuid('Valid subject UUID is required'),
  academicSessionId: z.string().uuid('Valid academic session UUID is required').optional(),
  isCompulsory: z.boolean().optional().default(true),
  weeklyPeriods: z.coerce.number().int().min(0).max(50).optional().default(5),
  totalMarks: z.coerce.number().min(1).max(500).optional().default(100),
  passingMarks: z.coerce.number().min(0).max(500).optional().default(33),
  isActive: z.boolean().optional().default(true),
}).refine(
  (data) => data.passingMarks <= data.totalMarks,
  {
    message: 'Passing marks cannot exceed total marks',
    path: ['passingMarks'],
  }
);

export const batchClassSubjectSchema = z.object({
  classId: z.string().uuid('Valid class UUID is required'),
  academicSessionId: z.string().uuid('Valid academic session UUID is required').optional(),
  subjects: z
    .array(
      z.object({
        subjectId: z.string().uuid('Valid subject UUID is required'),
        isCompulsory: z.boolean().optional().default(true),
        weeklyPeriods: z.coerce.number().int().min(0).max(50).optional().default(5),
        totalMarks: z.coerce.number().min(1).max(500).optional().default(100),
        passingMarks: z.coerce.number().min(0).max(500).optional().default(33),
      })
    )
    .min(1, 'At least one subject must be specified in batch assignment'),
});

export const updateClassSubjectSchema = z.object({
  isCompulsory: z.boolean().optional(),
  weeklyPeriods: z.coerce.number().int().min(0).max(50).optional(),
  totalMarks: z.coerce.number().min(1).max(500).optional(),
  passingMarks: z.coerce.number().min(0).max(500).optional(),
  isActive: z.boolean().optional(),
}).refine(
  (data) => {
    if (data.passingMarks !== undefined && data.totalMarks !== undefined) {
      return data.passingMarks <= data.totalMarks;
    }
    return true;
  },
  {
    message: 'Passing marks cannot exceed total marks',
    path: ['passingMarks'],
  }
);

export const classSubjectQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  classId: z.string().uuid().optional(),
  subjectId: z.string().uuid().optional(),
  academicSessionId: z.string().uuid().optional(),
  isCompulsory: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
  isActive: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
});
