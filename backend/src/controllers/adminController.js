const { pool } = require('../config/db');

exports.getSkillsAnalytics = async (req, res) => {
  try {
    // VERIFY against schema.sql: Count of skills tagged in rejection feedback, grouped by skill name
    // Assumes tables like `skills`, `application_feedback_skills`, `application_feedback`
    // where feedback is associated with rejection.
    const [skillsAnalytics] = await pool.query(
      `SELECT s.name as skill_name, COUNT(*) as count 
       FROM skills s
       JOIN application_feedback_skills afs ON s.id = afs.skill_id
       JOIN application_feedback af ON afs.feedback_id = af.id
       JOIN application_statuses stat ON af.status_id = stat.id
       WHERE stat.name = 'Rejected'
       GROUP BY s.id, s.name
       ORDER BY count DESC
       LIMIT 10`
    );

    res.status(200).json(skillsAnalytics);
  } catch (error) {
    console.error('getSkillsAnalytics error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.getApplicationsAnalytics = async (req, res) => {
  try {
    // VERIFY against schema.sql: Count of applications grouped by current status name
    const [applicationsAnalytics] = await pool.query(
      `SELECT s.name as status_name, COUNT(a.id) as count
       FROM applications a
       JOIN application_statuses s ON a.current_status_id = s.id
       GROUP BY s.id, s.name`
    );

    res.status(200).json(applicationsAnalytics);
  } catch (error) {
    console.error('getApplicationsAnalytics error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
