import { Request, Response } from 'express';
import { checkDatabaseConnection } from '../../core/database/prisma';
import { ApiResponse } from '../../types';

export class SystemController {
  public static async getHealth(req: Request, res: Response) {
    const isDbConnected = await checkDatabaseConnection();

    const response: ApiResponse = {
      success: true,
      message: 'Kids World School ERP System is operating normally.',
      data: {
        status: isDbConnected ? 'HEALTHY' : 'DEGRADED',
        services: {
          api: 'UP',
          database: isDbConnected ? 'CONNECTED' : 'DISCONNECTED',
        },
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0 (Step 1 Foundation)',
        memoryUsage: process.memoryUsage(),
      },
      timestamp: new Date().toISOString(),
    };

    res.status(isDbConnected ? 200 : 503).json(response);
  }

  public static async getSystemInfo(req: Request, res: Response) {
    const response: ApiResponse = {
      success: true,
      message: 'Kids World School ERP Foundation Architecture Specifications',
      data: {
        school: {
          name: 'Kids World School',
          location: 'Madhya Pradesh, India',
          classes: 'Nursery, LKG, UKG, Primary (expandable)',
          systemMode: 'Internal Core ERP',
        },
        architecture: {
          version: '1.0.0',
          step: 'Step 1 - Project Foundation & Architecture',
          apiPrefix: '/api/v1',
          modulesPlanned: [
            'Admissions & Students',
            'Staff & Teachers',
            'Academic Sessions & Classes',
            'Daily Attendance',
            'Fees & Invoicing',
            'Examinations & Grading',
            'Timetable & Schedules',
            'Notices & Communication',
            'Reports & Analytics',
            'Security & Backups',
          ],
        },
      },
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  }
}
