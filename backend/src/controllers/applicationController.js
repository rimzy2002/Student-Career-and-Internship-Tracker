const { supabase } = require('../config/supabase');

exports.createApplication = async (req, res) => {
  const studentId = req.user.userId;
  const { company_name, role_title, date_applied, notes, skill_ids } = req.body;

  if (!company_name || !role_title || !date_applied) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // 1. Insert application (current_status_id = 1 is 'Applied')
    const { data: appResult, error: appError } = await supabase
      .from('applications')
      .insert([
        {
          student_id: studentId,
          company_name,
          role_title,
          current_status_id: 1,
          date_applied,
          notes: notes || null
        }
      ])
      .select('id')
      .single();

    if (appError) throw appError;

    const applicationId = appResult.id;

    // 2. Insert into application_status_history
    const { error: histError } = await supabase
      .from('application_status_history')
      .insert([
        {
          application_id: applicationId,
          status_id: 1,
          notes: 'Initial application added',
          changed_at: new Date().toISOString()
        }
      ]);

    if (histError) console.error('Error logging status history:', histError);

    // 3. Insert skills into application_skills if provided
    if (skill_ids && Array.isArray(skill_ids) && skill_ids.length > 0) {
      const skillRows = skill_ids.map(skillId => ({
        application_id: applicationId,
        skill_id: skillId
      }));
      const { error: skillError } = await supabase
        .from('application_skills')
        .insert(skillRows);

      if (skillError) console.error('Error inserting application skills:', skillError);
    }

    res.status(201).json({ message: 'Application created successfully', applicationId });
  } catch (error) {
    console.error('createApplication error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.getApplications = async (req, res) => {
  const studentId = req.user.userId;

  try {
    const { data: applications, error } = await supabase
      .from('applications')
      .select('*, application_statuses(name)')
      .eq('student_id', studentId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedApps = (applications || []).map(app => ({
      ...app,
      current_status_name: app.application_statuses ? app.application_statuses.name : 'Applied'
    }));

    res.status(200).json(formattedApps);
  } catch (error) {
    console.error('getApplications error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.updateApplicationStatus = async (req, res) => {
  const studentId = req.user.userId;
  const applicationId = req.params.id;
  const { status_id, notes } = req.body;

  if (!status_id) {
    return res.status(400).json({ message: 'Missing status_id' });
  }

  try {
    // 1. Verify ownership
    const { data: apps, error: checkError } = await supabase
      .from('applications')
      .select('id')
      .eq('id', applicationId)
      .eq('student_id', studentId)
      .is('deleted_at', null);

    if (checkError) throw checkError;

    if (!apps || apps.length === 0) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // 2. Update current_status_id on application
    const { error: updateError } = await supabase
      .from('applications')
      .update({ current_status_id: status_id, updated_at: new Date().toISOString() })
      .eq('id', applicationId);

    if (updateError) throw updateError;

    // 3. Insert into application_status_history
    const { error: histError } = await supabase
      .from('application_status_history')
      .insert([
        {
          application_id: applicationId,
          status_id: status_id,
          notes: notes || null,
          changed_at: new Date().toISOString()
        }
      ]);

    if (histError) throw histError;

    res.status(200).json({ message: 'Application status updated successfully' });

  } catch (error) {
    console.error('updateApplicationStatus error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.getApplicationHistory = async (req, res) => {
  const studentId = req.user.userId;
  const applicationId = req.params.id;

  try {
    // 1. Verify ownership and not deleted
    const { data: apps, error: checkError } = await supabase
      .from('applications')
      .select('id')
      .eq('id', applicationId)
      .eq('student_id', studentId)
      .is('deleted_at', null);

    if (checkError) throw checkError;

    if (!apps || apps.length === 0) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // 2. Fetch history
    const { data: history, error: histError } = await supabase
      .from('application_status_history')
      .select('*, application_statuses(name)')
      .eq('application_id', applicationId)
      .order('changed_at', { ascending: false });

    if (histError) throw histError;

    const formattedHistory = (history || []).map(item => ({
      ...item,
      status_name: item.application_statuses ? item.application_statuses.name : ''
    }));

    res.status(200).json(formattedHistory);
  } catch (error) {
    console.error('getApplicationHistory error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.updateApplicationSkills = async (req, res) => {
  const studentId = req.user.userId;
  const applicationId = req.params.id;
  const { skill_ids } = req.body;

  try {
    // 1. Verify ownership and not deleted
    const { data: apps, error: checkError } = await supabase
      .from('applications')
      .select('id')
      .eq('id', applicationId)
      .eq('student_id', studentId)
      .is('deleted_at', null);

    if (checkError) throw checkError;

    if (!apps || apps.length === 0) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // 2. Delete existing skills
    const { error: delError } = await supabase
      .from('application_skills')
      .delete()
      .eq('application_id', applicationId);

    if (delError) throw delError;

    // 3. Re-insert new skills
    if (skill_ids && Array.isArray(skill_ids) && skill_ids.length > 0) {
      const skillRows = skill_ids.map(skillId => ({
        application_id: applicationId,
        skill_id: skillId
      }));
      const { error: insError } = await supabase
        .from('application_skills')
        .insert(skillRows);

      if (insError) throw insError;
    }

    res.status(200).json({ message: 'Skills updated successfully' });
  } catch (error) {
    console.error('updateApplicationSkills error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.archiveApplication = async (req, res) => {
  const studentId = req.user.userId;
  const applicationId = req.params.id;

  try {
    const { data, error } = await supabase
      .from('applications')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', applicationId)
      .eq('student_id', studentId)
      .is('deleted_at', null)
      .select('id');

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'Application not found' });
    }

    res.status(200).json({ message: 'Application archived successfully' });
  } catch (error) {
    console.error('archiveApplication error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
