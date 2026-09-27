import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('Kids World School ERP — Foundation Endpoints', () => {
  it('GET / should return online status and API links', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Kids World School ERP — API Core');
    expect(res.body.status).toBe('ONLINE');
    expect(res.body.health).toBe('/api/v1/health');
  });

  it('GET /api/v1/health should return system health response structure', async () => {
    const res = await request(app).get('/api/v1/health');
    // 200 if DB reachable, 503 if DB offline (graceful degradation)
    expect([200, 503]).toContain(res.status);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('status');
    expect(res.body.data).toHaveProperty('services');
    expect(res.body.data).toHaveProperty('version');
    expect(res.body.data.version).toContain('1.0.0');
  });

  it('GET /api/v1/system/info should return school identity and architecture roadmap', async () => {
    const res = await request(app).get('/api/v1/system/info');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.school.name).toBe('Kids World School');
    expect(res.body.data.school.location).toBe('Madhya Pradesh, India');
    expect(res.body.data.architecture.step).toBe('Step 1 - Project Foundation & Architecture');
  });

  it('GET /api/v1/non-existent-route should return structured 404 error response', async () => {
    const res = await request(app).get('/api/v1/non-existent-route');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('NOT_FOUND');
    expect(res.body).toHaveProperty('timestamp');
  });
});
