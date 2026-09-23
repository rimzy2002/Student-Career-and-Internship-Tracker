const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const authController = require('../src/controllers/authController');
const authenticate = require('../src/middleware/auth');
const requireRole = require('../src/middleware/requireRole');
const { createMockRequest, createMockResponse } = require('./helpers/mockHttp');

const TEST_JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_for_unit_tests';

describe('Authentication & Authorization Suite', () => {

  describe('Registration Field Validation', () => {
    test('rejects registration with completely empty body', async () => {
      const req = createMockRequest({ body: {} });
      const res = createMockResponse();

      await authController.register(req, res);

      assert.equal(res.statusCode, 400);
      assert.equal(res.body?.message, 'Missing required fields');
    });

    test('rejects registration with missing email', async () => {
      const req = createMockRequest({
        body: { password: 'password123', firstName: 'Jane', lastName: 'Doe' }
      });
      const res = createMockResponse();

      await authController.register(req, res);

      assert.equal(res.statusCode, 400);
      assert.equal(res.body?.message, 'Missing required fields');
    });

    test('rejects registration with missing password', async () => {
      const req = createMockRequest({
        body: { email: 'jane@example.com', firstName: 'Jane', lastName: 'Doe' }
      });
      const res = createMockResponse();

      await authController.register(req, res);

      assert.equal(res.statusCode, 400);
      assert.equal(res.body?.message, 'Missing required fields');
    });

    test('rejects registration with missing first or last name', async () => {
      const req1 = createMockRequest({
        body: { email: 'jane@example.com', password: 'pass', lastName: 'Doe' }
      });
      const res1 = createMockResponse();
      await authController.register(req1, res1);
      assert.equal(res1.statusCode, 400);

      const req2 = createMockRequest({
        body: { email: 'jane@example.com', password: 'pass', firstName: 'Jane' }
      });
      const res2 = createMockResponse();
      await authController.register(req2, res2);
      assert.equal(res2.statusCode, 400);
    });
  });

  describe('Login Field Validation', () => {
    test('rejects login with missing email or password', async () => {
      const testCases = [
        {},
        { email: 'user@example.com' },
        { password: 'secretpassword' }
      ];

      for (const body of testCases) {
        const req = createMockRequest({ body });
        const res = createMockResponse();

        await authController.login(req, res);

        assert.equal(res.statusCode, 400);
        assert.equal(res.body?.message, 'Missing email or password');
      }
    });
  });

  describe('Google Authentication Security', () => {
    test('rejects Google login request without idToken', async () => {
      const req = createMockRequest({ body: {} });
      const res = createMockResponse();

      await authController.googleLogin(req, res);

      assert.equal(res.statusCode, 401);
      assert.equal(res.body?.message, 'Authentication required: missing ID token');
    });

    test('rejects malformed or unverified Google token', async () => {
      const req = createMockRequest({
        body: {
          idToken: 'malformed.garbage.token_not_from_google'
        }
      });
      const res = createMockResponse();

      await authController.googleLogin(req, res);

      assert.equal(res.statusCode, 401);
      assert.match(res.body?.message, /Invalid or expired Google authentication token|missing ID token/);
    });

    test('rejects forged client identity payload when token lacks valid signature', async () => {
      // Simulates an attacker sending forged email/claims in a tampered JWT
      const forgedToken = jwt.sign(
        { email: 'admin@university.edu', role: 'admin' },
        'attacker_private_key'
      );

      const req = createMockRequest({ body: { idToken: forgedToken } });
      const res = createMockResponse();

      await authController.googleLogin(req, res);

      assert.equal(res.statusCode, 401);
      assert.equal(res.body?.message, 'Invalid or expired Google authentication token');
    });
  });

  describe('JWT Verification Middleware (authenticate)', () => {
    test('rejects request without Authorization header', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      let nextCalled = false;

      authenticate(req, res, () => { nextCalled = true; });

      assert.equal(nextCalled, false);
      assert.equal(res.statusCode, 401);
      assert.match(res.body?.message, /Missing or invalid token format/);
    });

    test('rejects request with malformed Authorization format (missing Bearer)', () => {
      const req = createMockRequest({
        headers: { authorization: 'Basic dXNlcjpwYXNz' }
      });
      const res = createMockResponse();
      let nextCalled = false;

      authenticate(req, res, () => { nextCalled = true; });

      assert.equal(nextCalled, false);
      assert.equal(res.statusCode, 401);
      assert.match(res.body?.message, /Missing or invalid token format/);
    });

    test('rejects request with invalid token signature', () => {
      const invalidToken = jwt.sign({ userId: 'fake', role: 'student' }, 'wrong_secret');
      const req = createMockRequest({
        headers: { authorization: `Bearer ${invalidToken}` }
      });
      const res = createMockResponse();
      let nextCalled = false;

      authenticate(req, res, () => { nextCalled = true; });

      assert.equal(nextCalled, false);
      assert.equal(res.statusCode, 401);
      assert.equal(res.body?.message, 'Invalid token.');
    });

    test('rejects request with expired token', () => {
      const expiredToken = jwt.sign(
        { userId: '123', role: 'student' },
        TEST_JWT_SECRET,
        { expiresIn: '-1s' } // Expired 1 second ago
      );

      const req = createMockRequest({
        headers: { authorization: `Bearer ${expiredToken}` }
      });
      const res = createMockResponse();
      let nextCalled = false;

      authenticate(req, res, () => { nextCalled = true; });

      assert.equal(nextCalled, false);
      assert.equal(res.statusCode, 401);
      assert.equal(res.body?.message, 'Token expired.');
    });

    test('authenticates valid token and attaches user payload to req.user', () => {
      const validPayload = { userId: 'student-99', role: 'student' };
      const validToken = jwt.sign(validPayload, TEST_JWT_SECRET, { expiresIn: '1h' });

      const req = createMockRequest({
        headers: { authorization: `Bearer ${validToken}` }
      });
      const res = createMockResponse();
      let nextCalled = false;

      authenticate(req, res, () => { nextCalled = true; });

      assert.equal(nextCalled, true);
      assert.equal(res.statusCode, 200); // untouched default
      assert.equal(req.user?.userId, 'student-99');
      assert.equal(req.user?.role, 'student');
    });
  });

  describe('Role-Based Access Control Middleware (requireRole)', () => {
    test('denies access if user is not attached to request', () => {
      const middleware = requireRole('admin');
      const req = createMockRequest({ user: null });
      const res = createMockResponse();
      let nextCalled = false;

      middleware(req, res, () => { nextCalled = true; });

      assert.equal(nextCalled, false);
      assert.equal(res.statusCode, 403);
      assert.match(res.body?.message, /Insufficient privileges/);
    });

    test('denies student role from accessing admin-restricted routes', () => {
      const middleware = requireRole('admin');
      const req = createMockRequest({
        user: { userId: 'student-1', role: 'student' }
      });
      const res = createMockResponse();
      let nextCalled = false;

      middleware(req, res, () => { nextCalled = true; });

      assert.equal(nextCalled, false);
      assert.equal(res.statusCode, 403);
      assert.match(res.body?.message, /Insufficient privileges/);
    });

    test('allows admin role to access admin-restricted routes', () => {
      const middleware = requireRole('admin');
      const req = createMockRequest({
        user: { userId: 'admin-1', role: 'admin' }
      });
      const res = createMockResponse();
      let nextCalled = false;

      middleware(req, res, () => { nextCalled = true; });

      assert.equal(nextCalled, true);
      assert.equal(res.statusCode, 200);
    });

    test('allows user with matching role in multi-role configuration', () => {
      const middleware = requireRole('admin', 'counselor');
      const req = createMockRequest({
        user: { userId: 'admin-2', role: 'admin' }
      });
      const res = createMockResponse();
      let nextCalled = false;

      middleware(req, res, () => { nextCalled = true; });

      assert.equal(nextCalled, true);
    });
  });

});
