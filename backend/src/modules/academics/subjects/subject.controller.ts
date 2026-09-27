import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../../../types';
import { SubjectService } from './subject.service';
import {
  createSubjectSchema,
  updateSubjectSchema,
  toggleSubjectStatusSchema,
  subjectQuerySchema,
} from './subject.validation';

export class SubjectController {
  public static async list(req: AuthenticatedRequest, res: Response) {
    const schoolId = req.user!.schoolId;
    const validatedQuery = subjectQuerySchema.parse(req.query);

    const result = await SubjectService.listSubjects(schoolId, validatedQuery);

    const response: ApiResponse = {
      success: true,
      message: 'Subjects retrieved successfully',
      data: result.subjects,
      meta: result.meta,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  }

  public static async getById(req: AuthenticatedRequest, res: Response) {
    const schoolId = req.user!.schoolId;
    const id = req.params.id as string;

    const subject = await SubjectService.getSubjectById(schoolId, id);

    const response: ApiResponse = {
      success: true,
      message: 'Subject details retrieved successfully',
      data: subject,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  }

  public static async create(req: AuthenticatedRequest, res: Response) {
    const schoolId = req.user!.schoolId;
    const validatedData = createSubjectSchema.parse(req.body);

    const created = await SubjectService.createSubject(
      schoolId,
      validatedData,
      req.user?.id,
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      }
    );

    const response: ApiResponse = {
      success: true,
      message: `Subject "${created.name}" created successfully`,
      data: created,
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(response);
  }

  public static async update(req: AuthenticatedRequest, res: Response) {
    const schoolId = req.user!.schoolId;
    const id = req.params.id as string;
    const validatedData = updateSubjectSchema.parse(req.body);

    const updated = await SubjectService.updateSubject(
      schoolId,
      id,
      validatedData,
      req.user?.id,
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      }
    );

    const response: ApiResponse = {
      success: true,
      message: `Subject "${updated.name}" updated successfully`,
      data: updated,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  }

  public static async toggleStatus(req: AuthenticatedRequest, res: Response) {
    const schoolId = req.user!.schoolId;
    const id = req.params.id as string;
    const { isActive } = toggleSubjectStatusSchema.parse(req.body);

    const updated = await SubjectService.toggleStatus(
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
      message: `Subject "${updated.name}" ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: updated,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  }

  public static async delete(req: AuthenticatedRequest, res: Response) {
    const schoolId = req.user!.schoolId;
    const id = req.params.id as string;

    const result = await SubjectService.deleteSubject(
      schoolId,
      id,
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
}
