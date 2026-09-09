const { supabase } = require('../config/supabase');

const FALLBACK_CATALOG = [
  // Programming
  { id: '1', name: 'Python', category: 'Programming', normalized_name: 'python' },
  { id: '2', name: 'JavaScript', category: 'Programming', normalized_name: 'javascript' },
  { id: '3', name: 'TypeScript', category: 'Programming', normalized_name: 'typescript' },
  { id: '4', name: 'Java', category: 'Programming', normalized_name: 'java' },
  { id: '5', name: 'C++', category: 'Programming', normalized_name: 'c++' },
  { id: '6', name: 'C#', category: 'Programming', normalized_name: 'c#' },
  { id: '7', name: 'Go', category: 'Programming', normalized_name: 'go' },
  { id: '8', name: 'SQL', category: 'Programming', normalized_name: 'sql' },

  // Engineering Software
  { id: '9', name: 'MATLAB', category: 'Engineering Software', normalized_name: 'matlab' },
  { id: '10', name: 'Simulink', category: 'Engineering Software', normalized_name: 'simulink' },
  { id: '11', name: 'AutoCAD', category: 'Engineering Software', normalized_name: 'autocad' },
  { id: '12', name: 'SolidWorks', category: 'Engineering Software', normalized_name: 'solidworks' },
  { id: '13', name: 'ANSYS', category: 'Engineering Software', normalized_name: 'ansys' },
  { id: '14', name: 'ETAP', category: 'Engineering Software', normalized_name: 'etap' },
  { id: '15', name: 'Proteus', category: 'Engineering Software', normalized_name: 'proteus' },
  { id: '16', name: 'LabVIEW', category: 'Engineering Software', normalized_name: 'labview' },

  // Industrial Automation
  { id: '17', name: 'PLC', category: 'Industrial Automation', normalized_name: 'plc' },
  { id: '18', name: 'SCADA', category: 'Industrial Automation', normalized_name: 'scada' },
  { id: '19', name: 'HMI', category: 'Industrial Automation', normalized_name: 'hmi' },
  { id: '20', name: 'DCS', category: 'Industrial Automation', normalized_name: 'dcs' },
  { id: '21', name: 'Arduino', category: 'Industrial Automation', normalized_name: 'arduino' },
  { id: '22', name: 'Embedded Systems', category: 'Industrial Automation', normalized_name: 'embedded systems' },

  // Web & Frameworks
  { id: '23', name: 'React', category: 'Web & Frameworks', normalized_name: 'react' },
  { id: '24', name: 'Next.js', category: 'Web & Frameworks', normalized_name: 'next.js' },
  { id: '25', name: 'Node.js', category: 'Web & Frameworks', normalized_name: 'node.js' },
  { id: '26', name: 'Express.js', category: 'Web & Frameworks', normalized_name: 'express.js' },
  { id: '27', name: 'TailwindCSS', category: 'Web & Frameworks', normalized_name: 'tailwindcss' },
  { id: '28', name: 'REST APIs', category: 'Web & Frameworks', normalized_name: 'rest apis' },

  // Databases & Cloud
  { id: '29', name: 'PostgreSQL', category: 'Databases', normalized_name: 'postgresql' },
  { id: '30', name: 'MongoDB', category: 'Databases', normalized_name: 'mongodb' },
  { id: '31', name: 'AWS', category: 'Cloud & DevOps', normalized_name: 'aws' },
  { id: '32', name: 'Docker', category: 'Cloud & DevOps', normalized_name: 'docker' },
  { id: '33', name: 'Kubernetes', category: 'Cloud & DevOps', normalized_name: 'kubernetes' },
  { id: '34', name: 'Git', category: 'Cloud & DevOps', normalized_name: 'git' },

  // Data & Analytics
  { id: '35', name: 'Power BI', category: 'Data & Analytics', normalized_name: 'power bi' },
  { id: '36', name: 'Machine Learning', category: 'Data & Analytics', normalized_name: 'machine learning' },
  { id: '37', name: 'Pandas', category: 'Data & Analytics', normalized_name: 'pandas' }
];

exports.getSkills = async (req, res) => {
  const { category, search } = req.query;

  try {
    let query = supabase
      .from('skills')
      .select('id, name, category, normalized_name')
      .order('name', { ascending: true });

    if (category && category !== 'All') {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data: skills, error } = await query;

    if (error || !skills || skills.length === 0) {
      // Return curated fallback catalog so the UI never displays an empty dropdown
      let filtered = [...FALLBACK_CATALOG];
      if (category && category !== 'All') {
        filtered = filtered.filter(s => s.category.toLowerCase() === category.toLowerCase());
      }
      if (search) {
        filtered = filtered.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
      }
      return res.status(200).json(filtered);
    }

    // Map rows cleanly with safe category default
    const formatted = skills.map(s => ({
      id: String(s.id),
      name: s.name,
      category: s.category || 'General',
      normalized_name: s.normalized_name || s.name.toLowerCase()
    }));

    res.status(200).json(formatted);
  } catch (error) {
    console.error('getSkills error:', error);
    res.status(200).json(FALLBACK_CATALOG);
  }
};
