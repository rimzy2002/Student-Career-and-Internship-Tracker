const { pool } = require('../config/db');

exports.getSkills = async (req, res) => {
  try {
    const [skills] = await pool.query('SELECT * FROM skills ORDER BY name ASC');
    res.status(200).json(skills);
  } catch (error) {
    console.error('getSkills error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
