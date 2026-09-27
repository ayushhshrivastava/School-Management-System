import { prisma } from '../../../core/database/prisma';
import { NotFoundError, SessionLockedError, BadRequestError } from '../../../core/errors/AppError';
import { logAuditEvent } from '../../../core/audit/auditLogger';

export class SessionClassService {
  /**
   * List all session-specific class-sections for a given academic session.
   */
  public static async listSessionClasses(
    schoolId: string,
    query: { academicSessionId?: string; classId?: string; isActive?: boolean }
  ) {
    let sessionId = query.academicSessionId;
    if (!sessionId) {
      const current = await prisma.academicSession.findFirst({
        where: { schoolId, isCurrent: true },
      });
      if (current) {
        sessionId = current.id;
      }
    }

    const where: any = {
      academicSession: { schoolId },
    };

    if (sessionId) where.academicSessionId = sessionId;
    if (query.classId) where.classId = query.classId;
    if (query.isActive !== undefined) where.isActive = query.isActive;

    const sessionClasses = await prisma.sessionClassSection.findMany({
      where,
      orderBy: [
        { class: { displayOrder: 'asc' } },
        { section: { displayOrder: 'asc' } },
      ],
      include: {
        academicSession: { select: { id: true, name: true, code: true, isCurrent: true } },
        class: { select: { id: true, name: true, code: true, displayOrder: true, isActive: true } },
        section: { select: { id: true, name: true, code: true, capacity: true, displayOrder: true, isActive: true } },
      },
    });

    return sessionClasses;
  }

  /**
   * Syncs/provisions active master classes and sections into an academic session.
   * Useful when initializing a new academic session from the school master.
   */
  public static async syncSessionClasses(
    schoolId: string,
    academicSessionId: string,
    userId?: string,
    reqMeta?: { ipAddress?: string; userAgent?: string }
  ) {
    const session = await prisma.academicSession.findFirst({
      where: { id: academicSessionId, schoolId },
    });

    if (!session) {
      throw new NotFoundError(`Academic session with ID "${academicSessionId}" not found.`);
    }

    if (session.isLocked) {
      throw new SessionLockedError(session.name);
    }

    // Fetch active classes and their active sections
    const activeClasses = await prisma.class.findMany({
      where: { schoolId, isActive: true },
      include: {
        sections: { where: { isActive: true } },
      },
    });

    let createdCount = 0;
    for (const cls of activeClasses) {
      for (const sec of cls.sections) {
        const existing = await prisma.sessionClassSection.findUnique({
          where: {
            academicSessionId_classId_sectionId: {
              academicSessionId,
              classId: cls.id,
              sectionId: sec.id,
            },
          },
        });

        if (!existing) {
          await prisma.sessionClassSection.create({
            data: {
              academicSessionId,
              classId: cls.id,
              sectionId: sec.id,
              capacity: sec.capacity ?? 40,
              isActive: true,
            },
          });
          createdCount++;
        }
      }
    }

    await logAuditEvent({
      schoolId,
      userId,
      action: 'SESSION_CLASSES_SYNCED',
      module: 'ACADEMICS',
      entityType: 'AcademicSession',
      entityId: session.id,
      details: `Provisioned ${createdCount} class-section combinations into session "${session.name}".`,
      ipAddress: reqMeta?.ipAddress,
      userAgent: reqMeta?.userAgent,
    });

    return {
      message: `Successfully synchronized ${createdCount} class-sections into academic session "${session.name}".`,
      provisionedCount: createdCount,
    };
  }

  /**
   * Toggle active status of a section within a specific academic session.
   */
  public static async toggleStatus(
    schoolId: string,
    id: string,
    isActive: boolean,
    userId?: string,
    reqMeta?: { ipAddress?: string; userAgent?: string }
  ) {
    const record = await prisma.sessionClassSection.findFirst({
      where: { id, academicSession: { schoolId } },
      include: { academicSession: true, class: true, section: true },
    });

    if (!record) {
      throw new NotFoundError(`Session class-section record with ID "${id}" not found.`);
    }

    if (record.academicSession.isLocked) {
      throw new SessionLockedError(record.academicSession.name);
    }

    const updated = await prisma.sessionClassSection.update({
      where: { id },
      data: { isActive },
      include: { academicSession: true, class: true, section: true },
    });

    await logAuditEvent({
      schoolId,
      userId,
      action: 'SESSION_CLASS_STATUS_UPDATED',
      module: 'ACADEMICS',
      entityType: 'SessionClassSection',
      entityId: id,
      newValues: { isActive },
      details: `Class "${updated.class.name}" Section "${updated.section.name}" in session "${updated.academicSession.name}" marked ${isActive ? 'active' : 'inactive'}.`,
      ipAddress: reqMeta?.ipAddress,
      userAgent: reqMeta?.userAgent,
    });

    return updated;
  }
}
