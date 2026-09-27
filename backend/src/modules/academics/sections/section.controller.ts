import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../../../types';
import { SectionService } from './section.service';
import {
  createSectionSchema,
  updateSectionSchema,
  toggleSectionStatusSchema,
  sectionQuerySchema,
} from './section.validation';

export class SectionController {
  public static async list(req: AuthenticatedRequest, res: Response) {
    const schoolId = req.user!.schoolId;
    const validatedQuery = sectionQuerySchema.parse(req.query);

    const result = await SectionService.listSections(schoolId, validatedQuery);

    const response: ApiResponse = {
      success: true,
      message: 'Sections retrieved successfully',
      data: result.sections,
      meta: result.meta,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  }

  public static async getById(req: AuthenticatedRequest, res: Response) {
    const schoolId = req.user!.schoolId;
    const id = req.params.id as string;

    const section = await SectionService.getSectionById(schoolId, id);

    const response: ApiResponse = {
      success: true,
      message: 'Section details retrieved successfully',
      data: section,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  }

  public static async create(req: AuthenticatedRequest, res: Response) {
    const schoolId = req.user!.schoolId;
    const validatedData = createSectionSchema.parse(req.body);

    const created = await SectionService.createSection(
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
      message: `Section "${created.name}" created successfully under class "${created.class.name}"`,
      data: created,
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(response);
  }

  public static async update(req: AuthenticatedRequest, res: Response) {
    const schoolId = req.user!.schoolId;
    const id = req.params.id as string;
    const validatedData = updateSectionSchema.parse(req.body);

    const updated = await SectionService.updateSection(
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
      message: `Section "${updated.name}" updated successfully`,
      data: updated,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  }

  public static async toggleStatus(req: AuthenticatedRequest, res: Response) {
    const schoolId = req.user!.schoolId;
    const id = req.params.id as string;
    const { isActive } = toggleSectionStatusSchema.parse(req.body);

    const updated = await SectionService.toggleStatus(
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
      message: `Section "${updated.name}" ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: updated,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  }

  public static async delete(req: AuthenticatedRequest, res: Response) {
    const schoolId = req.user!.schoolId;
    const id = req.params.id as string;

    const result = await SectionService.deleteSection(
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
