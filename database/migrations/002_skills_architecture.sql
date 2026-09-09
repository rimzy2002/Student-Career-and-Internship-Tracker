-- =============================================================
-- Migration: 002_skills_architecture.sql
-- Description: Upgrade skills and student_skills tables with categories,
--              normalized names, proficiency levels, sources, and seed catalog.
-- =============================================================

-- 1. Upgrade skills table
ALTER TABLE skills ADD COLUMN IF NOT EXISTS normalized_name VARCHAR(100);
ALTER TABLE skills ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'General';
ALTER TABLE skills ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Ensure normalized_name is populated and uniquely indexed
UPDATE skills SET normalized_name = LOWER(TRIM(name)) WHERE normalized_name IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_skills_normalized_name ON skills(normalized_name);
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);

-- 2. Upgrade student_skills table
ALTER TABLE student_skills ADD COLUMN IF NOT EXISTS proficiency VARCHAR(30) DEFAULT 'intermediate';
ALTER TABLE student_skills ADD COLUMN IF NOT EXISTS source VARCHAR(30) DEFAULT 'manual';
ALTER TABLE student_skills ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Add check constraints safely
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_student_skill_proficiency') THEN
        ALTER TABLE student_skills ADD CONSTRAINT check_student_skill_proficiency 
        CHECK (proficiency IN ('beginner', 'intermediate', 'advanced'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_student_skill_source') THEN
        ALTER TABLE student_skills ADD CONSTRAINT check_student_skill_source 
        CHECK (source IN ('manual', 'ai', 'application', 'resume'));
    END IF;
END $$;

-- Enforce unique student-skill pair constraint
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_student_skill') THEN
        ALTER TABLE student_skills ADD CONSTRAINT unique_student_skill UNIQUE (student_id, skill_id);
    END IF;
END $$;

-- 3. Seed Comprehensive Master Skills Catalog
INSERT INTO skills (name, normalized_name, category) VALUES
-- Programming
('Python', 'python', 'Programming'),
('JavaScript', 'javascript', 'Programming'),
('TypeScript', 'typescript', 'Programming'),
('Java', 'java', 'Programming'),
('C++', 'c++', 'Programming'),
('C#', 'c#', 'Programming'),
('Go', 'go', 'Programming'),
('Rust', 'rust', 'Programming'),
('SQL', 'sql', 'Programming'),

-- Engineering Software
('MATLAB', 'matlab', 'Engineering Software'),
('Simulink', 'simulink', 'Engineering Software'),
('LabVIEW', 'labview', 'Engineering Software'),
('AutoCAD', 'autocad', 'Engineering Software'),
('SolidWorks', 'solidworks', 'Engineering Software'),
('ANSYS', 'ansys', 'Engineering Software'),
('ETAP', 'etap', 'Engineering Software'),
('Proteus', 'proteus', 'Engineering Software'),
('Revit', 'revit', 'Engineering Software'),

-- Industrial Automation
('PLC', 'plc', 'Industrial Automation'),
('SCADA', 'scada', 'Industrial Automation'),
('HMI', 'hmi', 'Industrial Automation'),
('DCS', 'dcs', 'Industrial Automation'),
('Industrial IoT', 'industrial iot', 'Industrial Automation'),
('Modbus', 'modbus', 'Industrial Automation'),
('Arduino', 'arduino', 'Industrial Automation'),
('Embedded Systems', 'embedded systems', 'Industrial Automation'),

-- Web & Frameworks
('React', 'react', 'Web & Frameworks'),
('Next.js', 'next.js', 'Web & Frameworks'),
('Node.js', 'node.js', 'Web & Frameworks'),
('Express.js', 'express.js', 'Web & Frameworks'),
('TailwindCSS', 'tailwindcss', 'Web & Frameworks'),
('REST APIs', 'rest apis', 'Web & Frameworks'),
('GraphQL', 'graphql', 'Web & Frameworks'),
('Django', 'django', 'Web & Frameworks'),
('Spring Boot', 'spring boot', 'Web & Frameworks'),

-- Databases & Cloud
('PostgreSQL', 'postgresql', 'Databases'),
('MySQL', 'mysql', 'Databases'),
('MongoDB', 'mongodb', 'Databases'),
('Redis', 'redis', 'Databases'),
('AWS', 'aws', 'Cloud & DevOps'),
('Docker', 'docker', 'Cloud & DevOps'),
('Kubernetes', 'kubernetes', 'Cloud & DevOps'),
('Git', 'git', 'Cloud & DevOps'),
('CI/CD', 'ci/cd', 'Cloud & DevOps'),

-- Data & Soft Skills
('Power BI', 'power bi', 'Data & Analytics'),
('Tableau', 'tableau', 'Data & Analytics'),
('Pandas', 'pandas', 'Data & Analytics'),
('Machine Learning', 'machine learning', 'Data & Analytics'),
('Project Management', 'project management', 'Soft Skills'),
('Agile/Scrum', 'agile/scrum', 'Soft Skills')

ON CONFLICT (normalized_name) DO UPDATE SET 
    name = EXCLUDED.name,
    category = EXCLUDED.category;
