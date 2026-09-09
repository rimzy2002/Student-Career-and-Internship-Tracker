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

const STATUS_NAME_TO_ID = {
  'Applied': 1,
  'Interview': 2,
  'Offer': 3,
  'Rejected': 4
};

const STATUS_ID_TO_NAME = {
  1: 'Applied',
  2: 'Interview',
  3: 'Offer',
  4: 'Rejected'
};

exports.getApplications = async (req, res) => {
  const studentId = req.user.userId;

  try {
    // Single unified query with nested relations: prevents N+1 queries
    const { data: applications, error } = await supabase
      .from('applications')
      .select(`
        id,
        company_name,
        role_title,
        current_status_id,
        date_applied,
        notes,
        created_at,
        updated_at,
        application_statuses (
          id,
          name
        ),
        application_skills (
          skill_id,
          skills (
            id,
            name
          )
        )
      `)
      .eq('student_id', studentId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedApps = (applications || []).map(app => {
      const statusName = app.application_statuses?.name || STATUS_ID_TO_NAME[app.current_status_id] || 'Applied';
      const extractedSkills = (app.application_skills || [])
        .map(as => as.skills)
        .filter(Boolean)
        .map(s => ({ id: String(s.id), name: s.name }));

      return {
        id: String(app.id),
        companyName: app.company_name,
        roleTitle: app.role_title,
        dateApplied: app.date_applied,
        status: statusName,
        current_status_id: app.current_status_id,
        current_status_name: statusName,
        notes: app.notes,
        skills: extractedSkills,
        createdAt: app.created_at,
        updatedAt: app.updated_at
      };
    });

    res.status(200).json(formattedApps);
  } catch (error) {
    console.error('getApplications error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.updateApplicationStatus = async (req, res) => {
  const studentId = req.user.userId;
  const applicationId = req.params.id;
  let { status_id, status, notes } = req.body;

  // Support both status_id (integer/string) and status name ('Interview', etc.)
  let resolvedStatusId = status_id;
  if (!resolvedStatusId && status) {
    resolvedStatusId = STATUS_NAME_TO_ID[status];
  } else if (typeof resolvedStatusId === 'string' && isNaN(Number(resolvedStatusId))) {
    resolvedStatusId = STATUS_NAME_TO_ID[resolvedStatusId];
  }

  if (!resolvedStatusId) {
    return res.status(400).json({ message: 'Missing or invalid status_id or status name' });
  }

  resolvedStatusId = Number(resolvedStatusId);

  try {
    // 1. Verify ownership and existence
    const { data: apps, error: checkError } = await supabase
      .from('applications')
      .select('id, company_name, role_title')
      .eq('id', applicationId)
      .eq('student_id', studentId)
      .is('deleted_at', null);

    if (checkError) throw checkError;

    if (!apps || apps.length === 0) {
      return res.status(404).json({ message: 'Application not found' });
    }

    const currentTimestamp = new Date().toISOString();

    // 2. Update current_status_id on application
    const { error: updateError } = await supabase
      .from('applications')
      .update({ current_status_id: resolvedStatusId, updated_at: currentTimestamp })
      .eq('id', applicationId);

    if (updateError) throw updateError;

    // 3. Insert into application_status_history
    const statusName = STATUS_ID_TO_NAME[resolvedStatusId] || 'Unknown';
    const { error: histError } = await supabase
      .from('application_status_history')
      .insert([
        {
          application_id: applicationId,
          status_id: resolvedStatusId,
          notes: notes || `Moved to ${statusName}`,
          changed_at: currentTimestamp
        }
      ]);

    if (histError) throw histError;

    // 4. Broadcast confirmed change via Supabase Realtime Broadcast
    try {
      const channel = supabase.channel(`student:${studentId}:applications`);
      channel.send({
        type: 'broadcast',
        event: 'application:status_updated',
        payload: {
          applicationId: String(applicationId),
          status_id: resolvedStatusId,
          status: statusName,
          updated_at: currentTimestamp
        }
      });
    } catch (realtimeErr) {
      console.warn('Realtime broadcast notice (non-fatal):', realtimeErr.message);
    }

    res.status(200).json({
      message: 'Application status updated successfully',
      applicationId: String(applicationId),
      status: statusName,
      status_id: resolvedStatusId
    });

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

exports.getApplicationById = async (req, res) => {
  const studentId = req.user.userId;
  const applicationId = req.params.id;

  try {
    const { data: apps, error } = await supabase
      .from('applications')
      .select(`
        id,
        company_name,
        role_title,
        current_status_id,
        date_applied,
        notes,
        created_at,
        updated_at,
        application_statuses (
          id,
          name
        ),
        application_skills (
          skill_id,
          skills (
            id,
            name
          )
        )
      `)
      .eq('id', applicationId)
      .eq('student_id', studentId)
      .is('deleted_at', null);

    if (error) throw error;

    if (!apps || apps.length === 0) {
      return res.status(404).json({ message: 'Application not found' });
    }

    const app = apps[0];

    // Fetch history
    const { data: history } = await supabase
      .from('application_status_history')
      .select('id, status_id, notes, changed_at, application_statuses(name)')
      .eq('application_id', applicationId)
      .order('changed_at', { ascending: false });

    const statusName = app.application_statuses?.name || STATUS_ID_TO_NAME[app.current_status_id] || 'Applied';
    const extractedSkills = (app.application_skills || [])
      .map(as => as.skills)
      .filter(Boolean)
      .map(s => ({ id: String(s.id), name: s.name }));

    const formattedHistory = (history || []).map(h => ({
      id: String(h.id),
      status: h.application_statuses?.name || STATUS_ID_TO_NAME[h.status_id] || 'Applied',
      timestamp: h.changed_at,
      notes: h.notes
    }));

    res.status(200).json({
      id: String(app.id),
      companyName: app.company_name,
      roleTitle: app.role_title,
      dateApplied: app.date_applied,
      status: statusName,
      current_status_id: app.current_status_id,
      notes: app.notes,
      skills: extractedSkills,
      history: formattedHistory,
      createdAt: app.created_at,
      updatedAt: app.updated_at
    });
  } catch (error) {
    console.error('getApplicationById error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.updateApplicationNotes = async (req, res) => {
  const studentId = req.user.userId;
  const applicationId = req.params.id;
  const { notes } = req.body;

  try {
    const { data, error } = await supabase
      .from('applications')
      .update({ notes: notes || null, updated_at: new Date().toISOString() })
      .eq('id', applicationId)
      .eq('student_id', studentId)
      .is('deleted_at', null)
      .select('id, notes');

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'Application not found' });
    }

    res.status(200).json({ message: 'Notes updated successfully', notes: data[0].notes });
  } catch (error) {
    console.error('updateApplicationNotes error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

