import request from 'supertest';
import type { TestContext } from './utils';

describe('Rate limiting (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    process.env.THROTTLE_ENABLED = 'true';
    const { createTestApp } = await import('./utils');
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('limits password reset requests per client', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 7; i += 1) {
      const res = await request(ctx.http).post('/api/auth/forgot-password').send({ email: 'limit@example.com' });
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 5).every((s) => s === 200)).toBe(true);
    expect(statuses.slice(5)).toEqual([429, 429]);
  });

  it('applies security headers', async () => {
    const res = await request(ctx.http).get('/api/health').expect(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
