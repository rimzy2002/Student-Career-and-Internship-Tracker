const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');

const {
  authLimiter,
  aiMatchLimiter,
  createAuthLimiter,
  createAiMatchLimiter,
  DEFAULT_AUTH_WINDOW_MS,
  DEFAULT_AUTH_MAX,
  DEFAULT_AI_WINDOW_MS,
  DEFAULT_AI_MAX
} = require('../src/middleware/rateLimiters');

const authenticate = require('../src/middleware/auth');
const requireRole = require('../src/middleware/requireRole');
const app = require('../src/app');

const TEST_JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_for_unit_tests';

describe('Production-Safe API Rate Limiting Suite', () => {

  describe('Configuration & Default Policies', () => {
    test('authLimiter has 15-minute window and 10-attempt threshold', () => {
      assert.equal(DEFAULT_AUTH_WINDOW_MS, 15 * 60 * 1000);
      assert.equal(DEFAULT_AUTH_MAX, 10);
      assert.equal(typeof authLimiter, 'function');
    });

    test('aiMatchLimiter has 1-hour window and 10-request threshold', () => {
      assert.equal(DEFAULT_AI_WINDOW_MS, 60 * 60 * 1000);
      assert.equal(DEFAULT_AI_MAX, 10);
      assert.equal(typeof aiMatchLimiter, 'function');
    });
  });

  describe('Authentication Rate Limiter (authLimiter)', () => {
    let server;
    let baseUrl;

    before(async () => {
      const testApp = express();
      testApp.set('trust proxy', true);
      testApp.use(express.json());

      const testLimiter = createAuthLimiter({
        limit: 3,
        windowMs: 60 * 1000,
        validate: { trustProxy: false, xForwardedForHeader: false }
      });

      testApp.post('/api/v1/auth/login', testLimiter, (req, res) => {
        res.status(200).json({ success: true, message: 'Login successful' });
      });

      await new Promise((resolve) => {
        server = testApp.listen(0, '127.0.0.1', () => {
          const port = server.address().port;
          baseUrl = `http://127.0.0.1:${port}`;
          resolve();
        });
      });
    });

    after(async () => {
      if (server) {
        await new Promise((resolve) => server.close(resolve));
      }
    });

    test('allows login requests below the limit (HTTP 200)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.10' },
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
    });

    test('eventually rejects repeated login attempts exceeding the limit with HTTP 429', async () => {
      const clientIp = '198.51.100.20';
      const options = {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': clientIp },
        body: JSON.stringify({ email: 'brute@example.com', password: 'wrong' })
      };

      // Attempts 1, 2, 3 should be accepted
      for (let i = 1; i <= 3; i++) {
        const res = await fetch(`${baseUrl}/api/v1/auth/login`, options);
        assert.equal(res.status, 200, `Attempt ${i} should succeed below limit`);
      }

      // Attempt 4 should trigger 429
      const blockedRes = await fetch(`${baseUrl}/api/v1/auth/login`, options);
      assert.equal(blockedRes.status, 429);
      const data = await blockedRes.json();
      assert.deepEqual(data, {
        message: 'Too many authentication attempts. Please try again later.'
      });
    });

    test('returns safe JSON without leaking internal server information', async () => {
      const clientIp = '198.51.100.30';
      const options = {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': clientIp }
      };

      for (let i = 0; i < 4; i++) {
        await fetch(`${baseUrl}/api/v1/auth/login`, options);
      }

      const res = await fetch(`${baseUrl}/api/v1/auth/login`, options);
      assert.equal(res.status, 429);
      assert.equal(res.headers.get('content-type')?.includes('application/json'), true);

      const body = await res.json();
      assert.equal(body.message, 'Too many authentication attempts. Please try again later.');
      assert.equal(body.stack, undefined);
      assert.equal(body.internal, undefined);
    });

    test('includes standard RateLimit headers and omits legacy X-RateLimit headers', async () => {
      const clientIp = '198.51.100.40';
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': clientIp }
      });

      // standard draft headers enabled
      assert.ok(res.headers.get('ratelimit-policy') || res.headers.get('ratelimit-limit') || res.headers.get('ratelimit'));
      // legacy X-RateLimit headers disabled
      assert.equal(res.headers.get('x-ratelimit-limit'), null);
      assert.equal(res.headers.get('x-ratelimit-remaining'), null);
    });

    test('isolates rate limits across distinct client IP addresses', async () => {
      const ipA = '198.51.100.50';
      const ipB = '198.51.100.51';

      // Exhaust limit for IP A
      for (let i = 0; i < 3; i++) {
        await fetch(`${baseUrl}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'x-forwarded-for': ipA }
        });
      }
      const resA = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'x-forwarded-for': ipA }
      });
      assert.equal(resA.status, 429, 'IP A should be rate-limited');

      // IP B should remain unaffected
      const resB = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'x-forwarded-for': ipB }
      });
      assert.equal(resB.status, 200, 'IP B should not be affected by IP A exhaustion');
    });
  });

  describe('AI Resume Match Rate Limiter (aiMatchLimiter)', () => {
    let server;
    let baseUrl;

    before(async () => {
      const testApp = express();
      testApp.set('trust proxy', true);
      testApp.use(express.json());

      // Mock auth decoding
      testApp.use((req, res, next) => {
        const auth = req.headers['authorization'];
        if (auth && auth.startsWith('Bearer ')) {
          const token = auth.replace('Bearer ', '');
          if (token.startsWith('user_')) {
            req.user = { userId: token, role: 'student' };
          }
        }
        next();
      });

      const testLimiter = createAiMatchLimiter({
        limit: 2,
        windowMs: 60 * 1000,
        validate: { trustProxy: false, xForwardedForHeader: false }
      });

      testApp.post('/api/v1/students/me/resume-match', testLimiter, (req, res) => {
        res.status(200).json({ matchScore: 85, summary: 'Good match' });
      });

      await new Promise((resolve) => {
        server = testApp.listen(0, '127.0.0.1', () => {
          const port = server.address().port;
          baseUrl = `http://127.0.0.1:${port}`;
          resolve();
        });
      });
    });

    after(async () => {
      if (server) {
        await new Promise((resolve) => server.close(resolve));
      }
    });

    test('AI requests below the threshold are accepted by limiter', async () => {
      const res = await fetch(`${baseUrl}/api/v1/students/me/resume-match`, {
        method: 'POST',
        headers: { authorization: 'Bearer user_student_alpha' }
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.matchScore, 85);
    });

    test('requests exceeding threshold return 429 with safe user-facing message', async () => {
      const studentToken = 'Bearer user_student_exhaust';

      // 1st request: OK
      const r1 = await fetch(`${baseUrl}/api/v1/students/me/resume-match`, {
        method: 'POST',
        headers: { authorization: studentToken }
      });
      assert.equal(r1.status, 200);

      // 2nd request: OK (at limit)
      const r2 = await fetch(`${baseUrl}/api/v1/students/me/resume-match`, {
        method: 'POST',
        headers: { authorization: studentToken }
      });
      assert.equal(r2.status, 200);

      // 3rd request: Exceeded -> 429
      const r3 = await fetch(`${baseUrl}/api/v1/students/me/resume-match`, {
        method: 'POST',
        headers: { authorization: studentToken }
      });
      assert.equal(r3.status, 429);
      const data = await r3.json();
      assert.deepEqual(data, {
        message: 'Too many AI matching requests. Please try again later.'
      });
    });

    test('isolates rate limits by authenticated student identity', async () => {
      const studentOne = 'Bearer user_student_one';
      const studentTwo = 'Bearer user_student_two';

      // Exhaust student one
      await fetch(`${baseUrl}/api/v1/students/me/resume-match`, { method: 'POST', headers: { authorization: studentOne } });
      await fetch(`${baseUrl}/api/v1/students/me/resume-match`, { method: 'POST', headers: { authorization: studentOne } });
      const blockedOne = await fetch(`${baseUrl}/api/v1/students/me/resume-match`, { method: 'POST', headers: { authorization: studentOne } });
      assert.equal(blockedOne.status, 429, 'Student One should be blocked');

      // Student two should not be blocked
      const allowedTwo = await fetch(`${baseUrl}/api/v1/students/me/resume-match`, { method: 'POST', headers: { authorization: studentTwo } });
      assert.equal(allowedTwo.status, 200, 'Student Two should not be affected by Student One');
    });

    test('student identity/IP limiter cannot be bypassed using arbitrary request body fields', async () => {
      const studentTarget = 'Bearer user_student_spoof';

      // Exhaust studentTarget
      await fetch(`${baseUrl}/api/v1/students/me/resume-match`, { method: 'POST', headers: { authorization: studentTarget } });
      await fetch(`${baseUrl}/api/v1/students/me/resume-match`, { method: 'POST', headers: { authorization: studentTarget } });

      // Attempt to spoof a different identity in body
      const spoofAttempt = await fetch(`${baseUrl}/api/v1/students/me/resume-match`, {
        method: 'POST',
        headers: {
          authorization: studentTarget,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          userId: 'user_someone_else',
          studentId: 'user_someone_else',
          email: 'someoneelse@university.edu'
        })
      });

      assert.equal(spoofAttempt.status, 429, 'Spoofed body fields must not bypass user-bound rate limiter');
    });

    test('falls back to IP-based rate limiting if unauthenticated', async () => {
      const ipUnauth = '198.51.100.99';

      const r1 = await fetch(`${baseUrl}/api/v1/students/me/resume-match`, {
        method: 'POST',
        headers: { 'x-forwarded-for': ipUnauth }
      });
      assert.equal(r1.status, 200);

      const r2 = await fetch(`${baseUrl}/api/v1/students/me/resume-match`, {
        method: 'POST',
        headers: { 'x-forwarded-for': ipUnauth }
      });
      assert.equal(r2.status, 200);

      const r3 = await fetch(`${baseUrl}/api/v1/students/me/resume-match`, {
        method: 'POST',
        headers: { 'x-forwarded-for': ipUnauth }
      });
      assert.equal(r3.status, 429, 'Unauthenticated requests should fall back to IP limiting');
    });
  });

  describe('Integration & Route Security in Live App', () => {
    let server;
    let baseUrl;

    before(async () => {
      await new Promise((resolve) => {
        server = app.listen(0, '127.0.0.1', () => {
          const port = server.address().port;
          baseUrl = `http://127.0.0.1:${port}`;
          resolve();
        });
      });
    });

    after(async () => {
      if (server) {
        await new Promise((resolve) => server.close(resolve));
      }
    });

    test('AI endpoint still requires authentication (HTTP 401)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/students/me/resume-match`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jobDescription: 'test', resumeText: 'test' })
      });

      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.message.includes('Authentication required'), true);
    });

    test('AI endpoint rejects non-student roles with HTTP 403', async () => {
      const adminToken = jwt.sign(
        { userId: 'admin_123', role: 'admin' },
        TEST_JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await fetch(`${baseUrl}/api/v1/students/me/resume-match`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ jobDescription: 'test', resumeText: 'test' })
      });

      assert.equal(res.status, 403);
      const data = await res.json();
      assert.equal(data.message.includes('Forbidden'), true);
    });

    test('normal unrelated API endpoints are not rate-limited by auth or AI policies', async () => {
      // Hit health endpoint 15 times consecutively
      for (let i = 0; i < 15; i++) {
        const res = await fetch(`${baseUrl}/api/v1/health`);
        assert.equal(res.status, 200);
      }
    });
  });
});
