const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');

exports.register = async (req, res) => {
  const { email, password, firstName, lastName } = req.body;

  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // 1. Check for duplicate email in users table
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email);

    if (checkError) throw checkError;

    if (existingUsers && existingUsers.length > 0) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // 2. Insert into users table
    const { data: userResult, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          first_name: firstName,
          last_name: lastName,
          email: email,
          password_hash: passwordHash,
          role: 'student'
        }
      ])
      .select('id')
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return res.status(409).json({ message: 'Email already exists' });
      }
      throw insertError;
    }

    const userId = userResult.id;

    // 3. Generate JWT
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
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Missing email or password' });
  }

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, password_hash, role')
      .eq('email', email)
      .is('deleted_at', null);

    if (error) throw error;

    if (!users || users.length === 0) {
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

  try {
    const { data: existingUsers, error: selectError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('email', email);

    if (selectError) throw selectError;

    let user;

    if (existingUsers && existingUsers.length > 0) {
      // User exists, just log them in
      user = existingUsers[0];
    } else {
      // User doesn't exist, create a new student account
      const randomPasswordHash = await bcrypt.hash(Math.random().toString(36), 10);
      
      const { data: insertResult, error: insertError } = await supabase
        .from('users')
        .insert([
          {
            first_name: firstName,
            last_name: lastName || '',
            email: email,
            password_hash: randomPasswordHash,
            role: 'student'
          }
        ])
        .select('id, email, role')
        .single();

      if (insertError) throw insertError;
      user = insertResult;
    }

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
    console.error('Google login error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
