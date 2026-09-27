import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../../../types';
import { ClassService } from './class.service';
import {
  createClassSchema,
  updateClassSchema,
  toggleStatusSchema,
  classQuerySchema,
} from './class.validation';

export class ClassController {
  public static async list(req: AuthenticatedRequest, res: Response) {
    const schoolId = req.user!.schoolId;
    const validatedQuery = classQuerySchema.parse(req.query);

    const result = await ClassService.listClasses(schoolId, validatedQuery);

    const response: ApiResponse = {
      success: true,
      message: 'Classes retrieved successfully',
      data: result.classes,
      meta: result.meta,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  }

  public static async getById(req: AuthenticatedRequest, res: Response) {
    const schoolId = req.user!.schoolId;
    const id = req.params.id as string;

    const classRecord = await ClassService.getClassById(schoolId, id);

    const response: ApiResponse = {
      success: true,
      message: 'Class details retrieved successfully',
      data: classRecord,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  }

  public static async create(req: AuthenticatedRequest, res: Response) {
    const schoolId = req.user!.schoolId;
    const validatedData = createClassSchema.parse(req.body);

    const created = await ClassService.createClass(
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
      message: `Class "${created.name}" created successfully`,
      data: created,
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(response);
  }

  public static async update(req: AuthenticatedRequest, res: Response) {
    const schoolId = req.user!.schoolId;
    const id = req.params.id as string;
    const validatedData = updateClassSchema.parse(req.body);

    const updated = await ClassService.updateClass(
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
      message: `Class "${updated.name}" updated successfully`,
      data: updated,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  }

  public static async toggleStatus(req: AuthenticatedRequest, res: Response) {
    const schoolId = req.user!.schoolId;
    const id = req.params.id as string;
    const { isActive } = toggleStatusSchema.parse(req.body);

    const updated = await ClassService.toggleStatus(
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
      message: `Class "${updated.name}" ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: updated,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  }

  public static async delete(req: AuthenticatedRequest, res: Response) {
    const schoolId = req.user!.schoolId;
    const id = req.params.id as string;

    const result = await ClassService.deleteClass(
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
