import { Request, Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../../types';
import { ConfigService } from './config.service';
import {
  upsertConfigSchema,
  batchConfigSchema,
  configQuerySchema,
} from './config.validation';
import { prisma } from '../../core/database/prisma';

export class ConfigController {
  /**
   * Public configs endpoint (open to unauthenticated clients e.g. frontend brandings).
   */
  public static async getPublic(req: Request, res: Response) {
    const school = await prisma.school.findFirst({ select: { id: true } });
    if (!school) {
      return res.status(200).json({
        success: true,
        message: 'No school configurations established',
        data: [],
        timestamp: new Date().toISOString(),
      });
    }

    const configs = await ConfigService.listConfigs(school.id, { isPublic: true }, false);

    const response: ApiResponse = {
      success: true,
      message: 'Public school configuration retrieved',
      data: configs,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  }

  /**
   * List configs (restricted by RBAC: only authorized staff can inspect non-public configs).
   */
  public static async list(req: AuthenticatedRequest, res: Response) {
    const schoolId = req.user!.schoolId;
    const validatedQuery = configQuerySchema.parse(req.query);

    const isPrivileged =
      req.user!.isSuperAdmin ||
      req.user!.permissions.includes('system:config') ||
      req.user!.permissions.includes('system:config:view');

    const configs = await ConfigService.listConfigs(schoolId, validatedQuery, isPrivileged);

    const response: ApiResponse = {
      success: true,
      message: 'System configurations retrieved successfully',
      data: configs,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  }

  public static async getByKey(req: AuthenticatedRequest, res: Response) {
    const schoolId = req.user!.schoolId;
    const category = req.params.category as string;
    const key = req.params.key as string;

    const isPrivileged =
      req.user!.isSuperAdmin ||
      req.user!.permissions.includes('system:config') ||
      req.user!.permissions.includes('system:config:view');

    const config = await ConfigService.getConfig(schoolId, category, key, isPrivileged);

    const response: ApiResponse = {
      success: true,
      message: 'Configuration retrieved successfully',
      data: config,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  }

  public static async upsert(req: AuthenticatedRequest, res: Response) {
    const schoolId = req.user!.schoolId;
    const validatedData = upsertConfigSchema.parse(req.body);

    const saved = await ConfigService.upsertConfig(
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
      message: `Configuration "${saved.category}.${saved.key}" saved successfully`,
      data: saved,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  }

  public static async batchUpsert(req: AuthenticatedRequest, res: Response) {
    const schoolId = req.user!.schoolId;
    const { configs } = batchConfigSchema.parse(req.body);

    const savedConfigs = await ConfigService.batchUpsert(
      schoolId,
      configs,
      req.user?.id,
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      }
    );

    const response: ApiResponse = {
      success: true,
      message: `Successfully saved ${savedConfigs.length} configuration settings`,
      data: savedConfigs,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  }

  public static async delete(req: AuthenticatedRequest, res: Response) {
    const schoolId = req.user!.schoolId;
    const category = req.params.category as string;
    const key = req.params.key as string;

    const result = await ConfigService.deleteConfig(
      schoolId,
      category,
      key,
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
