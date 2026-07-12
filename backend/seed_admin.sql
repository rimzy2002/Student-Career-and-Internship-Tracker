-- =============================================================
-- Admin Account Seed Script
-- Smart Internship & Skill Tracker
-- =============================================================
-- Run this MANUALLY against the Aiven database after create_database.sql.
-- This is the ONLY way an admin account is created — /auth/register
-- deliberately rejects role input and only ever creates students.
--
-- PLACEHOLDER CREDENTIALS — replace before any real deployment:
--   Email:    admin@university.edu
--   Password: ChangeMe123!
--
-- The hash below was generated with bcrypt, 10 salt rounds, matching
-- exactly what authController.js uses for student registration —
-- so login works identically for both roles.
-- =============================================================

START TRANSACTION;

INSERT INTO users (email, password_hash, role, created_at)
VALUES (
  'admin@university.edu',
  '$2b$10$N4aPjVM1wLzEf2ZdeXHjZusNrRSTlsBNEFonHAGxZk7MrktkcgVQm',
  'admin',
  NOW()
);

-- If you have an `admins` subtype table (mirroring the students subtype
-- pattern from your Step 3 design), uncomment and adjust below:
--
-- SET @admin_user_id = LAST_INSERT_ID();
--
-- INSERT INTO admins (user_id, first_name, last_name)
-- VALUES (@admin_user_id, 'Career', 'Center');

COMMIT;
