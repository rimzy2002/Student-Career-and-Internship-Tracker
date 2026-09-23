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
      .select('id, name')
      .order('id', { ascending: true });

    if (statError) throw statError;

    // 2. Perform indexed DB-level COUNT aggregations without transferring rows into Node memory
    const countPromises = (statuses || []).map(async (status) => {
      const { count, error } = await supabase
        .from('applications')
        .select('id', { count: 'exact', head: true })
        .eq('current_status_id', status.id)
        .is('deleted_at', null);

      if (error) {
        console.error(`Error counting status ${status.name}:`, error);
        return { status_name: status.name, count: 0 };
      }

      return {
        status_name: status.name,
        count: count || 0
      };
    });

    const applicationsAnalytics = await Promise.all(countPromises);
    res.status(200).json(applicationsAnalytics);
  } catch (error) {
    console.error('getApplicationsAnalytics error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.getStudentsAnalytics = async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'student');

    if (error) throw error;

    res.status(200).json({ count: count || 0 });
  } catch (error) {
    console.error('getStudentsAnalytics error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

