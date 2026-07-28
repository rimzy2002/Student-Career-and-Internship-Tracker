const { supabase } = require('../config/supabase');

exports.getMySkills = async (req, res) => {
  const studentId = req.user.userId;

  try {
    // 1. Get all skills belonging to this student
    const { data: ssData, error: ssError } = await supabase
      .from('student_skills')
      .select('skill_id, skills(id, name)')
      .eq('student_id', studentId);

    if (ssError) throw ssError;

    if (!ssData || ssData.length === 0) {
      return res.status(200).json({ skills: [] });
    }

    // 2. Get all application_skills for applications belonging to this student
    const { data: appSkillsData, error: asError } = await supabase
      .from('application_skills')
      .select('skill_id, application_id, applications!inner(student_id)')
      .eq('applications.student_id', studentId);

    if (asError && asError.code !== '42P01' && asError.code !== 'PGRST116') {
      console.error('Error fetching application_skills:', asError);
    }

    // 3. Get all feedback_skill_tags for applications belonging to this student
    const { data: feedbackSkillsData, error: fstError } = await supabase
      .from('feedback_skill_tags')
      .select('skill_id, application_id, applications!inner(student_id)')
      .eq('applications.student_id', studentId);

    if (fstError && fstError.code !== '42P01' && fstError.code !== 'PGRST116') {
      console.error('Error fetching feedback_skill_tags:', fstError);
    }

    const appCounts = {};
    if (appSkillsData) {
      appSkillsData.forEach(row => {
        if (!appCounts[row.skill_id]) appCounts[row.skill_id] = new Set();
        appCounts[row.skill_id].add(row.application_id);
      });
    }

    const rejCounts = {};
    if (feedbackSkillsData) {
      feedbackSkillsData.forEach(row => {
        if (!rejCounts[row.skill_id]) rejCounts[row.skill_id] = new Set();
        rejCounts[row.skill_id].add(row.application_id);
      });
    }

    const skills = ssData
      .filter(row => row.skills)
      .map(row => ({
        id: row.skills.id,
        name: row.skills.name,
        application_count: appCounts[row.skill_id] ? appCounts[row.skill_id].size : 0,
        rejection_count: rejCounts[row.skill_id] ? rejCounts[row.skill_id].size : 0
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.status(200).json({ skills });
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
    const { error } = await supabase
      .from('student_skills')
      .upsert(
        [{ student_id: studentId, skill_id: skill_id }],
        { onConflict: 'student_id,skill_id', ignoreDuplicates: true }
      );

    if (error && error.code !== '23505') {
      throw error;
    }

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
    const { error } = await supabase
      .from('student_skills')
      .delete()
      .eq('student_id', studentId)
      .eq('skill_id', skillId);

    if (error) throw error;

    res.status(200).json({ message: 'Skill removed from your profile' });
  } catch (error) {
    console.error('removeMySkill error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
