import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../../../types';
import { SessionClassService } from './sessionClass.service';
import { z } from 'zod';

const querySchema = z.object({
  academicSessionId: z.string().uuid().optional(),
  classId: z.string().uuid().optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
});

const syncSchema = z.object({
  academicSessionId: z.string().uuid('Valid academic session UUID is required'),
});

const toggleSchema = z.object({
  isActive: z.boolean(),
});

export class SessionClassController {
  public static async list(req: AuthenticatedRequest, res: Response) {
    const schoolId = req.user!.schoolId;
    const validatedQuery = querySchema.parse(req.query);

    const data = await SessionClassService.listSessionClasses(schoolId, validatedQuery);

    const response: ApiResponse = {
      success: true,
      message: 'Session class-sections retrieved successfully',
      data,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  }

  public static async sync(req: AuthenticatedRequest, res: Response) {
    const schoolId = req.user!.schoolId;
    const { academicSessionId } = syncSchema.parse(req.body);

    const result = await SessionClassService.syncSessionClasses(
      schoolId,
      academicSessionId,
      req.user?.id,
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      }
    );

    const response: ApiResponse = {
      success: true,
      message: result.message,
      data: result,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  }

  public static async toggle(req: AuthenticatedRequest, res: Response) {
    const schoolId = req.user!.schoolId;
    const id = req.params.id as string;
    const { isActive } = toggleSchema.parse(req.body);

    const updated = await SessionClassService.toggleStatus(
      schoolId,
      id,
      isActive,
      req.user?.id,
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      }
    );

    const response: ApiResponse = {
      success: true,
      message: `Session class-section status updated to ${isActive ? 'active' : 'inactive'}`,
      data: updated,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  }
}
