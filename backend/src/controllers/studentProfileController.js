const { supabase } = require('../config/supabase');
const cloudinary = require('../config/cloudinary');

exports.getProfile = async (req, res) => {
  const userId = req.user.userId;

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, created_at, first_name, last_name, university, major, graduation_year, bio, profile_image_url')
      .eq('id', userId)
      .is('deleted_at', null);

    if (error) throw error;

    if (!users || users.length === 0) {
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
    const updates = {};

    if (first_name !== undefined) updates.first_name = first_name;
    if (last_name !== undefined) updates.last_name = last_name;
    if (university !== undefined) updates.university = university;
    if (major !== undefined) updates.major = major;
    if (graduation_year !== undefined) updates.graduation_year = graduation_year;
    if (bio !== undefined) updates.bio = bio;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No fields provided for update' });
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .is('deleted_at', null)
      .select('id');

    if (error) throw error;

    if (!data || data.length === 0) {
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
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    let dataURI = "data:" + req.file.mimetype + ";base64," + b64;

    const cloudinaryRes = await cloudinary.uploader.upload(dataURI, {
      folder: 'internship_tracker_avatars',
      resource_type: 'image'
    });

    const imageUrl = cloudinaryRes.secure_url;

    const { error: dbError } = await supabase
      .from('users')
      .update({ profile_image_url: imageUrl, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (dbError) throw dbError;

    res.status(200).json({ profile_image_url: imageUrl });
  } catch (error) {
    console.error('uploadAvatar error:', error);
    res.status(500).json({ message: 'Failed to upload image' });
  }
};

exports.softDeleteAccount = async (req, res) => {
  const userId = req.user.userId;

  try {
    const { data, error } = await supabase
      .from('users')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', userId)
      .select('id');

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'Account deactivated successfully' });
  } catch (error) {
    console.error('softDeleteAccount error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
