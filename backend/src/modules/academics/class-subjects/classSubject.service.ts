import { prisma } from '../../../core/database/prisma';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  SessionLockedError,
} from '../../../core/errors/AppError';
import { logAuditEvent } from '../../../core/audit/auditLogger';

export class ClassSubjectService {
  /**
   * List class-subject mappings with filtering by class, session, subject, compulsory flag, active status.
   */
  public static async listClassSubjects(
    schoolId: string,
    query: {
      page?: number;
      limit?: number;
      classId?: string;
      subjectId?: string;
      academicSessionId?: string;
      isCompulsory?: boolean;
      isActive?: boolean;
    }
  ) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { schoolId };

    if (query.classId) where.classId = query.classId;
    if (query.subjectId) where.subjectId = query.subjectId;
    if (query.academicSessionId) where.academicSessionId = query.academicSessionId;
    if (query.isCompulsory !== undefined) where.isCompulsory = query.isCompulsory;
    if (query.isActive !== undefined) where.isActive = query.isActive;

    const [total, mappings] = await Promise.all([
      prisma.classSubject.count({ where }),
      prisma.classSubject.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { class: { displayOrder: 'asc' } },
          { subject: { displayOrder: 'asc' } },
        ],
        include: {
          class: { select: { id: true, name: true, code: true, displayOrder: true } },
          subject: { select: { id: true, name: true, code: true, type: true, displayOrder: true } },
          academicSession: { select: { id: true, name: true, code: true, isCurrent: true, isLocked: true } },
        },
      }),
    ]);

    return {
      mappings,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single mapping by ID.
   */
  public static async getClassSubjectById(schoolId: string, id: string) {
    const mapping = await prisma.classSubject.findFirst({
      where: { id, schoolId },
      include: {
        class: true,
        subject: true,
        academicSession: true,
      },
    });

    if (!mapping) {
      throw new NotFoundError(`Class-Subject mapping with ID "${id}" not found.`);
    }

    return mapping;
  }

  /**
   * Map a single subject to a class for a specific academic session.
   */
  public static async createClassSubject(
    schoolId: string,
    data: {
      classId: string;
      subjectId: string;
      academicSessionId?: string;
      isCompulsory?: boolean;
      weeklyPeriods?: number;
      totalMarks?: number;
      passingMarks?: number;
      isActive?: boolean;
    },
    userId?: string,
    reqMeta?: { ipAddress?: string; userAgent?: string }
  ) {
    // 1. Resolve Academic Session: explicit or current active
    let sessionId = data.academicSessionId;
    if (!sessionId) {
      const current = await prisma.academicSession.findFirst({
        where: { schoolId, isCurrent: true },
      });
      if (!current) {
        throw new BadRequestError('No active academic session found. Specify an academicSessionId explicitly.');
      }
      sessionId = current.id;
    }

    const session = await prisma.academicSession.findFirst({
      where: { id: sessionId, schoolId },
    });
    if (!session) {
      throw new NotFoundError(`Academic session with ID "${sessionId}" not found.`);
    }
    if (session.isLocked) {
      throw new SessionLockedError(session.name);
    }

    // 2. Verify Class
    const classRecord = await prisma.class.findFirst({
      where: { id: data.classId, schoolId },
    });
    if (!classRecord) {
      throw new NotFoundError(`Class with ID "${data.classId}" not found in this school.`);
    }

    // 3. Verify Subject
    const subjectRecord = await prisma.subject.findFirst({
      where: { id: data.subjectId, schoolId },
    });
    if (!subjectRecord) {
      throw new NotFoundError(`Subject with ID "${data.subjectId}" not found in this school.`);
    }

    // 4. Duplicate Check
    const existing = await prisma.classSubject.findFirst({
      where: {
        academicSessionId: sessionId,
        classId: data.classId,
        subjectId: data.subjectId,
      },
    });

    if (existing) {
      throw new ConflictError(
        `Subject "${subjectRecord.name}" is already mapped to class "${classRecord.name}" for session "${session.name}".`
      );
    }

    const created = await prisma.classSubject.create({
      data: {
        schoolId,
        academicSessionId: sessionId,
        classId: data.classId,
        subjectId: data.subjectId,
        isCompulsory: data.isCompulsory ?? true,
        weeklyPeriods: data.weeklyPeriods ?? 5,
        totalMarks: data.totalMarks ?? 100,
        passingMarks: data.passingMarks ?? 33,
        isActive: data.isActive ?? true,
      },
      include: {
        class: true,
        subject: true,
        academicSession: true,
      },
    });

    await logAuditEvent({
      schoolId,
      userId,
      action: 'CLASS_SUBJECT_MAPPED',
      module: 'ACADEMICS',
      entityType: 'ClassSubject',
      entityId: created.id,
      newValues: {
        className: classRecord.name,
        subjectName: subjectRecord.name,
        sessionName: session.name,
        isCompulsory: created.isCompulsory,
        weeklyPeriods: created.weeklyPeriods,
      },
      ipAddress: reqMeta?.ipAddress,
      userAgent: reqMeta?.userAgent,
      details: `Subject "${subjectRecord.name}" mapped to class "${classRecord.name}" (${created.isCompulsory ? 'Compulsory' : 'Elective'}) for session "${session.name}".`,
    });

    return created;
  }

  /**
   * Batch assign subjects to a class for an academic session.
   */
  public static async batchAssign(
    schoolId: string,
    data: {
      classId: string;
      academicSessionId?: string;
      subjects: Array<{
        subjectId: string;
        isCompulsory?: boolean;
        weeklyPeriods?: number;
        totalMarks?: number;
        passingMarks?: number;
      }>;
    },
    userId?: string,
    reqMeta?: { ipAddress?: string; userAgent?: string }
  ) {
    let sessionId = data.academicSessionId;
    if (!sessionId) {
      const current = await prisma.academicSession.findFirst({
        where: { schoolId, isCurrent: true },
      });
      if (!current) {
        throw new BadRequestError('No active academic session found. Specify an academicSessionId explicitly.');
      }
      sessionId = current.id;
    }

    const session = await prisma.academicSession.findFirst({
      where: { id: sessionId, schoolId },
    });
    if (!session) {
      throw new NotFoundError(`Academic session with ID "${sessionId}" not found.`);
    }
    if (session.isLocked) {
      throw new SessionLockedError(session.name);
    }

    const classRecord = await prisma.class.findFirst({
      where: { id: data.classId, schoolId },
    });
    if (!classRecord) {
      throw new NotFoundError(`Class with ID "${data.classId}" not found.`);
    }

    const createdList = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const item of data.subjects) {
        const sub = await tx.subject.findFirst({
          where: { id: item.subjectId, schoolId },
        });
        if (!sub) continue;

        const record = await tx.classSubject.upsert({
          where: {
            academicSessionId_classId_subjectId: {
              academicSessionId: sessionId!,
              classId: data.classId,
              subjectId: item.subjectId,
            },
          },
          update: {
            isCompulsory: item.isCompulsory ?? true,
            weeklyPeriods: item.weeklyPeriods ?? 5,
            totalMarks: item.totalMarks ?? 100,
            passingMarks: item.passingMarks ?? 33,
            isActive: true,
          },
          create: {
            schoolId,
            academicSessionId: sessionId!,
            classId: data.classId,
            subjectId: item.subjectId,
            isCompulsory: item.isCompulsory ?? true,
            weeklyPeriods: item.weeklyPeriods ?? 5,
            totalMarks: item.totalMarks ?? 100,
            passingMarks: item.passingMarks ?? 33,
            isActive: true,
          },
          include: { subject: true },
        });
        results.push(record);
      }
      return results;
    });

    await logAuditEvent({
      schoolId,
      userId,
      action: 'CLASS_SUBJECTS_BATCH_MAPPED',
      module: 'ACADEMICS',
      entityType: 'ClassSubject',
      entityId: classRecord.id,
      ipAddress: reqMeta?.ipAddress,
      userAgent: reqMeta?.userAgent,
      details: `${createdList.length} subject(s) batch mapped to class "${classRecord.name}" in session "${session.name}".`,
    });

    return createdList;
  }

  /**
   * Update an existing class-subject mapping.
   */
  public static async updateClassSubject(
    schoolId: string,
    id: string,
    data: {
      isCompulsory?: boolean;
      weeklyPeriods?: number;
      totalMarks?: number;
      passingMarks?: number;
      isActive?: boolean;
    },
    userId?: string,
    reqMeta?: { ipAddress?: string; userAgent?: string }
  ) {
    const mapping = await prisma.classSubject.findFirst({
      where: { id, schoolId },
      include: { academicSession: true, class: true, subject: true },
    });

    if (!mapping) {
      throw new NotFoundError(`Class-Subject mapping with ID "${id}" not found.`);
    }

    if (mapping.academicSession.isLocked) {
      throw new SessionLockedError(mapping.academicSession.name);
    }

    const updated = await prisma.classSubject.update({
      where: { id },
      data: {
        isCompulsory: data.isCompulsory !== undefined ? data.isCompulsory : undefined,
        weeklyPeriods: data.weeklyPeriods !== undefined ? data.weeklyPeriods : undefined,
        totalMarks: data.totalMarks !== undefined ? data.totalMarks : undefined,
        passingMarks: data.passingMarks !== undefined ? data.passingMarks : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
      },
      include: { class: true, subject: true, academicSession: true },
    });

    await logAuditEvent({
      schoolId,
      userId,
      action: 'CLASS_SUBJECT_UPDATED',
      module: 'ACADEMICS',
      entityType: 'ClassSubject',
      entityId: updated.id,
      oldValues: {
        isCompulsory: mapping.isCompulsory,
        weeklyPeriods: mapping.weeklyPeriods,
        isActive: mapping.isActive,
      },
      newValues: {
        isCompulsory: updated.isCompulsory,
        weeklyPeriods: updated.weeklyPeriods,
        isActive: updated.isActive,
      },
      ipAddress: reqMeta?.ipAddress,
      userAgent: reqMeta?.userAgent,
      details: `Class-Subject mapping for "${updated.subject.name}" in "${updated.class.name}" updated.`,
    });

    return updated;
  }

  /**
   * Remove or deactivate a class-subject mapping.
   */
  public static async removeClassSubject(
    schoolId: string,
    id: string,
    userId?: string,
    reqMeta?: { ipAddress?: string; userAgent?: string }
  ) {
    const mapping = await prisma.classSubject.findFirst({
      where: { id, schoolId },
      include: { academicSession: true, class: true, subject: true },
    });

    if (!mapping) {
      throw new NotFoundError(`Class-Subject mapping with ID "${id}" not found.`);
    }

    if (mapping.academicSession.isLocked) {
      throw new SessionLockedError(mapping.academicSession.name);
    }

    await prisma.classSubject.delete({
      where: { id },
    });

    await logAuditEvent({
      schoolId,
      userId,
      action: 'CLASS_SUBJECT_REMOVED',
      module: 'ACADEMICS',
      entityType: 'ClassSubject',
      entityId: id,
      details: `Subject "${mapping.subject.name}" unmapped from class "${mapping.class.name}" for session "${mapping.academicSession.name}".`,
      ipAddress: reqMeta?.ipAddress,
      userAgent: reqMeta?.userAgent,
    });

    return {
      success: true,
      message: `Subject "${mapping.subject.name}" removed from class "${mapping.class.name}".`,
    };
  }
}
