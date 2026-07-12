const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

exports.register = async (req, res) => {
  const { email, password, firstName, lastName } = req.body;

  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // VERIFY against schema.sql: Check for duplicate email in users table
    const [existingUsers] = await connection.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      await connection.rollback();
      return res.status(409).json({ message: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Insert into users table
    const [userResult] = await connection.query(
      'INSERT INTO users (first_name, last_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [firstName, lastName, email, passwordHash, 'student']
    );

    const userId = userResult.insertId;

    await connection.commit();

    // Generate JWT
    const token = jwt.sign(
      { userId, role: 'student' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: { id: userId, email, role: 'student', firstName, lastName }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    connection.release();
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Missing email or password' });
  }

  try {
    // VERIFY against schema.sql: Select user by email
    const [users] = await pool.query(
      'SELECT id, first_name, last_name, email, password_hash, role FROM users WHERE email = ? AND deleted_at IS NULL',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = users[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email, role: user.role }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.googleLogin = async (req, res) => {
  const { email, firstName, lastName } = req.body;

  if (!email || !firstName) {
    return res.status(400).json({ message: 'Missing email or name from Google payload' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [existingUsers] = await connection.query(
      'SELECT id, email, role FROM users WHERE email = ?',
      [email]
    );

    let user;

    if (existingUsers.length > 0) {
      // User exists, just log them in
      user = existingUsers[0];
    } else {
      // User doesn't exist, create a new student account
      // We generate a random impossible password hash since they use Google to sign in
      const randomPasswordHash = await bcrypt.hash(Math.random().toString(36), 10);
      
      const [insertResult] = await connection.query(
        'INSERT INTO users (first_name, last_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
        [firstName, lastName || '', email, randomPasswordHash, 'student']
      );
      
      user = {
        id: insertResult.insertId,
        email,
        role: 'student'
      };
    }

    await connection.commit();

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );

    res.status(200).json({
      message: 'Google login successful',
      token,
      user
    });

  } catch (error) {
    await connection.rollback();
    console.error('Google login error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    connection.release();
  }
};
