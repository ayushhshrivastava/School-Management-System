import { prisma } from '../../../core/database/prisma';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  SessionLockedError,
} from '../../../core/errors/AppError';
import { logAuditEvent } from '../../../core/audit/auditLogger';

export class SessionService {
  /**
   * List academic sessions with optional pagination, current filter, locked filter, or text search.
   */
  public static async listSessions(
    schoolId: string,
    query: {
      page?: number;
      limit?: number;
      search?: string;
      isCurrent?: boolean;
      isLocked?: boolean;
    }
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { schoolId };

    if (query.isCurrent !== undefined) {
      where.isCurrent = query.isCurrent;
    }

    if (query.isLocked !== undefined) {
      where.isLocked = query.isLocked;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, sessions] = await Promise.all([
      prisma.academicSession.count({ where }),
      prisma.academicSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isCurrent: 'desc' }, { startDate: 'desc' }],
        include: {
          _count: {
            select: {
              sessionClassSections: true,
              classSubjects: true,
            },
          },
        },
      }),
    ]);

    return {
      sessions,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves a single academic session by ID.
   */
  public static async getSessionById(schoolId: string, sessionId: string) {
    const session = await prisma.academicSession.findFirst({
      where: { id: sessionId, schoolId },
      include: {
        _count: {
          select: {
            sessionClassSections: true,
            classSubjects: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundError(`Academic session with ID "${sessionId}" not found.`);
    }

    return session;
  }

  /**
   * Retrieves the currently active academic session for the school.
   */
  public static async getCurrentSession(schoolId: string) {
    const current = await prisma.academicSession.findFirst({
      where: { schoolId, isCurrent: true },
      include: {
        _count: {
          select: {
            sessionClassSections: true,
            classSubjects: true,
          },
        },
      },
    });

    if (!current) {
      throw new NotFoundError('No active academic session is currently configured for this institution.');
    }

    return current;
  }

  /**
   * Creates a new academic session.
   * If `isCurrent` is true, automatically deactivates any existing current session.
   */
  public static async createSession(
    schoolId: string,
    data: {
      name: string;
      code: string;
      startDate: string;
      endDate: string;
      isCurrent?: boolean;
      description?: string | null;
    },
    userId?: string,
    reqMeta?: { ipAddress?: string; userAgent?: string }
  ) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);

    if (start >= end) {
      throw new BadRequestError('Start date must be strictly earlier than end date.');
    }

    // Check code/name conflicts within school
    const conflict = await prisma.academicSession.findFirst({
      where: {
        schoolId,
        OR: [{ code: data.code.trim() }, { name: data.name.trim() }],
      },
    });

    if (conflict) {
      if (conflict.code.toLowerCase() === data.code.trim().toLowerCase()) {
        throw new ConflictError(`Academic session with code "${data.code}" already exists.`);
      }
      throw new ConflictError(`Academic session with name "${data.name}" already exists.`);
    }

    // Execute atomic transaction if setting as current
    const createdSession = await prisma.$transaction(async (tx) => {
      if (data.isCurrent) {
        await tx.academicSession.updateMany({
          where: { schoolId, isCurrent: true },
          data: { isCurrent: false },
        });
      }

      return tx.academicSession.create({
        data: {
          schoolId,
          name: data.name.trim(),
          code: data.code.trim().toUpperCase(),
          startDate: start,
          endDate: end,
          isCurrent: data.isCurrent || false,
          isLocked: false,
          description: data.description?.trim() || null,
        },
      });
    });

    await logAuditEvent({
      schoolId,
      userId,
      action: 'ACADEMIC_SESSION_CREATED',
      module: 'ACADEMICS',
      entityType: 'AcademicSession',
      entityId: createdSession.id,
      newValues: {
        name: createdSession.name,
        code: createdSession.code,
        isCurrent: createdSession.isCurrent,
        startDate: createdSession.startDate,
        endDate: createdSession.endDate,
      },
      ipAddress: reqMeta?.ipAddress,
      userAgent: reqMeta?.userAgent,
      details: `Academic session "${createdSession.name}" (${createdSession.code}) created.`,
    });

    return createdSession;
  }

  /**
   * Updates an academic session.
   * Modifying locked sessions is strictly forbidden.
   */
  public static async updateSession(
    schoolId: string,
    sessionId: string,
    data: {
      name?: string;
      code?: string;
      startDate?: string;
      endDate?: string;
      description?: string | null;
    },
    userId?: string,
    reqMeta?: { ipAddress?: string; userAgent?: string }
  ) {
    const session = await prisma.academicSession.findFirst({
      where: { id: sessionId, schoolId },
    });

    if (!session) {
      throw new NotFoundError(`Academic session with ID "${sessionId}" not found.`);
    }

    // Rule: Locked sessions cannot be mutated
    if (session.isLocked) {
      throw new SessionLockedError(session.name);
    }

    const start = data.startDate ? new Date(data.startDate) : session.startDate;
    const end = data.endDate ? new Date(data.endDate) : session.endDate;

    if (start >= end) {
      throw new BadRequestError('Start date must be strictly earlier than end date.');
    }

    // Uniqueness checks if updating code or name
    if (data.code || data.name) {
      const conflict = await prisma.academicSession.findFirst({
        where: {
          schoolId,
          id: { not: sessionId },
          OR: [
            data.code ? { code: data.code.trim().toUpperCase() } : {},
            data.name ? { name: data.name.trim() } : {},
          ],
        },
      });

      if (conflict) {
        throw new ConflictError('Another academic session with this name or code already exists.');
      }
    }

    const updated = await prisma.academicSession.update({
      where: { id: sessionId },
      data: {
        name: data.name ? data.name.trim() : undefined,
        code: data.code ? data.code.trim().toUpperCase() : undefined,
        startDate: data.startDate ? start : undefined,
        endDate: data.endDate ? end : undefined,
        description: data.description !== undefined ? data.description?.trim() || null : undefined,
      },
    });

    await logAuditEvent({
      schoolId,
      userId,
      action: 'ACADEMIC_SESSION_UPDATED',
      module: 'ACADEMICS',
      entityType: 'AcademicSession',
      entityId: updated.id,
      oldValues: {
        name: session.name,
        code: session.code,
        startDate: session.startDate,
        endDate: session.endDate,
      },
      newValues: {
        name: updated.name,
        code: updated.code,
        startDate: updated.startDate,
        endDate: updated.endDate,
      },
      ipAddress: reqMeta?.ipAddress,
      userAgent: reqMeta?.userAgent,
      details: `Academic session "${updated.name}" updated.`,
    });

    return updated;
  }

  /**
   * Sets the specified session as current/active and deactivates any existing active session.
   */
  public static async activateSession(
    schoolId: string,
    sessionId: string,
    userId?: string,
    reqMeta?: { ipAddress?: string; userAgent?: string }
  ) {
    const session = await prisma.academicSession.findFirst({
      where: { id: sessionId, schoolId },
    });

    if (!session) {
      throw new NotFoundError(`Academic session with ID "${sessionId}" not found.`);
    }

    if (session.isLocked) {
      throw new BadRequestError(`Cannot activate locked/archived session "${session.name}". Unlock or duplicate it first.`);
    }

    // Atomic transaction: mark all false, target true
    const updated = await prisma.$transaction(async (tx) => {
      await tx.academicSession.updateMany({
        where: { schoolId, isCurrent: true },
        data: { isCurrent: false },
      });

      const active = await tx.academicSession.update({
        where: { id: sessionId },
        data: { isCurrent: true },
      });

      // Update SystemConfig current_session_code if present
      await tx.systemConfig.upsert({
        where: {
          schoolId_category_key: {
            schoolId,
            category: 'academic',
            key: 'current_session_code',
          },
        },
        update: { value: active.code },
        create: {
          schoolId,
          category: 'academic',
          key: 'current_session_code',
          value: active.code,
          dataType: 'string',
          isPublic: true,
          description: 'Active academic session code',
        },
      });

      return active;
    });

    await logAuditEvent({
      schoolId,
      userId,
      action: 'ACADEMIC_SESSION_ACTIVATED',
      module: 'ACADEMICS',
      entityType: 'AcademicSession',
      entityId: updated.id,
      details: `Academic session "${updated.name}" (${updated.code}) marked as active/current. Previous current session deactivated.`,
      ipAddress: reqMeta?.ipAddress,
      userAgent: reqMeta?.userAgent,
    });

    return updated;
  }

  /**
   * Locks and archives an academic session to prevent accidental mutation of historical records.
   */
  public static async lockSession(
    schoolId: string,
    sessionId: string,
    userId?: string,
    reqMeta?: { ipAddress?: string; userAgent?: string }
  ) {
    const session = await prisma.academicSession.findFirst({
      where: { id: sessionId, schoolId },
    });

    if (!session) {
      throw new NotFoundError(`Academic session with ID "${sessionId}" not found.`);
    }

    if (session.isCurrent) {
      throw new BadRequestError('Cannot lock the currently active academic session. Please switch the active session before locking this one.');
    }

    const locked = await prisma.academicSession.update({
      where: { id: sessionId },
      data: { isLocked: true },
    });

    await logAuditEvent({
      schoolId,
      userId,
      action: 'ACADEMIC_SESSION_LOCKED',
      module: 'ACADEMICS',
      entityType: 'AcademicSession',
      entityId: locked.id,
      details: `Academic session "${locked.name}" (${locked.code}) was archived and locked.`,
      ipAddress: reqMeta?.ipAddress,
      userAgent: reqMeta?.userAgent,
    });

    return locked;
  }
}
