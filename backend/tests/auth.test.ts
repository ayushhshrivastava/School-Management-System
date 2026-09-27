import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { config } from '../src/config';
import { prisma } from '../src/core/database/prisma';

const app = createApp();

describe('Kids World School ERP — Authentication & RBAC Test Suite', () => {
  let superAdminToken: string;
  let superAdminRefreshToken: string;
  let accountantToken: string;
  let teacherToken: string;

  // 1. LOGIN TESTS
  describe('POST /api/v1/auth/login', () => {
    it('should successfully log in with Super Admin credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: config.SUPER_ADMIN_EMAIL,
          password: config.SUPER_ADMIN_PASSWORD,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(config.SUPER_ADMIN_EMAIL);
      expect(res.body.data.user.isSuperAdmin).toBe(true);
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.headers['set-cookie']).toBeDefined();

      superAdminToken = res.body.data.accessToken;

      // Extract refresh token from cookie
      const cookies = res.headers['set-cookie'];
      const refreshCookie = cookies.find((c: string) => c.startsWith('refreshToken='));
      expect(refreshCookie).toBeDefined();
      superAdminRefreshToken = refreshCookie.split(';')[0].split('=')[1];
    });

    it('should successfully log in Accountant and Teacher demo accounts', async () => {
      // Accountant
      const accRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ identifier: 'accountant@kidsworldschool.com', password: 'Staff@KWS2026#' });
      expect(accRes.status).toBe(200);
      expect(accRes.body.data.user.roles).toContain('ACCOUNTANT');
      accountantToken = accRes.body.data.accessToken;

      // Teacher
      const teachRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ identifier: 'teacher@kidsworldschool.com', password: 'Staff@KWS2026#' });
      expect(teachRes.status).toBe(200);
      expect(teachRes.body.data.user.roles).toContain('TEACHER');
      teacherToken = teachRes.body.data.accessToken;
    });

    it('should reject login with wrong password and generic error message', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: config.SUPER_ADMIN_EMAIL,
          password: 'WrongPassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid username/email or password');
    });

    it('should reject login for non-existent user with generic error message', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: 'nonexistent_user@kidsworldschool.com',
          password: 'SomePassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid username/email or password');
    });

    it('should lock an account after 5 consecutive failed login attempts', async () => {
      // Create a temporary test user for lockout testing
      const testUser = await prisma.user.upsert({
        where: { email: 'lockout_test@kidsworldschool.com' },
        update: { failedLoginAttempts: 0, lockedUntil: null },
        create: {
          schoolId: (await prisma.school.findFirst())!.id,
          username: 'lockout_test',
          email: 'lockout_test@kidsworldschool.com',
          fullName: 'Lockout Test User',
          passwordHash: '$2b$12$e8jU9e/V8r7gJ1wQYt3/QeLpYmB2I.zV0.K9WzQ1xYt3/QeLpYmB2',
          isActive: true,
        },
      });

      // Send 5 failed attempts
      for (let i = 0; i < 4; i++) {
        const res = await request(app)
          .post('/api/v1/auth/login')
          .send({ identifier: testUser.email, password: 'WrongPassword' });
        expect(res.status).toBe(401);
      }

      // 5th attempt triggers lockout
      const lockRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ identifier: testUser.email, password: 'WrongPassword' });

      expect(lockRes.status).toBe(423);
      expect(lockRes.body.errorCode).toBe('ACCOUNT_LOCKED');
      expect(lockRes.body.message).toContain('Account locked due to 5 failed login attempts');

      // Subsequent attempt while locked also rejected
      const nextAttempt = await request(app)
        .post('/api/v1/auth/login')
        .send({ identifier: testUser.email, password: 'WrongPassword' });
      expect(nextAttempt.status).toBe(423);
      expect(nextAttempt.body.errorCode).toBe('ACCOUNT_LOCKED');

      // Clean up test user
      await prisma.user.delete({ where: { id: testUser.id } });
    });
  });

  // 2. CURRENT USER PROFILE (/me)
  describe('GET /api/v1/auth/me', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return profile for valid Bearer token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(config.SUPER_ADMIN_EMAIL);
      expect(res.body.data).toHaveProperty('roles');
      expect(res.body.data).toHaveProperty('permissions');
      expect(res.body.data).not.toHaveProperty('passwordHash');
    });

    it('should reject request with tampered token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.tampered.token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // 3. RBAC AUTHORIZATION GUARDS
  describe('RBAC Authorization Guards', () => {
    it('Super Admin should pass permission guard via bypass', async () => {
      const res = await request(app)
        .get('/api/v1/auth/test-permission')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Permission check passed');
    });

    it('Teacher with students:view should pass test-permission', async () => {
      const res = await request(app)
        .get('/api/v1/auth/test-permission')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Permission check passed');
    });

    it('Accountant should pass test-role (requires ACCOUNTANT or SUPER_ADMIN)', async () => {
      const res = await request(app)
        .get('/api/v1/auth/test-role')
        .set('Authorization', `Bearer ${accountantToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Role check passed');
    });

    it('Teacher should be rejected with 403 Forbidden on test-role (lacks ACCOUNTANT role)', async () => {
      const res = await request(app)
        .get('/api/v1/auth/test-role')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(403);
      expect(res.body.errorCode).toBe('FORBIDDEN');
      expect(res.body.message).toContain('Access requires one of the following roles: ACCOUNTANT, SUPER_ADMIN');
    });
  });

  // 4. REFRESH TOKEN ROTATION & REUSE DETECTION
  describe('POST /api/v1/auth/refresh', () => {
    it('should issue a new access token and rotate refresh token cookie', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`refreshToken=${superAdminRefreshToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.headers['set-cookie']).toBeDefined();

      const newCookie = res.headers['set-cookie'].find((c: string) => c.startsWith('refreshToken='));
      const newRefreshToken = newCookie.split(';')[0].split('=')[1];
      expect(newRefreshToken).not.toBe(superAdminRefreshToken);

      // Subsequent attempt with OLD already-used refresh token should trigger reuse detection!
      const reuseRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`refreshToken=${superAdminRefreshToken}`]);

      expect(reuseRes.status).toBe(401);
      expect(reuseRes.body.message).toContain('Security violation detected');
    });
  });

  // 5. PASSWORD CHANGE
  describe('POST /api/v1/auth/change-password', () => {
    it('should reject password change if current password is wrong', async () => {
      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          currentPassword: 'WrongPassword!',
          newPassword: 'NewSecurePass@2026#',
          confirmPassword: 'NewSecurePass@2026#',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Current password is incorrect');
    });

    it('should reject password change if new password does not meet complexity rules', async () => {
      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          currentPassword: config.SUPER_ADMIN_PASSWORD,
          newPassword: 'simple',
          confirmPassword: 'simple',
        });

      expect(res.status).toBe(422);
      expect(res.body.errorCode).toBe('VALIDATION_ERROR');
    });
  });

  // 6. LOGOUT
  describe('POST /api/v1/auth/logout', () => {
    it('should log out successfully and clear refresh token cookie', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const cookieHeader = res.headers['set-cookie'];
      expect(cookieHeader).toBeDefined();
      expect(cookieHeader[0]).toContain('refreshToken=;');
    });
  });

  // 7. AUDIT TRAIL LOGGING
  describe('Audit Trail Verification', () => {
    it('should have recorded authentication audit log entries', async () => {
      const logs = await prisma.auditLog.findMany({
        where: { module: 'AUTH' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      expect(logs.length).toBeGreaterThan(0);
      const actions = logs.map((l) => l.action);
      expect(actions).toContain('LOGIN_SUCCESS');
      expect(actions).toContain('LOGIN_FAILED');
      expect(actions).toContain('LOGOUT');
    });
  });
});
