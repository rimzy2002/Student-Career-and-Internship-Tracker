const { test, describe } = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const { calculateCohortsMetrics, getCohortsAnalytics } = require('../src/controllers/adminController');
const { createMockRequest, createMockResponse } = require('./helpers/mockHttp');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

describe('Admin Cohorts Calculation & Analytics Suite', () => {

  describe('Pure Cohort Calculation Engine (calculateCohortsMetrics)', () => {
    test('returns empty array when student list is empty or null', () => {
      assert.deepStrictEqual(calculateCohortsMetrics([], []), []);
      assert.deepStrictEqual(calculateCohortsMetrics(null, []), []);
      assert.deepStrictEqual(calculateCohortsMetrics(undefined, undefined), []);
    });

    test('handles zero students without division-by-zero errors', () => {
      const result = calculateCohortsMetrics([], [{ id: 1, student_id: 1, current_status_id: 3 }]);
      assert.strictEqual(result.length, 0);
    });

    test('groups students correctly by graduation_year and aggregates applications', () => {
      const mockStudents = [
        { id: 1, graduation_year: 2026, major: 'Computer Science' },
        { id: 2, graduation_year: 2026, major: 'Software Engineering' },
        { id: 3, graduation_year: 2025, major: 'Data Science' },
        { id: 4, graduation_year: null, major: 'Information Systems' }
      ];

      const mockApplications = [
        // Student 1 (Class of 2026): 2 apps, 1 offer -> placed
        { id: 101, student_id: 1, current_status_id: 1 },
        { id: 102, student_id: 1, current_status_id: 3 },
        // Student 2 (Class of 2026): 1 app, interview -> not placed
        { id: 103, student_id: 2, current_status_id: 2 },
        // Student 3 (Class of 2025): 2 apps, 2 offers -> placed (deduplicated to 1 placed student)
        { id: 104, student_id: 3, current_status_id: 3 },
        { id: 105, student_id: 3, current_status_id: 3 },
        // Student 4 (Unassigned): 1 app, applied -> not placed
        { id: 106, student_id: 4, current_status_id: 1 }
      ];

      const cohorts = calculateCohortsMetrics(mockStudents, mockApplications);

      // Should have 3 cohorts: 2026, 2025, Unassigned
      assert.strictEqual(cohorts.length, 3);

      // Class of 2026 checks
      const c2026 = cohorts.find(c => c.graduationYear === 2026);
      assert.ok(c2026, 'Class of 2026 cohort should exist');
      assert.strictEqual(c2026.name, 'Class of 2026');
      assert.strictEqual(c2026.totalStudents, 2);
      assert.strictEqual(c2026.totalApplications, 3);
      assert.strictEqual(c2026.placedStudents, 1);
      assert.strictEqual(c2026.activeApplications, 2); // 1 applied + 1 interview
      // Placement rate: 1 / 2 * 100 = 50%
      assert.strictEqual(c2026.placementRate, 50);
      assert.ok(c2026.majors.includes('Computer Science'));
      assert.ok(c2026.majors.includes('Software Engineering'));

      // Class of 2025 checks
      const c2025 = cohorts.find(c => c.graduationYear === 2025);
      assert.ok(c2025, 'Class of 2025 cohort should exist');
      assert.strictEqual(c2025.totalStudents, 1);
      assert.strictEqual(c2025.placedStudents, 1);
      assert.strictEqual(c2025.totalApplications, 2);
      // Placement rate: 1 / 1 * 100 = 100%
      assert.strictEqual(c2025.placementRate, 100);

      // Unassigned checks
      const cUnassigned = cohorts.find(c => c.graduationYear === null);
      assert.ok(cUnassigned, 'Unassigned cohort should exist');
      assert.strictEqual(cUnassigned.name, 'General Student Cohort');
      assert.strictEqual(cUnassigned.totalStudents, 1);
      assert.strictEqual(cUnassigned.placedStudents, 0);
      assert.strictEqual(cUnassigned.placementRate, 0);
    });

    test('deduplicates multiple offers so placed count never exceeds total students', () => {
      const mockStudents = [
        { id: 10, graduation_year: 2027, major: 'Cybersecurity' }
      ];

      // Student has 4 separate offers
      const mockApplications = [
        { id: 1, student_id: 10, current_status_id: 3 },
        { id: 2, student_id: 10, current_status_id: 3 },
        { id: 3, student_id: 10, current_status_id: 3 },
        { id: 4, student_id: 10, current_status_id: 3 }
      ];

      const cohorts = calculateCohortsMetrics(mockStudents, mockApplications);
      assert.strictEqual(cohorts[0].totalStudents, 1);
      assert.strictEqual(cohorts[0].placedStudents, 1);
      assert.strictEqual(cohorts[0].placementRate, 100);
      assert.strictEqual(cohorts[0].totalApplications, 4);
    });

    test('sorts cohorts descending by graduation year with unassigned at the end', () => {
      const mockStudents = [
        { id: 1, graduation_year: 2024 },
        { id: 2, graduation_year: null },
        { id: 3, graduation_year: 2028 },
        { id: 4, graduation_year: 2026 }
      ];

      const cohorts = calculateCohortsMetrics(mockStudents, []);
      const years = cohorts.map(c => c.graduationYear);
      assert.deepStrictEqual(years, [2028, 2026, 2024, null]);
    });
  });

  describe('Admin Cohorts Controller & Route Security', () => {
    test('rejects request without Authorization header with 401', async () => {
      const authenticate = require('../src/middleware/auth');
      const req = createMockRequest({ headers: {} });
      const res = createMockResponse();

      await authenticate(req, res, () => {});
      assert.strictEqual(res.statusCode, 401);
      assert.match(res.body.message, /Authentication required/i);
    });

    test('rejects student role from accessing admin route with 403', async () => {
      const requireRole = require('../src/middleware/requireRole');
      const studentGuard = requireRole('admin');
      const req = createMockRequest({
        user: { userId: 1, email: 'student@example.com', role: 'student' }
      });
      const res = createMockResponse();

      let nextCalled = false;
      studentGuard(req, res, () => { nextCalled = true; });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 403);
      assert.match(res.body.message, /Forbidden/i);
    });

    test('allows admin role to access admin route', async () => {
      const requireRole = require('../src/middleware/requireRole');
      const adminGuard = requireRole('admin');
      const req = createMockRequest({
        user: { userId: 2, email: 'admin@careertrack.edu', role: 'admin' }
      });
      const res = createMockResponse();

      let nextCalled = false;
      adminGuard(req, res, () => { nextCalled = true; });

      assert.strictEqual(nextCalled, true);
    });
  });
});
