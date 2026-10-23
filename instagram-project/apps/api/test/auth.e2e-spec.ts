import request from 'supertest';
import { auth, createTestApp, refreshCookieFrom, registerUser, resetDatabase, TestContext } from './utils';

describe('Auth (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
    await resetDatabase(ctx.prisma);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  describe('registration', () => {
    it('creates a user, returns an access token and sets an httpOnly refresh cookie', async () => {
      const res = await request(ctx.http)
        .post('/api/auth/register')
        .send({ email: 'Madina@Example.com ', username: 'Madina.Dev', fullName: 'Madina', password: 'Secret123' })
        .expect(201);
      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.user).toMatchObject({ email: 'madina@example.com', username: 'madina.dev', emailVerified: false });
      expect(res.body.user.passwordHash).toBeUndefined();
      const cookie = (res.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('rt='));
      expect(cookie).toMatch(/HttpOnly/);
      expect(cookie).toMatch(/SameSite=Strict/);
      expect(cookie).toMatch(/Path=\/api\/auth/);
      expect(ctx.mail.last('madina@example.com', 'verify')?.token).toEqual(expect.any(String));
    });

    it('stores only a password hash and only hashed refresh tokens', async () => {
      const user = await ctx.prisma.user.findUniqueOrThrow({ where: { username: 'madina.dev' } });
      expect(user.passwordHash).not.toContain('Secret123');
      expect(user.passwordHash.startsWith('$2')).toBe(true);
      const tokens = await ctx.prisma.refreshToken.findMany({ where: { session: { userId: user.id } } });
      expect(tokens.length).toBeGreaterThan(0);
      for (const token of tokens) {
        expect(token.tokenHash).toMatch(/^[a-f0-9]{64}$/);
      }
    });

    it('rejects duplicate email and username with 409', async () => {
      await request(ctx.http)
        .post('/api/auth/register')
        .send({ email: 'madina@example.com', username: 'other.name', fullName: 'X', password: 'Secret123' })
        .expect(409);
      await request(ctx.http)
        .post('/api/auth/register')
        .send({ email: 'other@example.com', username: 'madina.dev', fullName: 'X', password: 'Secret123' })
        .expect(409);
    });

    it('validates input: weak password, bad username, unknown fields', async () => {
      const weak = await request(ctx.http)
        .post('/api/auth/register')
        .send({ email: 'a@example.com', username: 'valid_name', fullName: 'A', password: 'password' })
        .expect(400);
      expect(JSON.stringify(weak.body.message)).toContain('Password must be');
      await request(ctx.http)
        .post('/api/auth/register')
        .send({ email: 'b@example.com', username: '.bad..name', fullName: 'B', password: 'Secret123' })
        .expect(400);
      await request(ctx.http)
        .post('/api/auth/register')
        .send({ email: 'c@example.com', username: 'cname', fullName: 'C', password: 'Secret123', isVerified: true })
        .expect(400);
    });
  });

  describe('login', () => {
    it('accepts email or username', async () => {
      await request(ctx.http).post('/api/auth/login').send({ login: 'madina@example.com', password: 'Secret123' }).expect(200);
      const res = await request(ctx.http).post('/api/auth/login').send({ login: 'MADINA.DEV', password: 'Secret123' }).expect(200);
      expect(res.body.user.username).toBe('madina.dev');
    });

    it('returns the same 401 for unknown user and wrong password', async () => {
      const unknown = await request(ctx.http).post('/api/auth/login').send({ login: 'nobody', password: 'Secret123' }).expect(401);
      const wrong = await request(ctx.http).post('/api/auth/login').send({ login: 'madina.dev', password: 'Wrong1234' }).expect(401);
      expect(unknown.body.message).toBe(wrong.body.message);
    });

    it('locks the account after 5 failed attempts (brute-force protection)', async () => {
      const victim = await registerUser(ctx.http, 'victim');
      for (let i = 0; i < 5; i += 1) {
        await request(ctx.http).post('/api/auth/login').send({ login: victim.username, password: 'Wrong1234' }).expect(401);
      }
      await request(ctx.http).post('/api/auth/login').send({ login: victim.username, password: victim.password }).expect(429);
      await ctx.prisma.user.update({ where: { id: victim.id }, data: { lockedUntil: new Date(Date.now() - 1000) } });
      await request(ctx.http).post('/api/auth/login').send({ login: victim.username, password: victim.password }).expect(200);
    });
  });

  describe('protected routes', () => {
    it('require a valid access token', async () => {
      await request(ctx.http).get('/api/auth/me').expect(401);
      await request(ctx.http).get('/api/auth/me').set('Authorization', 'Bearer not-a-jwt').expect(401);
      const user = await registerUser(ctx.http);
      const me = await request(ctx.http).get('/api/auth/me').set(...auth(user)).expect(200);
      expect(me.body.id).toBe(user.id);
    });

    it('reject a token signed with another secret', async () => {
      const forged =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwic2lkIjoiMSJ9.lR2PZ4gYvA0bDqF9Sxkq7VZ8ZxBq3d2p6Yk5d1k3XjQ';
      await request(ctx.http).get('/api/auth/me').set('Authorization', `Bearer ${forged}`).expect(401);
    });
  });

  describe('refresh token rotation', () => {
    it('issues a new refresh token and invalidates the old one', async () => {
      const user = await registerUser(ctx.http, 'rot');
      const first = await request(ctx.http).post('/api/auth/refresh').set('Cookie', user.cookie).expect(200);
      const secondCookie = refreshCookieFrom(first);
      expect(secondCookie).not.toBe(user.cookie);
      expect(first.body.accessToken).toEqual(expect.any(String));

      const second = await request(ctx.http).post('/api/auth/refresh').set('Cookie', secondCookie).expect(200);
      const thirdCookie = refreshCookieFrom(second);
      expect(thirdCookie).not.toBe(secondCookie);
    });

    it('detects reuse of a rotated token and revokes the whole session', async () => {
      const user = await registerUser(ctx.http, 'reuse');
      const rotated = await request(ctx.http).post('/api/auth/refresh').set('Cookie', user.cookie).expect(200);
      const freshCookie = refreshCookieFrom(rotated);
      const freshAccess = rotated.body.accessToken as string;

      const reuse = await request(ctx.http).post('/api/auth/refresh').set('Cookie', user.cookie).expect(401);
      expect(reuse.body.message).toBe('Refresh token reuse detected');

      await request(ctx.http).post('/api/auth/refresh').set('Cookie', freshCookie).expect(401);
      await request(ctx.http).get('/api/auth/me').set('Authorization', `Bearer ${freshAccess}`).expect(401);
    });

    it('rejects missing or unknown refresh tokens', async () => {
      await request(ctx.http).post('/api/auth/refresh').expect(401);
      await request(ctx.http).post('/api/auth/refresh').set('Cookie', 'rt=unknown-token-value').expect(401);
    });
  });

  describe('logout and sessions', () => {
    it('logout revokes the session: access and refresh tokens stop working', async () => {
      const user = await registerUser(ctx.http, 'logout');
      const res = await request(ctx.http).post('/api/auth/logout').set('Cookie', user.cookie).expect(204);
      const cleared = (res.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('rt='));
      expect(cleared).toMatch(/Expires=Thu, 01 Jan 1970/);
      await request(ctx.http).get('/api/auth/me').set(...auth(user)).expect(401);
      await request(ctx.http).post('/api/auth/refresh').set('Cookie', user.cookie).expect(401);
    });

    it('lists sessions and revokes one of them', async () => {
      const user = await registerUser(ctx.http, 'sess');
      const second = await request(ctx.http).post('/api/auth/login').send({ login: user.username, password: user.password }).expect(200);
      const list = await request(ctx.http).get('/api/sessions').set(...auth(user)).expect(200);
      expect(list.body).toHaveLength(2);
      const other = (list.body as { id: string; current: boolean }[]).find((s) => !s.current);
      await request(ctx.http).delete(`/api/sessions/${other?.id}`).set(...auth(user)).expect(204);
      await request(ctx.http).get('/api/auth/me').set('Authorization', `Bearer ${second.body.accessToken}`).expect(401);
      await request(ctx.http).get('/api/auth/me').set(...auth(user)).expect(200);
    });

    it('does not allow revoking another user session', async () => {
      const a = await registerUser(ctx.http, 'sa');
      const b = await registerUser(ctx.http, 'sb');
      const bSessions = await request(ctx.http).get('/api/sessions').set(...auth(b)).expect(200);
      await request(ctx.http).delete(`/api/sessions/${bSessions.body[0].id}`).set(...auth(a)).expect(403);
    });
  });

  describe('email verification', () => {
    it('verifies email with the token from the letter, token is single-use', async () => {
      const user = await registerUser(ctx.http, 'verify');
      const token = ctx.mail.last(user.email, 'verify')?.token as string;
      await request(ctx.http).post('/api/auth/verify-email').send({ token }).expect(200);
      const me = await request(ctx.http).get('/api/auth/me').set(...auth(user)).expect(200);
      expect(me.body.emailVerified).toBe(true);
      await request(ctx.http).post('/api/auth/verify-email').send({ token }).expect(400);
      await request(ctx.http).post('/api/auth/resend-verification').set(...auth(user)).expect(400);
    });
  });

  describe('password reset', () => {
    it('answers the same for unknown email', async () => {
      const res = await request(ctx.http).post('/api/auth/forgot-password').send({ email: 'ghost@example.com' }).expect(200);
      expect(res.body.message).toContain('If this email is registered');
    });

    it('resets the password and revokes all sessions', async () => {
      const user = await registerUser(ctx.http, 'reset');
      await request(ctx.http).post('/api/auth/forgot-password').send({ email: user.email }).expect(200);
      const token = ctx.mail.last(user.email, 'reset')?.token as string;
      await request(ctx.http).post('/api/auth/reset-password').send({ token, newPassword: 'weak' }).expect(400);
      await request(ctx.http).post('/api/auth/reset-password').send({ token, newPassword: 'NewSecret456' }).expect(200);
      await request(ctx.http).get('/api/auth/me').set(...auth(user)).expect(401);
      await request(ctx.http).post('/api/auth/login').send({ login: user.username, password: user.password }).expect(401);
      await request(ctx.http).post('/api/auth/login').send({ login: user.username, password: 'NewSecret456' }).expect(200);
      await request(ctx.http).post('/api/auth/reset-password').send({ token, newPassword: 'Another789' }).expect(400);
    });
  });

  describe('change password', () => {
    it('requires the current password and keeps only the current session', async () => {
      const user = await registerUser(ctx.http, 'chpw');
      const other = await request(ctx.http).post('/api/auth/login').send({ login: user.username, password: user.password }).expect(200);
      await request(ctx.http)
        .post('/api/auth/change-password')
        .set(...auth(user))
        .send({ currentPassword: 'Wrong1234', newPassword: 'Changed789' })
        .expect(400);
      const res = await request(ctx.http)
        .post('/api/auth/change-password')
        .set(...auth(user))
        .send({ currentPassword: user.password, newPassword: 'Changed789' })
        .expect(200);
      expect(res.body.revokedSessions).toBe(1);
      await request(ctx.http).get('/api/auth/me').set(...auth(user)).expect(200);
      await request(ctx.http).get('/api/auth/me').set('Authorization', `Bearer ${other.body.accessToken}`).expect(401);
      await request(ctx.http).post('/api/auth/login').send({ login: user.username, password: 'Changed789' }).expect(200);
    });
  });

  describe('account management', () => {
    it('changes username (unique) and email (needs password, resets verification)', async () => {
      const a = await registerUser(ctx.http, 'acc');
      const b = await registerUser(ctx.http, 'acc');
      await request(ctx.http).patch('/api/users/me/username').set(...auth(a)).send({ username: b.username }).expect(409);
      const renamed = await request(ctx.http).patch('/api/users/me/username').set(...auth(a)).send({ username: 'renamed.user' }).expect(200);
      expect(renamed.body.username).toBe('renamed.user');

      await request(ctx.http).patch('/api/users/me/email').set(...auth(a)).send({ email: 'new@example.com', password: 'Wrong1234' }).expect(400);
      const changed = await request(ctx.http)
        .patch('/api/users/me/email')
        .set(...auth(a))
        .send({ email: 'new@example.com', password: a.password })
        .expect(200);
      expect(changed.body).toMatchObject({ email: 'new@example.com', emailVerified: false });
      expect(ctx.mail.last('new@example.com', 'verify')).toBeDefined();
      expect(ctx.mail.last(a.email, 'notice')).toBeDefined();
    });

    it('deletes the account with password confirmation', async () => {
      const user = await registerUser(ctx.http, 'del');
      await request(ctx.http).delete('/api/users/me').set(...auth(user)).send({ password: 'Wrong1234' }).expect(400);
      await request(ctx.http).delete('/api/users/me').set(...auth(user)).send({ password: user.password }).expect(204);
      expect(await ctx.prisma.user.findUnique({ where: { id: user.id } })).toBeNull();
      await request(ctx.http).get('/api/auth/me').set(...auth(user)).expect(401);
    });
  });
});
