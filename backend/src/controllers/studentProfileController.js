const { pool } = require('../config/db');
const cloudinary = require('../config/cloudinary');

exports.getProfile = async (req, res) => {
  const userId = req.user.userId;

  try {
    const [users] = await pool.query(
      'SELECT id, email, created_at, first_name, last_name, university, major, graduation_year, bio, profile_image_url FROM users WHERE id = ? AND deleted_at IS NULL',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found or deactivated' });
    }

    res.status(200).json({ profile: users[0] });
  } catch (error) {
    console.error('getProfile error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.updateProfile = async (req, res) => {
  const userId = req.user.userId;
  const { first_name, last_name, university, major, graduation_year, bio } = req.body;

  try {
    // Only update provided fields (excluding email)
    const updates = [];
    const values = [];

    if (first_name !== undefined) { updates.push('first_name = ?'); values.push(first_name); }
    if (last_name !== undefined) { updates.push('last_name = ?'); values.push(last_name); }
    if (university !== undefined) { updates.push('university = ?'); values.push(university); }
    if (major !== undefined) { updates.push('major = ?'); values.push(major); }
    if (graduation_year !== undefined) { updates.push('graduation_year = ?'); values.push(graduation_year); }
    if (bio !== undefined) { updates.push('bio = ?'); values.push(bio); }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields provided for update' });
    }

    values.push(userId); // for WHERE clause

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ? AND deleted_at IS NULL`;
    const [result] = await pool.query(query, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found or deactivated' });
    }

    res.status(200).json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('updateProfile error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.uploadAvatar = async (req, res) => {
  const userId = req.user.userId;

  if (!req.file) {
    return res.status(400).json({ message: 'No image file provided' });
  }

  try {
    // Convert buffer to base64
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    let dataURI = "data:" + req.file.mimetype + ";base64," + b64;

    const cloudinaryRes = await cloudinary.uploader.upload(dataURI, {
      folder: 'internship_tracker_avatars',
      resource_type: 'image'
    });

    const imageUrl = cloudinaryRes.secure_url;

    // Save to DB
    await pool.query(
      'UPDATE users SET profile_image_url = ? WHERE id = ?',
      [imageUrl, userId]
    );

    res.status(200).json({ profile_image_url: imageUrl });
  } catch (error) {
    console.error('uploadAvatar error:', error);
    res.status(500).json({ message: 'Failed to upload image' });
  }
};

exports.softDeleteAccount = async (req, res) => {
  const userId = req.user.userId;

  try {
    const [result] = await pool.query(
      'UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?',
      [userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'Account deactivated successfully' });
  } catch (error) {
    console.error('softDeleteAccount error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
