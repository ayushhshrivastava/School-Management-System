import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../../../types';
import { ClassSubjectService } from './classSubject.service';
import {
  createClassSubjectSchema,
  batchClassSubjectSchema,
  updateClassSubjectSchema,
  classSubjectQuerySchema,
} from './classSubject.validation';

export class ClassSubjectController {
  public static async list(req: AuthenticatedRequest, res: Response) {
    const schoolId = req.user!.schoolId;
    const validatedQuery = classSubjectQuerySchema.parse(req.query);

    const result = await ClassSubjectService.listClassSubjects(schoolId, validatedQuery);

    const response: ApiResponse = {
      success: true,
      message: 'Class-Subject mappings retrieved successfully',
      data: result.mappings,
      meta: result.meta,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  }

  public static async getById(req: AuthenticatedRequest, res: Response) {
    const schoolId = req.user!.schoolId;
    const id = req.params.id as string;

    const mapping = await ClassSubjectService.getClassSubjectById(schoolId, id);

    const response: ApiResponse = {
      success: true,
      message: 'Class-Subject mapping details retrieved successfully',
      data: mapping,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  }

  public static async create(req: AuthenticatedRequest, res: Response) {
    const schoolId = req.user!.schoolId;
    const validatedData = createClassSubjectSchema.parse(req.body);

    const created = await ClassSubjectService.createClassSubject(
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
      message: `Subject "${created.subject.name}" successfully mapped to class "${created.class.name}"`,
      data: created,
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(response);
  }

  public static async batchAssign(req: AuthenticatedRequest, res: Response) {
    const schoolId = req.user!.schoolId;
    const validatedData = batchClassSubjectSchema.parse(req.body);

    const createdList = await ClassSubjectService.batchAssign(
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
      message: `Successfully mapped ${createdList.length} subjects to class`,
      data: createdList,
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(response);
  }

  public static async update(req: AuthenticatedRequest, res: Response) {
    const schoolId = req.user!.schoolId;
    const id = req.params.id as string;
    const validatedData = updateClassSubjectSchema.parse(req.body);

    const updated = await ClassSubjectService.updateClassSubject(
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
      message: `Class-Subject mapping for "${updated.subject.name}" updated successfully`,
      data: updated,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  }

  public static async remove(req: AuthenticatedRequest, res: Response) {
    const schoolId = req.user!.schoolId;
    const id = req.params.id as string;

    const result = await ClassSubjectService.removeClassSubject(
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
