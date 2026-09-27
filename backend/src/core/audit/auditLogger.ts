import { prisma } from '../database/prisma';
import { logger } from '../logger/logger';

export interface CreateAuditLogParams {
  schoolId: string;
  userId?: string;
  action: string;
  module: string;
  entityType?: string;
  entityId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  status?: 'SUCCESS' | 'FAILED' | 'WARNING';
  details?: string;
}

/**
 * Foundation Audit Service for Kids World School ERP.
 * Persists critical transactions and changes to an append-only audit trail.
 */
export async function logAuditEvent(params: CreateAuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        schoolId: params.schoolId,
        userId: params.userId,
        action: params.action,
        module: params.module,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValues: params.oldValues ? JSON.stringify(params.oldValues) : null,
        newValues: params.newValues ? JSON.stringify(params.newValues) : null,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        status: params.status || 'SUCCESS',
        details: params.details,
      },
    });
  } catch (error) {
    // Audit failures should be recorded in application logs without halting user flow
    logger.error('Failed to write audit log event: %s', (error as Error).message, {
      auditParams: params,
    });
  }
}
