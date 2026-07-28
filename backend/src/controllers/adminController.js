const { supabase } = require('../config/supabase');

exports.getSkillsAnalytics = async (req, res) => {
  try {
    // 1. Check feedback_skill_tags
    const { data: tags1, error: err1 } = await supabase
      .from('feedback_skill_tags')
      .select('skill_id, skills(name)');

    if (err1 && err1.code !== '42P01' && err1.code !== 'PGRST116') {
      console.error('Error checking feedback_skill_tags:', err1);
    }

    // 2. Check application_feedback_skills
    const { data: tags2, error: err2 } = await supabase
      .from('application_feedback_skills')
      .select('skill_id, skills(name)');

    if (err2 && err2.code !== '42P01' && err2.code !== 'PGRST116') {
      console.error('Error checking application_feedback_skills:', err2);
    }

    const counts = {};
    const processRows = (rows) => {
      (rows || []).forEach(row => {
        const name = row.skills ? row.skills.name : null;
        if (name) {
          counts[name] = (counts[name] || 0) + 1;
        }
      });
    };

    processRows(tags1);
    processRows(tags2);

    const skillsAnalytics = Object.entries(counts)
      .map(([skill_name, count]) => ({ skill_name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.status(200).json(skillsAnalytics);
  } catch (error) {
    console.error('getSkillsAnalytics error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.getApplicationsAnalytics = async (req, res) => {
  try {
    // 1. Get all application statuses
    const { data: statuses, error: statError } = await supabase
      .from('application_statuses')
      .select('id, name');

    if (statError) throw statError;

    // 2. Get all non-deleted applications with their current_status_id
    const { data: applications, error: appError } = await supabase
      .from('applications')
      .select('current_status_id')
      .is('deleted_at', null);

    if (appError) throw appError;

    // Count occurrences
    const counts = {};
    (statuses || []).forEach(s => {
      counts[s.id] = { status_name: s.name, count: 0 };
    });

    (applications || []).forEach(app => {
      if (counts[app.current_status_id]) {
        counts[app.current_status_id].count += 1;
      }
    });

    const applicationsAnalytics = Object.values(counts);

    res.status(200).json(applicationsAnalytics);
  } catch (error) {
    console.error('getApplicationsAnalytics error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
