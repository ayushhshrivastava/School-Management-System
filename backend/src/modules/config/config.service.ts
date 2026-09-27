import { prisma } from '../../core/database/prisma';
import { NotFoundError } from '../../core/errors/AppError';
import { logAuditEvent } from '../../core/audit/auditLogger';

export class ConfigService {
  /**
   * List system configurations.
   * If user is unprivileged, strictly returns only isPublic === true configurations.
   */
  public static async listConfigs(
    schoolId: string,
    query: { category?: string; isPublic?: boolean },
    isPrivileged: boolean = false
  ) {
    const where: any = { schoolId };

    if (query.category) {
      where.category = query.category;
    }

    if (!isPrivileged) {
      where.isPublic = true;
    } else if (query.isPublic !== undefined) {
      where.isPublic = query.isPublic;
    }

    const configs = await prisma.systemConfig.findMany({
      where,
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });

    return configs;
  }

  /**
   * Get single configuration record by category and key.
   */
  public static async getConfig(
    schoolId: string,
    category: string,
    key: string,
    isPrivileged: boolean = false
  ) {
    const where: any = {
      schoolId_category_key: {
        schoolId,
        category,
        key,
      },
    };

    const config = await prisma.systemConfig.findUnique({ where });

    if (!config) {
      throw new NotFoundError(`Configuration for "${category}.${key}" not found.`);
    }

    if (!isPrivileged && !config.isPublic) {
      throw new NotFoundError(`Configuration for "${category}.${key}" not found.`);
    }

    return config;
  }

  /**
   * Upsert a configuration setting.
   */
  public static async upsertConfig(
    schoolId: string,
    data: {
      category: string;
      key: string;
      value: string;
      dataType?: string;
      isPublic?: boolean;
      description?: string | null;
    },
    userId?: string,
    reqMeta?: { ipAddress?: string; userAgent?: string }
  ) {
    const existing = await prisma.systemConfig.findUnique({
      where: {
        schoolId_category_key: {
          schoolId,
          category: data.category,
          key: data.key,
        },
      },
    });

    const saved = await prisma.systemConfig.upsert({
      where: {
        schoolId_category_key: {
          schoolId,
          category: data.category,
          key: data.key,
        },
      },
      update: {
        value: data.value,
        dataType: data.dataType || 'string',
        isPublic: data.isPublic !== undefined ? data.isPublic : false,
        description: data.description !== undefined ? data.description : undefined,
      },
      create: {
        schoolId,
        category: data.category,
        key: data.key,
        value: data.value,
        dataType: data.dataType || 'string',
        isPublic: data.isPublic || false,
        description: data.description || null,
      },
    });

    await logAuditEvent({
      schoolId,
      userId,
      action: existing ? 'SYSTEM_CONFIG_UPDATED' : 'SYSTEM_CONFIG_CREATED',
      module: 'SYSTEM',
      entityType: 'SystemConfig',
      entityId: saved.id,
      oldValues: existing ? { value: existing.value, isPublic: existing.isPublic } : undefined,
      newValues: { value: saved.value, isPublic: saved.isPublic, dataType: saved.dataType },
      details: `System configuration "${data.category}.${data.key}" ${existing ? 'updated' : 'created'}.`,
      ipAddress: reqMeta?.ipAddress,
      userAgent: reqMeta?.userAgent,
    });

    return saved;
  }

  /**
   * Batch upsert configurations.
   */
  public static async batchUpsert(
    schoolId: string,
    configs: Array<{
      category: string;
      key: string;
      value: string;
      dataType?: string;
      isPublic?: boolean;
      description?: string | null;
    }>,
    userId?: string,
    reqMeta?: { ipAddress?: string; userAgent?: string }
  ) {
    const savedConfigs = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const item of configs) {
        const saved = await tx.systemConfig.upsert({
          where: {
            schoolId_category_key: {
              schoolId,
              category: item.category,
              key: item.key,
            },
          },
          update: {
            value: item.value,
            dataType: item.dataType || 'string',
            isPublic: item.isPublic !== undefined ? item.isPublic : false,
            description: item.description !== undefined ? item.description : undefined,
          },
          create: {
            schoolId,
            category: item.category,
            key: item.key,
            value: item.value,
            dataType: item.dataType || 'string',
            isPublic: item.isPublic || false,
            description: item.description || null,
          },
        });
        results.push(saved);
      }
      return results;
    });

    await logAuditEvent({
      schoolId,
      userId,
      action: 'SYSTEM_CONFIG_BATCH_UPDATED',
      module: 'SYSTEM',
      entityType: 'SystemConfig',
      details: `${savedConfigs.length} system configuration entries updated.`,
      ipAddress: reqMeta?.ipAddress,
      userAgent: reqMeta?.userAgent,
    });

    return savedConfigs;
  }

  /**
   * Delete a configuration setting.
   */
  public static async deleteConfig(
    schoolId: string,
    category: string,
    key: string,
    userId?: string,
    reqMeta?: { ipAddress?: string; userAgent?: string }
  ) {
    const config = await prisma.systemConfig.findUnique({
      where: {
        schoolId_category_key: {
          schoolId,
          category,
          key,
        },
      },
    });

    if (!config) {
      throw new NotFoundError(`Configuration for "${category}.${key}" not found.`);
    }

    await prisma.systemConfig.delete({
      where: { id: config.id },
    });

    await logAuditEvent({
      schoolId,
      userId,
      action: 'SYSTEM_CONFIG_DELETED',
      module: 'SYSTEM',
      entityType: 'SystemConfig',
      entityId: config.id,
      details: `System configuration "${category}.${key}" deleted.`,
      ipAddress: reqMeta?.ipAddress,
      userAgent: reqMeta?.userAgent,
    });

    return {
      success: true,
      message: `Configuration "${category}.${key}" deleted successfully.`,
    };
  }
}
