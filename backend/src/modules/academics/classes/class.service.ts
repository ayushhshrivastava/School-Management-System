import { prisma } from '../../../core/database/prisma';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../../core/errors/AppError';
import { logAuditEvent } from '../../../core/audit/auditLogger';

export class ClassService {
  /**
   * List all classes in a school, sorted by displayOrder asc.
   * Includes child sections and count of mapped subjects.
   */
  public static async listClasses(
    schoolId: string,
    query: {
      page?: number;
      limit?: number;
      search?: string;
      isActive?: boolean;
    }
  ) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { schoolId };

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, classes] = await Promise.all([
      prisma.class.count({ where }),
      prisma.class.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        include: {
          sections: {
            orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
          },
          _count: {
            select: {
              sections: true,
              classSubjects: true,
              sessionClassSections: true,
            },
          },
        },
      }),
    ]);

    return {
      classes,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieve a single class with its sections and subjects.
   */
  public static async getClassById(schoolId: string, classId: string) {
    const classRecord = await prisma.class.findFirst({
      where: { id: classId, schoolId },
      include: {
        sections: {
          orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        },
        classSubjects: {
          include: {
            subject: true,
            academicSession: { select: { id: true, name: true, code: true } },
          },
        },
        _count: {
          select: {
            sections: true,
            classSubjects: true,
            sessionClassSections: true,
          },
        },
      },
    });

    if (!classRecord) {
      throw new NotFoundError(`Class with ID "${classId}" not found.`);
    }

    return classRecord;
  }

  /**
   * Create a new class master record.
   */
  public static async createClass(
    schoolId: string,
    data: {
      name: string;
      code: string;
      displayOrder?: number;
      description?: string | null;
      isActive?: boolean;
    },
    userId?: string,
    reqMeta?: { ipAddress?: string; userAgent?: string }
  ) {
    // Check uniqueness within the school
    const conflict = await prisma.class.findFirst({
      where: {
        schoolId,
        OR: [{ code: data.code.trim() }, { name: data.name.trim() }],
      },
    });

    if (conflict) {
      if (conflict.code.toLowerCase() === data.code.trim().toLowerCase()) {
        throw new ConflictError(`Class with code "${data.code}" already exists.`);
      }
      throw new ConflictError(`Class with name "${data.name}" already exists.`);
    }

    const created = await prisma.class.create({
      data: {
        schoolId,
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        displayOrder: data.displayOrder ?? 0,
        description: data.description?.trim() || null,
        isActive: data.isActive ?? true,
      },
    });

    await logAuditEvent({
      schoolId,
      userId,
      action: 'CLASS_CREATED',
      module: 'ACADEMICS',
      entityType: 'Class',
      entityId: created.id,
      newValues: {
        name: created.name,
        code: created.code,
        displayOrder: created.displayOrder,
        isActive: created.isActive,
      },
      ipAddress: reqMeta?.ipAddress,
      userAgent: reqMeta?.userAgent,
      details: `Academic class "${created.name}" (${created.code}) created.`,
    });

    return created;
  }

  /**
   * Update an existing class record.
   */
  public static async updateClass(
    schoolId: string,
    classId: string,
    data: {
      name?: string;
      code?: string;
      displayOrder?: number;
      description?: string | null;
      isActive?: boolean;
    },
    userId?: string,
    reqMeta?: { ipAddress?: string; userAgent?: string }
  ) {
    const classRecord = await prisma.class.findFirst({
      where: { id: classId, schoolId },
    });

    if (!classRecord) {
      throw new NotFoundError(`Class with ID "${classId}" not found.`);
    }

    // Uniqueness validation on update
    if (data.code || data.name) {
      const conflict = await prisma.class.findFirst({
        where: {
          schoolId,
          id: { not: classId },
          OR: [
            data.code ? { code: data.code.trim().toUpperCase() } : {},
            data.name ? { name: data.name.trim() } : {},
          ],
        },
      });

      if (conflict) {
        throw new ConflictError('Another class with this name or code already exists in this school.');
      }
    }

    const updated = await prisma.class.update({
      where: { id: classId },
      data: {
        name: data.name ? data.name.trim() : undefined,
        code: data.code ? data.code.trim().toUpperCase() : undefined,
        displayOrder: data.displayOrder !== undefined ? data.displayOrder : undefined,
        description: data.description !== undefined ? data.description?.trim() || null : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
      },
    });

    await logAuditEvent({
      schoolId,
      userId,
      action: 'CLASS_UPDATED',
      module: 'ACADEMICS',
      entityType: 'Class',
      entityId: updated.id,
      oldValues: {
        name: classRecord.name,
        code: classRecord.code,
        displayOrder: classRecord.displayOrder,
        isActive: classRecord.isActive,
      },
      newValues: {
        name: updated.name,
        code: updated.code,
        displayOrder: updated.displayOrder,
        isActive: updated.isActive,
      },
      ipAddress: reqMeta?.ipAddress,
      userAgent: reqMeta?.userAgent,
      details: `Academic class "${updated.name}" updated.`,
    });

    return updated;
  }

  /**
   * Toggle active/inactive status for a class.
   */
  public static async toggleStatus(
    schoolId: string,
    classId: string,
    isActive: boolean,
    userId?: string,
    reqMeta?: { ipAddress?: string; userAgent?: string }
  ) {
    const classRecord = await prisma.class.findFirst({
      where: { id: classId, schoolId },
    });

    if (!classRecord) {
      throw new NotFoundError(`Class with ID "${classId}" not found.`);
    }

    const updated = await prisma.class.update({
      where: { id: classId },
      data: { isActive },
    });

    await logAuditEvent({
      schoolId,
      userId,
      action: 'CLASS_STATUS_UPDATED',
      module: 'ACADEMICS',
      entityType: 'Class',
      entityId: updated.id,
      newValues: { isActive },
      ipAddress: reqMeta?.ipAddress,
      userAgent: reqMeta?.userAgent,
      details: `Class "${updated.name}" was ${isActive ? 'activated' : 'deactivated'}.`,
    });

    return updated;
  }

  /**
   * Safely delete a class.
   * If sections or subject mappings exist, soft-deactivate instead or reject to preserve historical integrity.
   */
  public static async deleteClass(
    schoolId: string,
    classId: string,
    userId?: string,
    reqMeta?: { ipAddress?: string; userAgent?: string }
  ) {
    const classRecord = await prisma.class.findFirst({
      where: { id: classId, schoolId },
      include: {
        _count: {
          select: {
            sections: true,
            classSubjects: true,
            sessionClassSections: true,
          },
        },
      },
    });

    if (!classRecord) {
      throw new NotFoundError(`Class with ID "${classId}" not found.`);
    }

    const hasReferences =
      classRecord._count.sections > 0 ||
      classRecord._count.classSubjects > 0 ||
      classRecord._count.sessionClassSections > 0;

    if (hasReferences) {
      // Safe deactivation to preserve historical relational integrity
      const deactivated = await prisma.class.update({
        where: { id: classId },
        data: { isActive: false },
      });

      await logAuditEvent({
        schoolId,
        userId,
        action: 'CLASS_DEACTIVATED',
        module: 'ACADEMICS',
        entityType: 'Class',
        entityId: classId,
        details: `Class "${classRecord.name}" has ${classRecord._count.sections} section(s) and historical associations. It was safely deactivated instead of deleted.`,
        ipAddress: reqMeta?.ipAddress,
        userAgent: reqMeta?.userAgent,
      });

      return {
        deleted: false,
        deactivated: true,
        message: `Class "${classRecord.name}" has existing sections or subject mappings. It has been safely deactivated to protect historical academic records.`,
      };
    }

    // Truly orphaned record can be deleted safely
    await prisma.class.delete({
      where: { id: classId },
    });

    await logAuditEvent({
      schoolId,
      userId,
      action: 'CLASS_DELETED',
      module: 'ACADEMICS',
      entityType: 'Class',
      entityId: classId,
      details: `Class "${classRecord.name}" (${classRecord.code}) permanently deleted.`,
      ipAddress: reqMeta?.ipAddress,
      userAgent: reqMeta?.userAgent,
    });

    return {
      deleted: true,
      deactivated: false,
      message: `Class "${classRecord.name}" deleted successfully.`,
    };
  }
}
