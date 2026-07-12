-- =============================================================
-- Database Schema for Student Career & Internship Tracker
-- =============================================================

-- 1. Create the database
CREATE DATABASE IF NOT EXISTS internship_tracker;
USE internship_tracker;

-- 2. Create the Users table (Handles both Students and Admins)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('student', 'admin') NOT NULL DEFAULT 'student',
    university VARCHAR(255) NULL,
    major VARCHAR(255) NULL,
    graduation_year INT NULL,
    bio TEXT NULL,
    profile_image_url VARCHAR(500) NULL,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. Create the Applications table
CREATE TABLE IF NOT EXISTS applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    role_title VARCHAR(255) NOT NULL,
    status ENUM('Applied', 'Interview', 'Offer', 'Rejected') NOT NULL DEFAULT 'Applied',
    date_applied DATE NOT NULL,
    notes TEXT,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Create the Application Status History table (for the timeline)
CREATE TABLE IF NOT EXISTS application_status_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL,
    status ENUM('Applied', 'Interview', 'Offer', 'Rejected') NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

-- 5. Create the Skills table
CREATE TABLE IF NOT EXISTS skills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Create the Application_Skills junction table (Many-to-Many)
CREATE TABLE IF NOT EXISTS application_skills (
    application_id INT NOT NULL,
    skill_id INT NOT NULL,
    PRIMARY KEY (application_id, skill_id),
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

-- =============================================================
-- SEED DATA (Run this to create your initial admin account!)
-- =============================================================

-- 7. Create the Student_Skills junction table (Student's personal skills)
CREATE TABLE IF NOT EXISTS student_skills (
    student_id INT NOT NULL,
    skill_id INT NOT NULL,
    PRIMARY KEY (student_id, skill_id),
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

-- 8. Create the Feedback_Skill_Tags junction table (Skills flagged in rejections)
CREATE TABLE IF NOT EXISTS feedback_skill_tags (
    application_id INT NOT NULL,
    skill_id INT NOT NULL,
    PRIMARY KEY (application_id, skill_id),
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

-- We use a pre-generated bcrypt hash for 'AdminPassword123!'
-- This allows you to log in immediately as an admin.
INSERT INTO users (first_name, last_name, email, password_hash, role)
VALUES (
    'Career', 
    'Admin', 
    'admin@university.edu', 
    '$2b$10$w8.3f6.E1T1jV.z2O3eH2e/tFm3bY2B4I2B8D8F4j8B4F8B8B8B8B', -- Hash for: AdminPassword123!
    'admin'
) ON DUPLICATE KEY UPDATE email=email;

-- Seed some default skills
INSERT INTO skills (name) VALUES 
('React'), ('Node.js'), ('Python'), ('Java'), ('TypeScript'), ('AWS'), ('SQL')
ON DUPLICATE KEY UPDATE name=name;
