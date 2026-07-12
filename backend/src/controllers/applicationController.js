const { pool } = require('../config/db');

exports.createApplication = async (req, res) => {
  const studentId = req.user.userId;
  const { company_name, role_title, date_applied, notes, skill_ids } = req.body;

  if (!company_name || !role_title || !date_applied) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Insert application (assuming current_status_id = 1 is 'Applied')
    const [result] = await connection.query(
      'INSERT INTO applications (student_id, company_name, role_title, current_status_id, date_applied, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [studentId, company_name, role_title, 1, date_applied, notes || null]
    );

    const applicationId = result.insertId;

    // 2. Insert into application_status_history
    const changedAt = new Date();
    await connection.query(
      'INSERT INTO application_status_history (application_id, status_id, notes, changed_at) VALUES (?, ?, ?, ?)',
      [applicationId, 1, 'Initial application added', changedAt]
    );

    // 3. Insert skills into application_skills if provided
    if (skill_ids && Array.isArray(skill_ids) && skill_ids.length > 0) {
      const skillValues = skill_ids.map(skillId => [applicationId, skillId]);
      await connection.query(
        'INSERT INTO application_skills (application_id, skill_id) VALUES ?',
        [skillValues]
      );
    }

    await connection.commit();
    res.status(201).json({ message: 'Application created successfully', applicationId });
  } catch (error) {
    await connection.rollback();
    console.error('createApplication error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    connection.release();
  }
};

exports.getApplications = async (req, res) => {
  const studentId = req.user.userId;

  try {
    // VERIFY against schema.sql: Select applications joined with status
    const [applications] = await pool.query(
      `SELECT a.*, s.name as current_status_name 
       FROM applications a
       LEFT JOIN application_statuses s ON a.current_status_id = s.id
       WHERE a.student_id = ? AND a.deleted_at IS NULL`,
      [studentId]
    );

    res.status(200).json(applications);
  } catch (error) {
    console.error('getApplications error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.updateApplicationStatus = async (req, res) => {
  const studentId = req.user.userId;
  const applicationId = req.params.id;
  const { status_id, notes } = req.body;

  if (!status_id) {
    return res.status(400).json({ message: 'Missing status_id' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Verify ownership
    // VERIFY against schema.sql: Check application ownership
    const [applications] = await connection.query(
      'SELECT id FROM applications WHERE id = ? AND student_id = ? AND deleted_at IS NULL FOR UPDATE',
      [applicationId, studentId]
    );

    if (applications.length === 0) {
      await connection.rollback();
      // Return 404 to avoid leaking existence of other students' applications
      return res.status(404).json({ message: 'Application not found' });
    }

    // 2. Update current_status_id on application
    // VERIFY against schema.sql: Update applications table
    await connection.query(
      'UPDATE applications SET current_status_id = ? WHERE id = ?',
      [status_id, applicationId]
    );

    // 3. Insert into application_status_history
    // VERIFY against schema.sql: Insert into application_status_history
    const changedAt = new Date(); // or use CURRENT_TIMESTAMP in SQL
    await connection.query(
      'INSERT INTO application_status_history (application_id, status_id, notes, changed_at) VALUES (?, ?, ?, ?)',
      [applicationId, status_id, notes || null, changedAt]
    );

    await connection.commit();
    res.status(200).json({ message: 'Application status updated successfully' });

  } catch (error) {
    await connection.rollback();
    console.error('updateApplicationStatus error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    connection.release();
  }
};

exports.getApplicationHistory = async (req, res) => {
  const studentId = req.user.userId;
  const applicationId = req.params.id;

  try {
    // 1. Verify ownership and not deleted
    const [applications] = await pool.query(
      'SELECT id FROM applications WHERE id = ? AND student_id = ? AND deleted_at IS NULL',
      [applicationId, studentId]
    );

    if (applications.length === 0) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // 2. Fetch history
    const [history] = await pool.query(
      `SELECT h.*, s.name as status_name 
       FROM application_status_history h
       LEFT JOIN application_statuses s ON h.status_id = s.id
       WHERE h.application_id = ? 
       ORDER BY h.changed_at DESC`,
      [applicationId]
    );

    res.status(200).json(history);
  } catch (error) {
    console.error('getApplicationHistory error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.updateApplicationSkills = async (req, res) => {
  const studentId = req.user.userId;
  const applicationId = req.params.id;
  const { skill_ids } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Verify ownership and not deleted
    const [applications] = await connection.query(
      'SELECT id FROM applications WHERE id = ? AND student_id = ? AND deleted_at IS NULL FOR UPDATE',
      [applicationId, studentId]
    );

    if (applications.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Application not found' });
    }

    // 2. Delete existing skills
    await connection.query(
      'DELETE FROM application_skills WHERE application_id = ?',
      [applicationId]
    );

    // 3. Re-insert new skills
    if (skill_ids && Array.isArray(skill_ids) && skill_ids.length > 0) {
      const skillValues = skill_ids.map(skillId => [applicationId, skillId]);
      await connection.query(
        'INSERT INTO application_skills (application_id, skill_id) VALUES ?',
        [skillValues]
      );
    }

    await connection.commit();
    res.status(200).json({ message: 'Skills updated successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('updateApplicationSkills error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    connection.release();
  }
};

exports.archiveApplication = async (req, res) => {
  const studentId = req.user.userId;
  const applicationId = req.params.id;

  try {
    const [result] = await pool.query(
      'UPDATE applications SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND student_id = ? AND deleted_at IS NULL',
      [applicationId, studentId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Application not found' });
    }

    res.status(200).json({ message: 'Application archived successfully' });
  } catch (error) {
    console.error('archiveApplication error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

