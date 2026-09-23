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

/**
 * Pure calculation engine for cohort metrics.
 * Groups students by graduation_year, aggregates applications and offer statuses,
 * and computes placement rates safely (zero-division protected).
 */
function calculateCohortsMetrics(students = [], applications = []) {
  if (!Array.isArray(students) || students.length === 0) {
    return [];
  }

  // 1. Group applications by student_id
  const appsByStudent = new Map();
  for (const app of (applications || [])) {
    const sId = String(app.student_id);
    if (!appsByStudent.has(sId)) {
      appsByStudent.set(sId, []);
    }
    appsByStudent.get(sId).push(app);
  }

  // 2. Group students by graduation_year
  const cohortGroups = new Map();
  for (const student of students) {
    const rawYear = student.graduation_year;
    const yearKey = rawYear ? String(rawYear) : 'Unassigned';

    if (!cohortGroups.has(yearKey)) {
      cohortGroups.set(yearKey, {
        rawYear: rawYear ? Number(rawYear) : null,
        students: []
      });
    }
    cohortGroups.get(yearKey).students.push(student);
  }

  // 3. Aggregate each cohort
  const cohorts = [];
  for (const [key, group] of cohortGroups.entries()) {
    const cohortStudents = group.students;
    const totalStudents = cohortStudents.length;

    let placedStudents = 0;
    let totalApplications = 0;
    let activeApplications = 0;
    const majorsSet = new Set();

    for (const student of cohortStudents) {
      if (student.major && typeof student.major === 'string') {
        majorsSet.add(student.major.trim());
      }

      const studentApps = appsByStudent.get(String(student.id)) || [];
      totalApplications += studentApps.length;

      let hasOffer = false;
      for (const app of studentApps) {
        // Status 3 is Offer
        const statusId = Number(app.current_status_id);
        if (statusId === 3) {
          hasOffer = true;
        } else if (statusId === 1 || statusId === 2) {
          activeApplications += 1;
        }
      }

      if (hasOffer) {
        placedStudents += 1;
      }
    }

    const placementRate = totalStudents > 0 
      ? Math.round((placedStudents / totalStudents) * 100)
      : 0;

    const majorsList = Array.from(majorsSet).filter(Boolean);

    cohorts.push({
      id: `cohort-${key}`,
      name: key === 'Unassigned' ? 'General Student Cohort' : `Class of ${key}`,
      graduation_year: group.rawYear,
      graduationYear: group.rawYear,
      term: key === 'Unassigned' ? 'All Academic Terms' : `Class of ${key}`,
      majors: majorsList,
      major: majorsList.length > 0 ? majorsList.join(', ') : 'All Majors',
      total_students: totalStudents,
      totalStudents,
      placed_students: placedStudents,
      placedStudents,
      active_applications: activeApplications,
      activeApplications,
      total_applications: totalApplications,
      totalApplications,
      placement_rate: placementRate,
      placementRate
    });
  }

  // Sort cohorts: descending by graduation_year, Unassigned last
  cohorts.sort((a, b) => {
    if (a.graduation_year === null) return 1;
    if (b.graduation_year === null) return -1;
    return b.graduation_year - a.graduation_year;
  });

  return cohorts;
}

exports.calculateCohortsMetrics = calculateCohortsMetrics;

exports.getCohortsAnalytics = async (req, res) => {
  try {
    const [studentsResult, appsResult] = await Promise.all([
      supabase
        .from('users')
        .select('id, graduation_year, major, university')
        .eq('role', 'student')
        .is('deleted_at', null),
      supabase
        .from('applications')
        .select('id, student_id, current_status_id')
        .is('deleted_at', null)
    ]);

    if (studentsResult.error) throw studentsResult.error;
    if (appsResult.error) throw appsResult.error;

    const cohorts = calculateCohortsMetrics(studentsResult.data || [], appsResult.data || []);
    res.status(200).json(cohorts);
  } catch (error) {
    console.error('getCohortsAnalytics error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};


