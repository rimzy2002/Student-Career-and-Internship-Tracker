const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const applicationController = require('../src/controllers/applicationController');
const { supabase } = require('../src/config/supabase');
const { createMockRequest, createMockResponse } = require('./helpers/mockHttp');

describe('Application Workflow & Status Suite', () => {
  let originalFrom;
  let originalChannel;

  let queryLog = [];
  let mockTableHandlers = {};

  beforeEach(() => {
    originalFrom = supabase.from;
    originalChannel = supabase.channel;
    queryLog = [];
    mockTableHandlers = {};

    supabase.channel = () => ({
      send: () => {}
    });

    supabase.from = (table) => {
      const state = {
        table,
        operation: 'select',
        filters: {},
        payload: null
      };

      const chain = {
        select(fields) {
          if (!state.operation || state.operation === 'select') {
            state.operation = 'select';
          }
          state.fields = fields;
          return chain;
        },
        insert(data) {
          state.operation = 'insert';
          state.payload = data;
          return chain;
        },
        update(data) {
          state.operation = 'update';
          state.payload = data;
          return chain;
        },
        delete() {
          state.operation = 'delete';
          return chain;
        },
        eq(col, val) {
          state.filters[col] = val;
          return chain;
        },
        is(col, val) {
          state.filters[`${col}_is`] = val;
          return chain;
        },
        order(col, opts) {
          state.order = { col, opts };
          return chain;
        },
        single() {
          queryLog.push(state);
          const handler = mockTableHandlers[table];
          if (handler) {
            const result = typeof handler === 'function' ? handler(state) : handler;
            return Promise.resolve(result.single || result);
          }
          return Promise.resolve({ data: { id: 101 }, error: null });
        },
        then(resolve, reject) {
          queryLog.push(state);
          const handler = mockTableHandlers[table];
          let result = { data: [], error: null };
          if (handler) {
            result = typeof handler === 'function' ? handler(state) : handler;
          }
          return Promise.resolve(result).then(resolve, reject);
        }
      };

      return chain;
    };
  });

  afterEach(() => {
    supabase.from = originalFrom;
    supabase.channel = originalChannel;
  });

  describe('Input Validation on Application Creation', () => {
    test('rejects creation with missing company_name', async () => {
      const req = createMockRequest({
        user: { userId: 'student-1' },
        body: { role_title: 'SWE Intern', date_applied: '2026-09-01' }
      });
      const res = createMockResponse();

      await applicationController.createApplication(req, res);

      assert.equal(res.statusCode, 400);
      assert.equal(res.body?.message, 'Missing required fields');
    });

    test('rejects creation with missing role_title', async () => {
      const req = createMockRequest({
        user: { userId: 'student-1' },
        body: { company_name: 'Acme Corp', date_applied: '2026-09-01' }
      });
      const res = createMockResponse();

      await applicationController.createApplication(req, res);

      assert.equal(res.statusCode, 400);
      assert.equal(res.body?.message, 'Missing required fields');
    });

    test('rejects creation with missing date_applied', async () => {
      const req = createMockRequest({
        user: { userId: 'student-1' },
        body: { company_name: 'Acme Corp', role_title: 'SWE Intern' }
      });
      const res = createMockResponse();

      await applicationController.createApplication(req, res);

      assert.equal(res.statusCode, 400);
      assert.equal(res.body?.message, 'Missing required fields');
    });
  });

  describe('Application Creation & Initial History State', () => {
    test('creates application with default Applied status (id: 1) and status history entry', async () => {
      mockTableHandlers['applications'] = {
        data: { id: 202 },
        single: { data: { id: 202 }, error: null }
      };
      mockTableHandlers['application_status_history'] = {
        data: [],
        error: null
      };

      const req = createMockRequest({
        user: { userId: 'student-42' },
        body: {
          company_name: 'Stripe',
          role_title: 'Software Engineer Intern',
          date_applied: '2026-09-15',
          notes: 'Applied via university portal'
        }
      });
      const res = createMockResponse();

      await applicationController.createApplication(req, res);

      assert.equal(res.statusCode, 201);
      assert.equal(res.body?.applicationId, 202);

      // Verify applications table insert
      const appInsert = queryLog.find(q => q.table === 'applications' && q.operation === 'insert');
      assert.ok(appInsert, 'Should perform insert into applications table');
      assert.equal(appInsert.payload[0].current_status_id, 1, 'Default status must be 1 (Applied)');
      assert.equal(appInsert.payload[0].student_id, 'student-42');
      assert.equal(appInsert.payload[0].company_name, 'Stripe');

      // Verify application_status_history table insert
      const histInsert = queryLog.find(q => q.table === 'application_status_history' && q.operation === 'insert');
      assert.ok(histInsert, 'Should log initial entry in application_status_history');
      assert.equal(histInsert.payload[0].status_id, 1);
      assert.equal(histInsert.payload[0].application_id, 202);
    });
  });

  describe('Status Transitions & History Tracking', () => {
    test('rejects update with invalid status name or missing status identifier', async () => {
      const req = createMockRequest({
        user: { userId: 'student-1' },
        params: { id: '10' },
        body: { status: 'NonExistentStatus' }
      });
      const res = createMockResponse();

      await applicationController.updateApplicationStatus(req, res);

      assert.equal(res.statusCode, 400);
      assert.match(res.body?.message, /Missing or invalid status/);
    });

    test('updates status and logs to history when transition is valid (Interview)', async () => {
      // 1. Ownership check succeeds
      mockTableHandlers['applications'] = (state) => {
        if (state.operation === 'select') {
          return { data: [{ id: 10, company_name: 'Google', role_title: 'STEP Intern' }], error: null };
        }
        if (state.operation === 'update') {
          return { data: [], error: null };
        }
        return { data: [], error: null };
      };

      const req = createMockRequest({
        user: { userId: 'student-1' },
        params: { id: '10' },
        body: { status: 'Interview', notes: 'Scheduled round 1 phone screen' }
      });
      const res = createMockResponse();

      await applicationController.updateApplicationStatus(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body?.status, 'Interview');
      assert.equal(res.body?.status_id, 2);

      // Verify update on applications table
      const appUpdate = queryLog.find(q => q.table === 'applications' && q.operation === 'update');
      assert.ok(appUpdate, 'Must update applications table');
      assert.equal(appUpdate.payload.current_status_id, 2);

      // Verify history logging
      const histInsert = queryLog.find(q => q.table === 'application_status_history' && q.operation === 'insert');
      assert.ok(histInsert, 'Must create status history record');
      assert.equal(histInsert.payload[0].status_id, 2);
      assert.equal(histInsert.payload[0].notes, 'Scheduled round 1 phone screen');
    });

    test('supports status transition using integer status_id (3 = Offer)', async () => {
      mockTableHandlers['applications'] = {
        data: [{ id: 15, company_name: 'Microsoft' }],
        error: null
      };

      const req = createMockRequest({
        user: { userId: 'student-1' },
        params: { id: '15' },
        body: { status_id: 3, notes: 'Received formal offer letter' }
      });
      const res = createMockResponse();

      await applicationController.updateApplicationStatus(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body?.status, 'Offer');
      assert.equal(res.body?.status_id, 3);
    });
  });

  describe('Multi-Tenant Access & Ownership Protection', () => {
    test('denies updating application belonging to another student (returns 404)', async () => {
      // Mock returns empty because student_id filter does not match
      mockTableHandlers['applications'] = {
        data: [], // not found for this student
        error: null
      };

      const req = createMockRequest({
        user: { userId: 'attacker-student-id' },
        params: { id: '99' },
        body: { status: 'Offer' }
      });
      const res = createMockResponse();

      await applicationController.updateApplicationStatus(req, res);

      assert.equal(res.statusCode, 404);
      assert.equal(res.body?.message, 'Application not found');
    });

    test('denies archiving application belonging to another student', async () => {
      mockTableHandlers['applications'] = {
        data: [], // empty return on update
        error: null
      };

      const req = createMockRequest({
        user: { userId: 'attacker-student-id' },
        params: { id: '99' }
      });
      const res = createMockResponse();

      await applicationController.archiveApplication(req, res);

      assert.equal(res.statusCode, 404);
      assert.equal(res.body?.message, 'Application not found');
    });
  });

  describe('Soft-Delete / Archive Behavior', () => {
    test('soft-deletes application by stamping deleted_at timestamp', async () => {
      mockTableHandlers['applications'] = {
        data: [{ id: 50 }],
        error: null
      };

      const req = createMockRequest({
        user: { userId: 'student-1' },
        params: { id: '50' }
      });
      const res = createMockResponse();

      await applicationController.archiveApplication(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body?.message, 'Application archived successfully');

      const archiveOp = queryLog.find(q => q.table === 'applications' && q.operation === 'update');
      assert.ok(archiveOp, 'Should execute update operation');
      assert.ok(archiveOp.payload.deleted_at, 'Must set deleted_at timestamp');
    });
  });

  describe('Application List Retrieval', () => {
    test('formats applications with extracted status name and skills', async () => {
      mockTableHandlers['applications'] = {
        data: [
          {
            id: 1,
            company_name: 'Netflix',
            role_title: 'Full Stack Engineer',
            current_status_id: 2,
            date_applied: '2026-09-01',
            notes: 'Referred by mentor',
            application_statuses: { id: 2, name: 'Interview' },
            application_skills: [
              { skill_id: 10, skills: { id: 10, name: 'React' } },
              { skill_id: 11, skills: { id: 11, name: 'Node.js' } }
            ],
            created_at: '2026-09-01T00:00:00Z',
            updated_at: '2026-09-05T00:00:00Z'
          }
        ],
        error: null
      };

      const req = createMockRequest({ user: { userId: 'student-1' } });
      const res = createMockResponse();

      await applicationController.getApplications(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body?.length, 1);
      const app = res.body[0];
      assert.equal(app.companyName, 'Netflix');
      assert.equal(app.status, 'Interview');
      assert.deepEqual(app.skills, [
        { id: '10', name: 'React' },
        { id: '11', name: 'Node.js' }
      ]);
    });
  });

});
