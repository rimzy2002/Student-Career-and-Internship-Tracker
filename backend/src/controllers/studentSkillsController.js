const { pool } = require('../config/db');

exports.getMySkills = async (req, res) => {
  const studentId = req.user.userId;

  try {
    const query = `
      SELECT 
        sk.id, 
        sk.name,
        COUNT(DISTINCT as_tbl.application_id) as application_count,
        COUNT(DISTINCT fst.application_id) as rejection_count
      FROM student_skills ss
      JOIN skills sk ON ss.skill_id = sk.id
      LEFT JOIN applications a ON a.student_id = ss.student_id
      LEFT JOIN application_skills as_tbl ON as_tbl.skill_id = ss.skill_id AND as_tbl.application_id = a.id
      LEFT JOIN feedback_skill_tags fst ON fst.skill_id = ss.skill_id AND fst.application_id = a.id
      WHERE ss.student_id = ?
      GROUP BY sk.id, sk.name
      ORDER BY sk.name ASC
    `;

    const [rows] = await pool.query(query, [studentId]);
    res.status(200).json({ skills: rows });
  } catch (error) {
    console.error('getMySkills error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.addMySkill = async (req, res) => {
  const studentId = req.user.userId;
  const { skill_id } = req.body;

  if (!skill_id) {
    return res.status(400).json({ message: 'Missing skill_id' });
  }

  try {
    // INSERT IGNORE to make it idempotent
    await pool.query(
      'INSERT IGNORE INTO student_skills (student_id, skill_id) VALUES (?, ?)',
      [studentId, skill_id]
    );

    res.status(201).json({ message: 'Skill added to your profile' });
  } catch (error) {
    console.error('addMySkill error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.removeMySkill = async (req, res) => {
  const studentId = req.user.userId;
  const skillId = req.params.skillId;

  try {
    await pool.query(
      'DELETE FROM student_skills WHERE student_id = ? AND skill_id = ?',
      [studentId, skillId]
    );

    res.status(200).json({ message: 'Skill removed from your profile' });
  } catch (error) {
    console.error('removeMySkill error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
