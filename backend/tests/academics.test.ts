import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { config } from '../src/config';
import { prisma } from '../src/core/database/prisma';

const app = createApp();

describe('Kids World School ERP — Step 3: Academic Structure & Master Configuration Test Suite', () => {
  let superAdminToken: string;
  let teacherToken: string;

  let createdSessionId: string;
  let testClassId: string;
  let testClass2Id: string;
  let testSectionId: string;
  let testSubjectId: string;
  let testElectiveSubjectId: string;
  let testClassSubjectId: string;

  beforeAll(async () => {
    // 1. Obtain Super Admin JWT token
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: config.SUPER_ADMIN_EMAIL,
        password: config.SUPER_ADMIN_PASSWORD,
      });
    expect(adminRes.status).toBe(200);
    superAdminToken = adminRes.body.data.accessToken;

    // 2. Obtain Teacher JWT token (for RBAC forbidden checks)
    const teacherRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: 'teacher@kidsworldschool.com',
        password: 'Staff@KWS2026#',
      });
    expect(teacherRes.status).toBe(200);
    teacherToken = teacherRes.body.data.accessToken;
  });

  // =========================================================================
  // 1. ACADEMIC SESSIONS MANAGEMENT
  // =========================================================================
  describe('Academic Session Management', () => {
    it('POST /api/v1/academic-sessions > should reject creation with invalid date range (start >= end)', async () => {
      const res = await request(app)
        .post('/api/v1/academic-sessions')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: '2029-2030',
          code: 'AY-2029-30',
          startDate: '2030-04-01T00:00:00.000Z',
          endDate: '2029-03-31T23:59:59.000Z', // End before start
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('VALIDATION_ERROR');
    });

    it('POST /api/v1/academic-sessions > should create a new academic session', async () => {
      // Clean up previous test sessions if present
      await prisma.academicSession.deleteMany({
        where: { code: { in: ['AY-2027-28', 'AY-2028-29'] } },
      });

      const res = await request(app)
        .post('/api/v1/academic-sessions')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: '2027-2028',
          code: 'AY-2027-28',
          startDate: '2027-04-01T00:00:00.000Z',
          endDate: '2028-03-31T23:59:59.000Z',
          description: 'Upcoming Academic Session 2027-2028',
          isCurrent: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('2027-2028');
      expect(res.body.data.code).toBe('AY-2027-28');
      expect(res.body.data.isCurrent).toBe(false);
      expect(res.body.data.isLocked).toBe(false);

      createdSessionId = res.body.data.id;
    });

    it('GET /api/v1/academic-sessions > should list sessions with metadata', async () => {
      const res = await request(app)
        .get('/api/v1/academic-sessions')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.meta).toHaveProperty('total');
    });

    it('GET /api/v1/academic-sessions/current > should retrieve the active academic session', async () => {
      const res = await request(app)
        .get('/api/v1/academic-sessions/current')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isCurrent).toBe(true);
      expect(res.body.data.code).toBe('AY-2026-27');
    });

    it('PATCH /api/v1/academic-sessions/:id/activate > should enforce single current session rule', async () => {
      const activateRes = await request(app)
        .patch(`/api/v1/academic-sessions/${createdSessionId}/activate`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(activateRes.status).toBe(200);
      expect(activateRes.body.data.isCurrent).toBe(true);

      // Verify that old session is no longer current
      const oldSession = await prisma.academicSession.findFirst({
        where: { code: 'AY-2026-27' },
      });
      expect(oldSession?.isCurrent).toBe(false);

      // Switch back to AY-2026-27
      if (oldSession) {
        await request(app)
          .patch(`/api/v1/academic-sessions/${oldSession.id}/activate`)
          .set('Authorization', `Bearer ${superAdminToken}`);
      }
    });

    it('PATCH /api/v1/academic-sessions/:id/lock > should lock session and reject mutations', async () => {
      // Lock the created session (now non-current)
      const lockRes = await request(app)
        .patch(`/api/v1/academic-sessions/${createdSessionId}/lock`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(lockRes.status).toBe(200);
      expect(lockRes.body.data.isLocked).toBe(true);

      // Attempt update on locked session -> should fail with 423 Locked
      const updateRes = await request(app)
        .put(`/api/v1/academic-sessions/${createdSessionId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ name: '2027-2028 Renamed' });

      expect(updateRes.status).toBe(423);
      expect(updateRes.body.success).toBe(false);
      expect(updateRes.body.errorCode).toBe('SESSION_LOCKED');
    });
  });

  // =========================================================================
  // 2. CLASS MASTER
  // =========================================================================
  describe('Class Master Management', () => {
    it('POST /api/v1/classes > should create a new academic class', async () => {
      // Clean up previous test class if present
      await prisma.class.deleteMany({
        where: { code: { in: ['TEST-01', 'TEST-02'] } },
      });

      const res = await request(app)
        .post('/api/v1/classes')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Playgroup Test',
          code: 'TEST-01',
          displayOrder: 99,
          description: 'Early childhood development class',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Playgroup Test');
      expect(res.body.data.code).toBe('TEST-01');
      expect(res.body.data.isActive).toBe(true);

      testClassId = res.body.data.id;
    });

    it('POST /api/v1/classes > should reject duplicate class code or name with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/classes')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Playgroup Test Duplicate',
          code: 'TEST-01', // Duplicate code
          displayOrder: 100,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('CONFLICT');
    });

    it('GET /api/v1/classes > should list all classes ordered by displayOrder', async () => {
      const res = await request(app)
        .get('/api/v1/classes')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(15);
    });

    it('PUT /api/v1/classes/:id > should update class details', async () => {
      const res = await request(app)
        .put(`/api/v1/classes/${testClassId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Playgroup Alpha',
          displayOrder: 98,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Playgroup Alpha');
      expect(res.body.data.displayOrder).toBe(98);
    });

    it('PATCH /api/v1/classes/:id/status > should toggle active/deactivate status', async () => {
      const res = await request(app)
        .patch(`/api/v1/classes/${testClassId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);

      // Reactivate
      await request(app)
        .patch(`/api/v1/classes/${testClassId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ isActive: true });
    });
  });

  // =========================================================================
  // 3. SECTION MASTER & CLASS → SECTION RELATIONSHIP
  // =========================================================================
  describe('Section Master Management', () => {
    it('POST /api/v1/sections > should create a section under a class', async () => {
      const res = await request(app)
        .post('/api/v1/sections')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          classId: testClassId,
          name: 'Sunflower',
          code: 'SF',
          capacity: 25,
          displayOrder: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Sunflower');
      expect(res.body.data.code).toBe('SF');
      expect(res.body.data.classId).toBe(testClassId);

      testSectionId = res.body.data.id;
    });

    it('POST /api/v1/sections > should prevent duplicate section in the SAME class', async () => {
      const res = await request(app)
        .post('/api/v1/sections')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          classId: testClassId,
          name: 'Sunflower',
          code: 'SF',
        });

      expect(res.status).toBe(409);
      expect(res.body.errorCode).toBe('CONFLICT');
    });

    it('POST /api/v1/sections > should allow SAME section name in a DIFFERENT class', async () => {
      // Create second test class
      const class2Res = await request(app)
        .post('/api/v1/classes')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Toddlers Test',
          code: 'TEST-02',
          displayOrder: 101,
        });
      testClass2Id = class2Res.body.data.id;

      // Create section with same name 'Sunflower' in class 2
      const res = await request(app)
        .post('/api/v1/sections')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          classId: testClass2Id,
          name: 'Sunflower',
          code: 'SF',
          capacity: 30,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Sunflower');
      expect(res.body.data.classId).toBe(testClass2Id);
    });

    it('GET /api/v1/sections > should filter sections by classId', async () => {
      const res = await request(app)
        .get(`/api/v1/sections?classId=${testClassId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('Sunflower');
    });

    it('PUT /api/v1/sections/:id > should update section capacity and code', async () => {
      const res = await request(app)
        .put(`/api/v1/sections/${testSectionId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ capacity: 35 });

      expect(res.status).toBe(200);
      expect(res.body.data.capacity).toBe(35);
    });
  });

  // =========================================================================
  // 4. SUBJECT MASTER
  // =========================================================================
  describe('Subject Master Management', () => {
    it('POST /api/v1/subjects > should create a core academic subject', async () => {
      await prisma.subject.deleteMany({
        where: { code: { in: ['ROBOTICS', 'FRENCH'] } },
      });

      const res = await request(app)
        .post('/api/v1/subjects')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Robotics & AI',
          code: 'ROBOTICS',
          type: 'BOTH',
          displayOrder: 20,
          description: 'Hands-on practical robotics lab',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Robotics & AI');
      expect(res.body.data.code).toBe('ROBOTICS');
      expect(res.body.data.type).toBe('BOTH');

      testSubjectId = res.body.data.id;
    });

    it('POST /api/v1/subjects > should create an elective language subject', async () => {
      const res = await request(app)
        .post('/api/v1/subjects')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'French Language',
          code: 'FRENCH',
          type: 'THEORY',
          displayOrder: 21,
        });

      expect(res.status).toBe(201);
      testElectiveSubjectId = res.body.data.id;
    });

    it('POST /api/v1/subjects > should reject duplicate subject code with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/subjects')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Duplicate Robotics',
          code: 'ROBOTICS',
        });

      expect(res.status).toBe(409);
      expect(res.body.errorCode).toBe('CONFLICT');
    });

    it('GET /api/v1/subjects > should list all subjects in the catalog', async () => {
      const res = await request(app)
        .get('/api/v1/subjects')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(12);
    });

    it('PUT /api/v1/subjects/:id > should update subject metadata', async () => {
      const res = await request(app)
        .put(`/api/v1/subjects/${testSubjectId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ description: 'Updated syllabus for 2026-2027' });

      expect(res.status).toBe(200);
      expect(res.body.data.description).toBe('Updated syllabus for 2026-2027');
    });
  });

  // =========================================================================
  // 5. CLASS → SUBJECT MAPPING (WITH OPTIONAL/ELECTIVE SUPPORT)
  // =========================================================================
  describe('Class-Subject Mapping', () => {
    it('POST /api/v1/class-subjects > should map a compulsory subject to a class', async () => {
      const res = await request(app)
        .post('/api/v1/class-subjects')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          classId: testClassId,
          subjectId: testSubjectId,
          isCompulsory: true,
          weeklyPeriods: 4,
          totalMarks: 100,
          passingMarks: 33,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.classId).toBe(testClassId);
      expect(res.body.data.subjectId).toBe(testSubjectId);
      expect(res.body.data.isCompulsory).toBe(true);

      testClassSubjectId = res.body.data.id;
    });

    it('POST /api/v1/class-subjects > should map an optional/elective subject to a class', async () => {
      const res = await request(app)
        .post('/api/v1/class-subjects')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          classId: testClassId,
          subjectId: testElectiveSubjectId,
          isCompulsory: false, // Elective
          weeklyPeriods: 2,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.isCompulsory).toBe(false);
    });

    it('POST /api/v1/class-subjects > should reject duplicate mapping for the same session with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/class-subjects')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          classId: testClassId,
          subjectId: testSubjectId,
        });

      expect(res.status).toBe(409);
      expect(res.body.errorCode).toBe('CONFLICT');
    });

    it('GET /api/v1/class-subjects > should filter mappings by classId and compulsory flag', async () => {
      const res = await request(app)
        .get(`/api/v1/class-subjects?classId=${testClassId}&isCompulsory=false`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].subject.name).toBe('French Language');
    });

    it('PUT /api/v1/class-subjects/:id > should update weekly periods and marks', async () => {
      const res = await request(app)
        .put(`/api/v1/class-subjects/${testClassSubjectId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          weeklyPeriods: 6,
          passingMarks: 40,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.weeklyPeriods).toBe(6);
      expect(res.body.data.passingMarks).toBe(40);
    });

    it('DELETE /api/v1/class-subjects/:id > should remove mapped subject from class', async () => {
      const res = await request(app)
        .delete(`/api/v1/class-subjects/${testClassSubjectId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // =========================================================================
  // 6. SYSTEM CONFIGURATION
  // =========================================================================
  describe('Centralized System Configuration', () => {
    it('GET /api/v1/configs/public > should return public school configs without auth token', async () => {
      const res = await request(app).get('/api/v1/configs/public');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const schoolName = res.body.data.find((c: any) => c.key === 'school_name');
      expect(schoolName).toBeDefined();
      expect(schoolName.value).toBe('Kids World School');
    });

    it('GET /api/v1/configs > should return all configurations for Super Admin', async () => {
      const res = await request(app)
        .get('/api/v1/configs')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(10);
    });

    it('POST /api/v1/configs > should create or upsert a configuration key', async () => {
      const res = await request(app)
        .post('/api/v1/configs')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          category: 'fees',
          key: 'test_discount_threshold',
          value: '10',
          dataType: 'number',
          isPublic: false,
          description: 'Test discount threshold configuration',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.key).toBe('test_discount_threshold');
      expect(res.body.data.value).toBe('10');
    });

    it('GET /api/v1/configs/:category/:key > should fetch single configuration', async () => {
      const res = await request(app)
        .get('/api/v1/configs/fees/test_discount_threshold')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.value).toBe('10');
    });

    it('DELETE /api/v1/configs/:category/:key > should delete configuration', async () => {
      const res = await request(app)
        .delete('/api/v1/configs/fees/test_discount_threshold')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // =========================================================================
  // 7. RBAC AUTHORIZATION & SECURITY
  // =========================================================================
  describe('RBAC Authorization & Security Guards', () => {
    it('should reject unauthenticated request with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/v1/classes');
      expect(res.status).toBe(401);
      expect(res.body.errorCode).toBe('UNAUTHORIZED');
    });

    it('should allow Teacher to view classes (has classes:view / academics:view)', async () => {
      const res = await request(app)
        .get('/api/v1/classes')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should forbid Teacher from creating classes with 403 Forbidden (lacks classes:create)', async () => {
      const res = await request(app)
        .post('/api/v1/classes')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          name: 'Unauthorized Class',
          code: 'UNAUTH-01',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('FORBIDDEN');
    });

    it('should forbid Teacher from activating academic sessions with 403 Forbidden', async () => {
      const res = await request(app)
        .patch(`/api/v1/academic-sessions/${createdSessionId}/activate`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(403);
      expect(res.body.errorCode).toBe('FORBIDDEN');
    });

    it('should forbid Teacher from modifying system configurations with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/configs')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          category: 'general',
          key: 'school_name',
          value: 'Hacked School Name',
        });

      expect(res.status).toBe(403);
      expect(res.body.errorCode).toBe('FORBIDDEN');
    });
  });

  // =========================================================================
  // 8. AUDIT LOG RECORDING
  // =========================================================================
  describe('Audit Trail Verification', () => {
    it('should have recorded audit log records for master actions', async () => {
      const logs = await prisma.auditLog.findMany({
        where: { module: 'ACADEMICS' },
        take: 5,
        orderBy: { createdAt: 'desc' },
      });

      expect(logs.length).toBeGreaterThan(0);
      const actions = logs.map((l) => l.action);
      expect(
        actions.some((a) =>
          [
            'ACADEMIC_SESSION_CREATED',
            'CLASS_CREATED',
            'SECTION_CREATED',
            'SUBJECT_CREATED',
            'CLASS_SUBJECT_MAPPED',
          ].includes(a)
        )
      ).toBe(true);
    });
  });
});
