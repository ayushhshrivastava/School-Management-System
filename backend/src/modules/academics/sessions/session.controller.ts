import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../../../types';
import { SessionService } from './session.service';
import {
  createSessionSchema,
  updateSessionSchema,
  sessionQuerySchema,
} from './session.validation';

export class SessionController {
  public static async list(req: AuthenticatedRequest, res: Response) {
    const schoolId = req.user!.schoolId;
    const validatedQuery = sessionQuerySchema.parse(req.query);

    const result = await SessionService.listSessions(schoolId, validatedQuery);

    const response: ApiResponse = {
      success: true,
      message: 'Academic sessions retrieved successfully',
      data: result.sessions,
      meta: result.meta,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  }

  public static async getById(req: AuthenticatedRequest, res: Response) {
    const schoolId = req.user!.schoolId;
    const id = req.params.id as string;

    const session = await SessionService.getSessionById(schoolId, id);

    const response: ApiResponse = {
      success: true,
      message: 'Academic session details retrieved successfully',
      data: session,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  }

  public static async getCurrent(req: AuthenticatedRequest, res: Response) {
    const schoolId = req.user!.schoolId;

    const session = await SessionService.getCurrentSession(schoolId);

    const response: ApiResponse = {
      success: true,
      message: 'Active academic session retrieved successfully',
      data: session,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  }

  public static async create(req: AuthenticatedRequest, res: Response) {
    const schoolId = req.user!.schoolId;
    const validatedData = createSessionSchema.parse(req.body);

    const created = await SessionService.createSession(
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
      message: `Academic session "${created.name}" created successfully`,
      data: created,
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(response);
  }

  public static async update(req: AuthenticatedRequest, res: Response) {
    const schoolId = req.user!.schoolId;
    const id = req.params.id as string;
    const validatedData = updateSessionSchema.parse(req.body);

    const updated = await SessionService.updateSession(
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
      message: `Academic session "${updated.name}" updated successfully`,
      data: updated,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  }

  public static async activate(req: AuthenticatedRequest, res: Response) {
    const schoolId = req.user!.schoolId;
    const id = req.params.id as string;

    const activated = await SessionService.activateSession(
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
      message: `Academic session "${activated.name}" is now the active session`,
      data: activated,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  }

  public static async lock(req: AuthenticatedRequest, res: Response) {
    const schoolId = req.user!.schoolId;
    const id = req.params.id as string;

    const locked = await SessionService.lockSession(
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
      message: `Academic session "${locked.name}" has been archived and locked`,
      data: locked,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  }
}
