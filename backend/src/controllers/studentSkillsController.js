const { supabase } = require('../config/supabase');

const VALID_PROFICIENCIES = ['beginner', 'intermediate', 'advanced'];
const VALID_SOURCES = ['manual', 'ai', 'application', 'resume'];

exports.getMySkills = async (req, res) => {
  const studentId = req.user.userId;

  try {
    // 1. Fetch student_skills joined with master skills
    let { data: ssData, error: ssError } = await supabase
      .from('student_skills')
      .select(`
        proficiency,
        source,
        skill_id,
        skills (
          id,
          name,
          category,
          normalized_name
        )
      `)
      .eq('student_id', studentId);

    // If cloud schema doesn't have proficiency/source yet (PGRST204), gracefully fall back
    if (ssError && (ssError.code === 'PGRST204' || ssError.code === '42703' || ssError.message?.includes('proficiency') || ssError.message?.includes('source'))) {
      const fallbackRes = await supabase
        .from('student_skills')
        .select('skill_id, skills(id, name)')
        .eq('student_id', studentId);

      if (fallbackRes.error) throw fallbackRes.error;
      ssData = fallbackRes.data || [];
    } else if (ssError) {
      throw ssError;
    }

    if (!ssData || ssData.length === 0) {
      return res.status(200).json({ skills: [] });
    }

    // 2. Fetch applications belonging to this student with their statuses to compute career stats
    const { data: appData, error: appError } = await supabase
      .from('applications')
      .select(`
        id,
        current_status_id,
        application_statuses (
          name
        ),
        application_skills (
          skill_id
        )
      `)
      .eq('student_id', studentId)
      .is('deleted_at', null);

    if (appError && appError.code !== '42P01') {
      console.warn('Notice: could not fetch application skills analytics:', appError.message);
    }

    // Build stats map per skill:
    // status_id 1 = Applied, 2 = Interview, 3 = Offer, 4 = Rejected
    const statsMap = {};
    (appData || []).forEach(app => {
      const statusId = Number(app.current_status_id);
      const skillLinks = app.application_skills || [];

      skillLinks.forEach(link => {
        const sId = String(link.skill_id);
        if (!statsMap[sId]) {
          statsMap[sId] = {
            applications: 0,
            interviews: 0,
            offers: 0,
            rejections: 0
          };
        }

        statsMap[sId].applications += 1;
        if (statusId === 2 || statusId === 3) {
          statsMap[sId].interviews += 1;
        }
        if (statusId === 3) {
          statsMap[sId].offers += 1;
        }
        if (statusId === 4) {
          statsMap[sId].rejections += 1;
        }
      });
    });

    const skills = ssData
      .filter(row => row.skills)
      .map(row => {
        const skillId = String(row.skills.id || row.skill_id);
        const stats = statsMap[skillId] || { applications: 0, interviews: 0, offers: 0, rejections: 0 };
        
        const interviewRate = stats.applications > 0 
          ? Math.round((stats.interviews / stats.applications) * 100) 
          : 0;

        const offerRate = stats.applications > 0 
          ? Math.round((stats.offers / stats.applications) * 100) 
          : 0;

        const proficiency = VALID_PROFICIENCIES.includes(row.proficiency?.toLowerCase()) 
          ? row.proficiency.toLowerCase() 
          : 'intermediate';

        const source = VALID_SOURCES.includes(row.source?.toLowerCase()) 
          ? row.source.toLowerCase() 
          : 'manual';

        return {
          id: skillId,
          skillId: skillId,
          name: row.skills.name,
          category: row.skills.category || 'General',
          normalized_name: row.skills.normalized_name || row.skills.name.toLowerCase(),
          proficiency: proficiency,
          source: source,
          createdAt: row.created_at || new Date().toISOString(),
          // Detailed career statistics
          application_count: stats.applications,
          interview_count: stats.interviews,
          offer_count: stats.offers,
          rejection_count: stats.rejections,
          interview_rate: interviewRate,
          offer_rate: offerRate
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    res.status(200).json({ skills });
  } catch (error) {
    console.error('getMySkills error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.addMySkill = async (req, res) => {
  const studentId = req.user.userId;
  const { skill_id, skillId, proficiency, source } = req.body;

  const targetSkillId = skill_id || skillId;
  if (!targetSkillId) {
    return res.status(400).json({ message: 'Missing required parameter: skillId' });
  }

  const rawProf = (proficiency || 'intermediate').toLowerCase();
  const validProficiency = VALID_PROFICIENCIES.includes(rawProf) ? rawProf : 'intermediate';

  const rawSource = (source || 'manual').toLowerCase();
  const validSource = VALID_SOURCES.includes(rawSource) ? rawSource : 'manual';

  try {
    const payload = {
      student_id: studentId,
      skill_id: Number(targetSkillId),
      proficiency: validProficiency,
      source: validSource
    };

    let { error } = await supabase
      .from('student_skills')
      .upsert([payload], { onConflict: 'student_id,skill_id' });

    if (error && (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('proficiency') || error.message?.includes('source'))) {
      // Graceful fallback for cloud databases where migration 002 hasn't run yet
      const fallbackResult = await supabase
        .from('student_skills')
        .upsert([{ student_id: studentId, skill_id: Number(targetSkillId) }], { onConflict: 'student_id,skill_id' });
      
      if (fallbackResult.error && fallbackResult.error.code !== '23505') {
        throw fallbackResult.error;
      }
      error = null;
    } else if (error && error.code !== '23505') {
      throw error;
    }

    res.status(201).json({ 
      message: 'Skill added to your profile successfully',
      skillId: String(targetSkillId),
      proficiency: validProficiency,
      source: validSource
    });
  } catch (error) {
    console.error('addMySkill error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.removeMySkill = async (req, res) => {
  const studentId = req.user.userId;
  const skillId = req.params.skillId;

  if (!skillId) {
    return res.status(400).json({ message: 'Missing skillId parameter' });
  }

  try {
    const { error } = await supabase
      .from('student_skills')
      .delete()
      .eq('student_id', studentId)
      .eq('skill_id', Number(skillId));

    if (error) throw error;

    res.status(200).json({ message: 'Skill removed from your profile' });
  } catch (error) {
    console.error('removeMySkill error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
