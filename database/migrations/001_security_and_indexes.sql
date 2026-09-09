-- =============================================================
-- Migration: 001_security_and_indexes.sql
-- Description: Enable RLS on all tables, add security policies,
--              create critical performance indexes, and eliminate duplicate entries.
-- =============================================================

-- -------------------------------------------------------------
-- 1. Performance Indexes
-- -------------------------------------------------------------
-- Foreign key lookup on applications by student
CREATE INDEX IF NOT EXISTS idx_applications_student_id ON applications(student_id);

-- Filtered index for active (non-deleted) applications per student & status
CREATE INDEX IF NOT EXISTS idx_applications_active ON applications(student_id, current_status_id) WHERE deleted_at IS NULL;

-- Fast timeline query for application status history ordered by latest change
CREATE INDEX IF NOT EXISTS idx_application_status_history_lookup ON application_status_history(application_id, changed_at DESC);

-- Junction table reverse lookups by skill_id
CREATE INDEX IF NOT EXISTS idx_application_skills_skill_id ON application_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_student_skills_skill_id ON student_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_feedback_skill_tags_skill_id ON feedback_skill_tags(skill_id);
CREATE INDEX IF NOT EXISTS idx_application_feedback_skills_skill_id ON application_feedback_skills(skill_id);

-- Fast lookup for role-based authorization and skill search
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_skills_name_lower ON skills(LOWER(name));

-- -------------------------------------------------------------
-- 2. Enable Row Level Security (RLS) on all public tables
-- -------------------------------------------------------------
ALTER TABLE application_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_skill_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_feedback_skills ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------
-- 3. Row Level Security Policies
-- -------------------------------------------------------------

-- --- APPLICATION_STATUSES ---
DROP POLICY IF EXISTS "Allow read access to application statuses" ON application_statuses;
CREATE POLICY "Allow read access to application statuses"
    ON application_statuses FOR SELECT
    USING (true);

-- --- SKILLS ---
DROP POLICY IF EXISTS "Allow read access to skills" ON skills;
CREATE POLICY "Allow read access to skills"
    ON skills FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert skills" ON skills;
CREATE POLICY "Allow authenticated users to insert skills"
    ON skills FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- --- USERS ---
DROP POLICY IF EXISTS "Users can read own profile or admin can read all" ON users;
CREATE POLICY "Users can read own profile or admin can read all"
    ON users FOR SELECT
    USING (
        auth.uid()::text = id::text 
        OR auth.jwt() ->> 'role' = 'admin'
        OR auth.role() = 'service_role'
    );

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (auth.uid()::text = id::text OR auth.role() = 'service_role');

-- --- APPLICATIONS ---
DROP POLICY IF EXISTS "Students can select own applications or admin can read all" ON applications;
CREATE POLICY "Students can select own applications or admin can read all"
    ON applications FOR SELECT
    USING (
        student_id::text = auth.uid()::text 
        OR auth.jwt() ->> 'role' = 'admin'
        OR auth.role() = 'service_role'
    );

DROP POLICY IF EXISTS "Students can insert own applications" ON applications;
CREATE POLICY "Students can insert own applications"
    ON applications FOR INSERT
    WITH CHECK (
        student_id::text = auth.uid()::text 
        OR auth.role() = 'service_role'
    );

DROP POLICY IF EXISTS "Students can update own applications" ON applications;
CREATE POLICY "Students can update own applications"
    ON applications FOR UPDATE
    USING (
        student_id::text = auth.uid()::text 
        OR auth.role() = 'service_role'
    );

DROP POLICY IF EXISTS "Students can delete own applications" ON applications;
CREATE POLICY "Students can delete own applications"
    ON applications FOR DELETE
    USING (
        student_id::text = auth.uid()::text 
        OR auth.role() = 'service_role'
    );

-- --- APPLICATION_STATUS_HISTORY ---
DROP POLICY IF EXISTS "Students can select own status history" ON application_status_history;
CREATE POLICY "Students can select own status history"
    ON application_status_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM applications 
            WHERE applications.id = application_status_history.application_id 
              AND (applications.student_id::text = auth.uid()::text OR auth.jwt() ->> 'role' = 'admin')
        )
        OR auth.role() = 'service_role'
    );

DROP POLICY IF EXISTS "Students can insert status history for own applications" ON application_status_history;
CREATE POLICY "Students can insert status history for own applications"
    ON application_status_history FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM applications 
            WHERE applications.id = application_status_history.application_id 
              AND applications.student_id::text = auth.uid()::text
        )
        OR auth.role() = 'service_role'
    );

-- --- STUDENT_SKILLS ---
DROP POLICY IF EXISTS "Students can manage own skills" ON student_skills;
CREATE POLICY "Students can manage own skills"
    ON student_skills FOR ALL
    USING (student_id::text = auth.uid()::text OR auth.role() = 'service_role')
    WITH CHECK (student_id::text = auth.uid()::text OR auth.role() = 'service_role');

-- --- APPLICATION_SKILLS ---
DROP POLICY IF EXISTS "Students can manage own application skills" ON application_skills;
CREATE POLICY "Students can manage own application skills"
    ON application_skills FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM applications 
            WHERE applications.id = application_skills.application_id 
              AND (applications.student_id::text = auth.uid()::text OR auth.jwt() ->> 'role' = 'admin')
        )
        OR auth.role() = 'service_role'
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM applications 
            WHERE applications.id = application_skills.application_id 
              AND applications.student_id::text = auth.uid()::text
        )
        OR auth.role() = 'service_role'
    );

-- --- FEEDBACK & SKILL TAGS ---
DROP POLICY IF EXISTS "Access feedback skill tags" ON feedback_skill_tags;
CREATE POLICY "Access feedback skill tags"
    ON feedback_skill_tags FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM applications 
            WHERE applications.id = feedback_skill_tags.application_id 
              AND (applications.student_id::text = auth.uid()::text OR auth.jwt() ->> 'role' = 'admin')
        )
        OR auth.role() = 'service_role'
    );

DROP POLICY IF EXISTS "Access application feedback" ON application_feedback;
CREATE POLICY "Access application feedback"
    ON application_feedback FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM applications 
            WHERE applications.id = application_feedback.application_id 
              AND (applications.student_id::text = auth.uid()::text OR auth.jwt() ->> 'role' = 'admin')
        )
        OR auth.role() = 'service_role'
    );

DROP POLICY IF EXISTS "Access application feedback skills" ON application_feedback_skills;
CREATE POLICY "Access application feedback skills"
    ON application_feedback_skills FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM application_feedback
            JOIN applications ON applications.id = application_feedback.application_id
            WHERE application_feedback.id = application_feedback_skills.feedback_id
              AND (applications.student_id::text = auth.uid()::text OR auth.jwt() ->> 'role' = 'admin')
        )
        OR auth.role() = 'service_role'
    );
