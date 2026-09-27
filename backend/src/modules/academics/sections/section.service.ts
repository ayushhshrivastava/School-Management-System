import { prisma } from '../../../core/database/prisma';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../../core/errors/AppError';
import { logAuditEvent } from '../../../core/audit/auditLogger';

export class SectionService {
  /**
   * List sections with optional filtering by classId, active status, or search query.
   */
  public static async listSections(
    schoolId: string,
    query: {
      page?: number;
      limit?: number;
      classId?: string;
      search?: string;
      isActive?: boolean;
    }
  ) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {
      class: { schoolId },
    };

    if (query.classId) {
      where.classId = query.classId;
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

    const [total, sections] = await Promise.all([
      prisma.section.count({ where }),
      prisma.section.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        include: {
          class: {
            select: { id: true, name: true, code: true, displayOrder: true },
          },
          _count: {
            select: { sessionClassSections: true },
          },
        },
      }),
    ]);

    return {
      sections,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieve single section details.
   */
  public static async getSectionById(schoolId: string, sectionId: string) {
    const section = await prisma.section.findFirst({
      where: {
        id: sectionId,
        class: { schoolId },
      },
      include: {
        class: true,
        sessionClassSections: {
          include: {
            academicSession: { select: { id: true, name: true, code: true, isCurrent: true } },
          },
        },
      },
    });

    if (!section) {
      throw new NotFoundError(`Section with ID "${sectionId}" not found.`);
    }

    return section;
  }

  /**
   * Create a new section under a specific class.
   * Enforces name and code uniqueness strictly WITHIN that class.
   */
  public static async createSection(
    schoolId: string,
    data: {
      classId: string;
      name: string;
      code: string;
      capacity?: number;
      displayOrder?: number;
      isActive?: boolean;
    },
    userId?: string,
    reqMeta?: { ipAddress?: string; userAgent?: string }
  ) {
    // Verify class exists and belongs to this school
    const classRecord = await prisma.class.findFirst({
      where: { id: data.classId, schoolId },
    });

    if (!classRecord) {
      throw new NotFoundError(`Class with ID "${data.classId}" does not exist in this school.`);
    }

    // Check uniqueness strictly WITHIN this class
    const conflict = await prisma.section.findFirst({
      where: {
        classId: data.classId,
        OR: [{ code: data.code.trim() }, { name: data.name.trim() }],
      },
    });

    if (conflict) {
      if (conflict.code.toLowerCase() === data.code.trim().toLowerCase()) {
        throw new ConflictError(`Section with code "${data.code}" already exists in class "${classRecord.name}".`);
      }
      throw new ConflictError(`Section with name "${data.name}" already exists in class "${classRecord.name}".`);
    }

    // Find current active academic session to automatically map session class section
    const currentSession = await prisma.academicSession.findFirst({
      where: { schoolId, isCurrent: true },
    });

    const created = await prisma.$transaction(async (tx) => {
      const section = await tx.section.create({
        data: {
          classId: data.classId,
          name: data.name.trim(),
          code: data.code.trim().toUpperCase(),
          capacity: data.capacity ?? 40,
          displayOrder: data.displayOrder ?? 0,
          isActive: data.isActive ?? true,
        },
        include: {
          class: true,
        },
      });

      // If active academic session exists, register section into that session
      if (currentSession) {
        await tx.sessionClassSection.upsert({
          where: {
            academicSessionId_classId_sectionId: {
              academicSessionId: currentSession.id,
              classId: classRecord.id,
              sectionId: section.id,
            },
          },
          update: { isActive: section.isActive },
          create: {
            academicSessionId: currentSession.id,
            classId: classRecord.id,
            sectionId: section.id,
            capacity: section.capacity,
            isActive: section.isActive,
          },
        });
      }

      return section;
    });

    await logAuditEvent({
      schoolId,
      userId,
      action: 'SECTION_CREATED',
      module: 'ACADEMICS',
      entityType: 'Section',
      entityId: created.id,
      newValues: {
        classId: created.classId,
        className: classRecord.name,
        name: created.name,
        code: created.code,
        capacity: created.capacity,
        isActive: created.isActive,
      },
      ipAddress: reqMeta?.ipAddress,
      userAgent: reqMeta?.userAgent,
      details: `Section "${created.name}" created under class "${classRecord.name}".`,
    });

    return created;
  }

  /**
   * Update an existing section.
   */
  public static async updateSection(
    schoolId: string,
    sectionId: string,
    data: {
      name?: string;
      code?: string;
      capacity?: number;
      displayOrder?: number;
      isActive?: boolean;
    },
    userId?: string,
    reqMeta?: { ipAddress?: string; userAgent?: string }
  ) {
    const section = await prisma.section.findFirst({
      where: {
        id: sectionId,
        class: { schoolId },
      },
      include: { class: true },
    });

    if (!section) {
      throw new NotFoundError(`Section with ID "${sectionId}" not found.`);
    }

    // Check uniqueness within the same class if name or code is changed
    if (data.name || data.code) {
      const conflict = await prisma.section.findFirst({
        where: {
          classId: section.classId,
          id: { not: sectionId },
          OR: [
            data.code ? { code: data.code.trim().toUpperCase() } : {},
            data.name ? { name: data.name.trim() } : {},
          ],
        },
      });

      if (conflict) {
        throw new ConflictError(`Another section with this name or code already exists in class "${section.class.name}".`);
      }
    }

    const updated = await prisma.section.update({
      where: { id: sectionId },
      data: {
        name: data.name ? data.name.trim() : undefined,
        code: data.code ? data.code.trim().toUpperCase() : undefined,
        capacity: data.capacity !== undefined ? data.capacity : undefined,
        displayOrder: data.displayOrder !== undefined ? data.displayOrder : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
      },
      include: { class: true },
    });

    await logAuditEvent({
      schoolId,
      userId,
      action: 'SECTION_UPDATED',
      module: 'ACADEMICS',
      entityType: 'Section',
      entityId: updated.id,
      oldValues: {
        name: section.name,
        code: section.code,
        capacity: section.capacity,
        isActive: section.isActive,
      },
      newValues: {
        name: updated.name,
        code: updated.code,
        capacity: updated.capacity,
        isActive: updated.isActive,
      },
      ipAddress: reqMeta?.ipAddress,
      userAgent: reqMeta?.userAgent,
      details: `Section "${updated.name}" of class "${section.class.name}" updated.`,
    });

    return updated;
  }

  /**
   * Toggle section active/inactive status.
   */
  public static async toggleStatus(
    schoolId: string,
    sectionId: string,
    isActive: boolean,
    userId?: string,
    reqMeta?: { ipAddress?: string; userAgent?: string }
  ) {
    const section = await prisma.section.findFirst({
      where: {
        id: sectionId,
        class: { schoolId },
      },
      include: { class: true },
    });

    if (!section) {
      throw new NotFoundError(`Section with ID "${sectionId}" not found.`);
    }

    const updated = await prisma.section.update({
      where: { id: sectionId },
      data: { isActive },
      include: { class: true },
    });

    await logAuditEvent({
      schoolId,
      userId,
      action: 'SECTION_STATUS_UPDATED',
      module: 'ACADEMICS',
      entityType: 'Section',
      entityId: updated.id,
      newValues: { isActive },
      ipAddress: reqMeta?.ipAddress,
      userAgent: reqMeta?.userAgent,
      details: `Section "${updated.name}" of class "${section.class.name}" was ${isActive ? 'activated' : 'deactivated'}.`,
    });

    return updated;
  }

  /**
   * Safely delete or deactivate a section.
   */
  public static async deleteSection(
    schoolId: string,
    sectionId: string,
    userId?: string,
    reqMeta?: { ipAddress?: string; userAgent?: string }
  ) {
    const section = await prisma.section.findFirst({
      where: {
        id: sectionId,
        class: { schoolId },
      },
      include: {
        class: true,
        _count: {
          select: { sessionClassSections: true },
        },
      },
    });

    if (!section) {
      throw new NotFoundError(`Section with ID "${sectionId}" not found.`);
    }

    if (section._count.sessionClassSections > 0) {
      // Safe deactivation to preserve historical relational integrity
      const deactivated = await prisma.section.update({
        where: { id: sectionId },
        data: { isActive: false },
      });

      await logAuditEvent({
        schoolId,
        userId,
        action: 'SECTION_DEACTIVATED',
        module: 'ACADEMICS',
        entityType: 'Section',
        entityId: sectionId,
        details: `Section "${section.name}" of class "${section.class.name}" has session references. Safely deactivated.`,
        ipAddress: reqMeta?.ipAddress,
        userAgent: reqMeta?.userAgent,
      });

      return {
        deleted: false,
        deactivated: true,
        message: `Section "${section.name}" is linked to academic sessions. It was safely deactivated to preserve historical academic data.`,
      };
    }

    await prisma.section.delete({
      where: { id: sectionId },
    });

    await logAuditEvent({
      schoolId,
      userId,
      action: 'SECTION_DELETED',
      module: 'ACADEMICS',
      entityType: 'Section',
      entityId: sectionId,
      details: `Section "${section.name}" of class "${section.class.name}" permanently deleted.`,
      ipAddress: reqMeta?.ipAddress,
      userAgent: reqMeta?.userAgent,
    });

    return {
      deleted: true,
      deactivated: false,
      message: `Section "${section.name}" deleted successfully.`,
    };
  }
}
