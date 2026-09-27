import { prisma } from '../../../core/database/prisma';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../../core/errors/AppError';
import { logAuditEvent } from '../../../core/audit/auditLogger';

export class SubjectService {
  /**
   * List all subjects with optional pagination, type filter, active filter, or text search.
   */
  public static async listSubjects(
    schoolId: string,
    query: {
      page?: number;
      limit?: number;
      type?: string;
      search?: string;
      isActive?: boolean;
    }
  ) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { schoolId };

    if (query.type) {
      where.type = query.type;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, subjects] = await Promise.all([
      prisma.subject.count({ where }),
      prisma.subject.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        include: {
          _count: {
            select: { classSubjects: true },
          },
        },
      }),
    ]);

    return {
      subjects,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieve single subject details.
   */
  public static async getSubjectById(schoolId: string, subjectId: string) {
    const subject = await prisma.subject.findFirst({
      where: { id: subjectId, schoolId },
      include: {
        classSubjects: {
          include: {
            class: true,
            academicSession: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    if (!subject) {
      throw new NotFoundError(`Subject with ID "${subjectId}" not found.`);
    }

    return subject;
  }

  /**
   * Create a new subject in the catalog.
   */
  public static async createSubject(
    schoolId: string,
    data: {
      name: string;
      code: string;
      type?: string;
      displayOrder?: number;
      description?: string | null;
      isActive?: boolean;
    },
    userId?: string,
    reqMeta?: { ipAddress?: string; userAgent?: string }
  ) {
    // Uniqueness validation within school
    const conflict = await prisma.subject.findFirst({
      where: {
        schoolId,
        OR: [{ code: data.code.trim() }, { name: data.name.trim() }],
      },
    });

    if (conflict) {
      if (conflict.code.toLowerCase() === data.code.trim().toLowerCase()) {
        throw new ConflictError(`Subject with code "${data.code}" already exists.`);
      }
      throw new ConflictError(`Subject with name "${data.name}" already exists.`);
    }

    const created = await prisma.subject.create({
      data: {
        schoolId,
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        type: data.type || 'THEORY',
        displayOrder: data.displayOrder ?? 0,
        description: data.description?.trim() || null,
        isActive: data.isActive ?? true,
      },
    });

    await logAuditEvent({
      schoolId,
      userId,
      action: 'SUBJECT_CREATED',
      module: 'ACADEMICS',
      entityType: 'Subject',
      entityId: created.id,
      newValues: {
        name: created.name,
        code: created.code,
        type: created.type,
        isActive: created.isActive,
      },
      ipAddress: reqMeta?.ipAddress,
      userAgent: reqMeta?.userAgent,
      details: `Subject "${created.name}" (${created.code}) created.`,
    });

    return created;
  }

  /**
   * Update an existing subject.
   */
  public static async updateSubject(
    schoolId: string,
    subjectId: string,
    data: {
      name?: string;
      code?: string;
      type?: string;
      displayOrder?: number;
      description?: string | null;
      isActive?: boolean;
    },
    userId?: string,
    reqMeta?: { ipAddress?: string; userAgent?: string }
  ) {
    const subject = await prisma.subject.findFirst({
      where: { id: subjectId, schoolId },
    });

    if (!subject) {
      throw new NotFoundError(`Subject with ID "${subjectId}" not found.`);
    }

    if (data.name || data.code) {
      const conflict = await prisma.subject.findFirst({
        where: {
          schoolId,
          id: { not: subjectId },
          OR: [
            data.code ? { code: data.code.trim().toUpperCase() } : {},
            data.name ? { name: data.name.trim() } : {},
          ],
        },
      });

      if (conflict) {
        throw new ConflictError('Another subject with this name or code already exists in this school.');
      }
    }

    const updated = await prisma.subject.update({
      where: { id: subjectId },
      data: {
        name: data.name ? data.name.trim() : undefined,
        code: data.code ? data.code.trim().toUpperCase() : undefined,
        type: data.type ? data.type : undefined,
        displayOrder: data.displayOrder !== undefined ? data.displayOrder : undefined,
        description: data.description !== undefined ? data.description?.trim() || null : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
      },
    });

    await logAuditEvent({
      schoolId,
      userId,
      action: 'SUBJECT_UPDATED',
      module: 'ACADEMICS',
      entityType: 'Subject',
      entityId: updated.id,
      oldValues: {
        name: subject.name,
        code: subject.code,
        type: subject.type,
        isActive: subject.isActive,
      },
      newValues: {
        name: updated.name,
        code: updated.code,
        type: updated.type,
        isActive: updated.isActive,
      },
      ipAddress: reqMeta?.ipAddress,
      userAgent: reqMeta?.userAgent,
      details: `Subject "${updated.name}" updated.`,
    });

    return updated;
  }

  /**
   * Toggle subject active/inactive status.
   */
  public static async toggleStatus(
    schoolId: string,
    subjectId: string,
    isActive: boolean,
    userId?: string,
    reqMeta?: { ipAddress?: string; userAgent?: string }
  ) {
    const subject = await prisma.subject.findFirst({
      where: { id: subjectId, schoolId },
    });

    if (!subject) {
      throw new NotFoundError(`Subject with ID "${subjectId}" not found.`);
    }

    const updated = await prisma.subject.update({
      where: { id: subjectId },
      data: { isActive },
    });

    await logAuditEvent({
      schoolId,
      userId,
      action: 'SUBJECT_STATUS_UPDATED',
      module: 'ACADEMICS',
      entityType: 'Subject',
      entityId: updated.id,
      newValues: { isActive },
      ipAddress: reqMeta?.ipAddress,
      userAgent: reqMeta?.userAgent,
      details: `Subject "${updated.name}" was ${isActive ? 'activated' : 'deactivated'}.`,
    });

    return updated;
  }

  /**
   * Safely delete or deactivate a subject.
   */
  public static async deleteSubject(
    schoolId: string,
    subjectId: string,
    userId?: string,
    reqMeta?: { ipAddress?: string; userAgent?: string }
  ) {
    const subject = await prisma.subject.findFirst({
      where: { id: subjectId, schoolId },
      include: {
        _count: {
          select: { classSubjects: true },
        },
      },
    });

    if (!subject) {
      throw new NotFoundError(`Subject with ID "${subjectId}" not found.`);
    }

    if (subject._count.classSubjects > 0) {
      // Safe deactivation to preserve historical records
      const deactivated = await prisma.subject.update({
        where: { id: subjectId },
        data: { isActive: false },
      });

      await logAuditEvent({
        schoolId,
        userId,
        action: 'SUBJECT_DEACTIVATED',
        module: 'ACADEMICS',
        entityType: 'Subject',
        entityId: subjectId,
        details: `Subject "${subject.name}" has ${subject._count.classSubjects} class mapping(s). Safely deactivated instead of deleted.`,
        ipAddress: reqMeta?.ipAddress,
        userAgent: reqMeta?.userAgent,
      });

      return {
        deleted: false,
        deactivated: true,
        message: `Subject "${subject.name}" is mapped to classes. It has been safely deactivated to protect historical academic curriculums.`,
      };
    }

    await prisma.subject.delete({
      where: { id: subjectId },
    });

    await logAuditEvent({
      schoolId,
      userId,
      action: 'SUBJECT_DELETED',
      module: 'ACADEMICS',
      entityType: 'Subject',
      entityId: subjectId,
      details: `Subject "${subject.name}" (${subject.code}) permanently deleted.`,
      ipAddress: reqMeta?.ipAddress,
      userAgent: reqMeta?.userAgent,
    });

    return {
      deleted: true,
      deactivated: false,
      message: `Subject "${subject.name}" deleted successfully.`,
    };
  }
}
