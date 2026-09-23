const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const fs = require('node:fs');
const path = require('node:path');

const {
  bootstrapAdmin,
  validateAdminInput,
  MIN_PASSWORD_LENGTH,
  INSECURE_PASSWORDS
} = require('../scripts/createAdmin');

describe('Secure Admin Bootstrap Suite', () => {

  describe('Input Validation & Security Rules', () => {
    test('rejects missing or empty ADMIN_EMAIL', () => {
      assert.throws(
        () => validateAdminInput({ email: '', password: 'ValidPassword123!' }),
        /ADMIN_EMAIL is required/
      );
      assert.throws(
        () => validateAdminInput({ email: null, password: 'ValidPassword123!' }),
        /ADMIN_EMAIL is required/
      );
      assert.throws(
        () => validateAdminInput({ password: 'ValidPassword123!' }),
        /ADMIN_EMAIL is required/
      );
    });

    test('rejects invalid email address format', () => {
      assert.throws(
        () => validateAdminInput({ email: 'notanemail', password: 'ValidPassword123!' }),
        /valid email address/
      );
    });

    test('rejects missing or empty ADMIN_PASSWORD', () => {
      assert.throws(
        () => validateAdminInput({ email: 'admin@school.edu', password: '' }),
        /ADMIN_PASSWORD is required/
      );
      assert.throws(
        () => validateAdminInput({ email: 'admin@school.edu', password: null }),
        /ADMIN_PASSWORD is required/
      );
    });

    test('enforces minimum password length rule (>= 10 characters)', () => {
      assert.equal(MIN_PASSWORD_LENGTH >= 10, true);
      assert.throws(
        () => validateAdminInput({ email: 'admin@school.edu', password: 'Short9!' }),
        /at least 10 characters long/
      );
    });

    test('rejects known default or placeholder passwords', () => {
      const knownInsecure = [
        'ChangeMe123!',
        'changeme123',
        'adminpassword123!',
        'password123',
        '1234567890',
        'admin@school.edu' // password equals email
      ];

      for (const insecurePass of knownInsecure) {
        assert.throws(
          () => validateAdminInput({ email: 'admin@school.edu', password: insecurePass }),
          /Insecure or placeholder ADMIN_PASSWORD rejected/,
          `Should reject insecure password "${insecurePass}"`
        );
      }
    });

    test('accepts valid credentials and provides sensible name defaults', () => {
      const res = validateAdminInput({
        email: 'SecureAdmin@University.edu',
        password: 'ValidSuperSecretKey2026!'
      });

      assert.equal(res.email, 'secureadmin@university.edu');
      assert.equal(res.firstName, 'System');
      assert.equal(res.lastName, 'Admin');
    });
  });

  describe('Mocked Bootstrap Execution & Data Protection', () => {
    function createMockSupabase(existingUsers = []) {
      const insertedRows = [];
      const mockClient = {
        insertedRows,
        from(tableName) {
          assert.equal(tableName, 'users');
          return {
            select(fields) {
              return {
                eq(field, value) {
                  assert.equal(field, 'email');
                  const found = existingUsers.filter((u) => u.email === value);
                  return Promise.resolve({ data: found, error: null });
                }
              };
            },
            insert(rows) {
              insertedRows.push(...rows);
              return {
                select() {
                  return {
                    single() {
                      const row = rows[0];
                      return Promise.resolve({
                        data: { id: 999, email: row.email, role: row.role },
                        error: null
                      });
                    }
                  };
                }
              };
            }
          };
        }
      };
      return mockClient;
    }

    test('hashes password using bcrypt and assigns admin role', async () => {
      const mockClient = createMockSupabase([]);
      const rawPassword = 'StrongProductionAdminPassword2026!';

      const result = await bootstrapAdmin(
        {
          email: 'newadmin@domain.edu',
          password: rawPassword,
          firstName: 'Platform',
          lastName: 'Director'
        },
        mockClient
      );

      assert.equal(result.success, true);
      assert.equal(result.status, 'created');
      assert.equal(result.user.role, 'admin');

      // Verify inserted row in database mock
      assert.equal(mockClient.insertedRows.length, 1);
      const inserted = mockClient.insertedRows[0];
      assert.equal(inserted.role, 'admin');
      assert.equal(inserted.email, 'newadmin@domain.edu');
      assert.equal(inserted.first_name, 'Platform');
      assert.equal(inserted.last_name, 'Director');

      // Verify password was hashed and plaintext is NOT stored
      assert.equal(inserted.password, undefined);
      assert.notEqual(inserted.password_hash, rawPassword);
      assert.equal(inserted.password_hash.startsWith('$2b$10$'), true);

      // Verify bcrypt can compare the hash successfully
      const isMatch = await bcrypt.compare(rawPassword, inserted.password_hash);
      assert.equal(isMatch, true);
    });

    test('does not log or return plaintext password in result messages', async () => {
      const mockClient = createMockSupabase([]);
      const rawPassword = 'SuperSecretUnrevealedAdminPassword!';

      const result = await bootstrapAdmin(
        {
          email: 'safelog@domain.edu',
          password: rawPassword
        },
        mockClient
      );

      assert.equal(result.message.includes(rawPassword), false);
      assert.equal(JSON.stringify(result).includes(rawPassword), false);
    });

    test('handles duplicate admin email safely without creating duplicates or overwriting', async () => {
      const existingAdmin = {
        id: 42,
        email: 'existingadmin@domain.edu',
        role: 'admin',
        password_hash: '$2b$10$mockexistinghashforadmin'
      };

      const mockClient = createMockSupabase([existingAdmin]);

      const result = await bootstrapAdmin(
        {
          email: 'existingadmin@domain.edu',
          password: 'NewStrongPassword123!'
        },
        mockClient
      );

      assert.equal(result.success, true);
      assert.equal(result.status, 'already_exists');
      assert.equal(result.user.id, 42);
      assert.equal(mockClient.insertedRows.length, 0, 'Must NOT insert any row when user already exists');
    });
  });

  describe('Isolation from Server Startup', () => {
    test('server.js and app.js do not automatically execute createAdmin script', () => {
      const serverCode = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
      const appCode = fs.readFileSync(path.join(__dirname, '../src/app.js'), 'utf8');

      assert.equal(serverCode.includes('createAdmin'), false);
      assert.equal(serverCode.includes('bootstrapAdmin'), false);
      assert.equal(appCode.includes('createAdmin'), false);
      assert.equal(appCode.includes('bootstrapAdmin'), false);
    });
  });
});
