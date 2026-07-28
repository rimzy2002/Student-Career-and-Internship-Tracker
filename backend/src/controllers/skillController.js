const { supabase } = require('../config/supabase');

exports.getSkills = async (req, res) => {
  try {
    const { data: skills, error } = await supabase
      .from('skills')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    res.status(200).json(skills || []);
  } catch (error) {
    console.error('getSkills error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
