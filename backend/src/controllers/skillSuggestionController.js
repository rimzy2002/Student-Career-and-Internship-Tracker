const { supabase } = require('../config/supabase');

const ALIASES = {
  'js': 'javascript',
  'ts': 'typescript',
  'reactjs': 'react',
  'react.js': 'react',
  'nodejs': 'node.js',
  'node': 'node.js',
  'postgres': 'postgresql',
  'py': 'python',
  'golang': 'go'
};

const normalize = (name) => {
  if (!name) return '';
  const cleaned = name.trim().toLowerCase().replace(/[^a-z0-9.+]/g, '');
  return ALIASES[cleaned] || cleaned;
};

exports.getSuggestions = async (req, res) => {
  const { text } = req.body;

  if (!text || text.length < 20) {
    return res.status(400).json({ message: 'Please provide at least 20 characters of text for analysis.' });
  }

  try {
    // 1. Fetch current master skills catalog
    const { data: dbSkills, error: dbError } = await supabase
      .from('skills')
      .select('id, name, category, normalized_name');

    const skillsCatalog = dbSkills && dbSkills.length > 0 ? dbSkills : [
      { id: 1, name: 'Python', category: 'Programming', normalized_name: 'python' },
      { id: 2, name: 'JavaScript', category: 'Programming', normalized_name: 'javascript' },
      { id: 3, name: 'TypeScript', category: 'Programming', normalized_name: 'typescript' },
      { id: 4, name: 'Java', category: 'Programming', normalized_name: 'java' },
      { id: 5, name: 'C++', category: 'Programming', normalized_name: 'c++' },
      { id: 6, name: 'SQL', category: 'Programming', normalized_name: 'sql' },
      { id: 7, name: 'MATLAB', category: 'Engineering Software', normalized_name: 'matlab' },
      { id: 8, name: 'AutoCAD', category: 'Engineering Software', normalized_name: 'autocad' },
      { id: 9, name: 'PLC', category: 'Industrial Automation', normalized_name: 'plc' },
      { id: 10, name: 'SCADA', category: 'Industrial Automation', normalized_name: 'scada' },
      { id: 11, name: 'React', category: 'Web & Frameworks', normalized_name: 'react' },
      { id: 12, name: 'Node.js', category: 'Web & Frameworks', normalized_name: 'node.js' },
      { id: 13, name: 'AWS', category: 'Cloud & DevOps', normalized_name: 'aws' },
      { id: 14, name: 'Docker', category: 'Cloud & DevOps', normalized_name: 'docker' },
      { id: 15, name: 'Power BI', category: 'Data & Analytics', normalized_name: 'power bi' }
    ];

    const catalogMap = new Map();
    skillsCatalog.forEach(skill => {
      const norm = skill.normalized_name || normalize(skill.name);
      catalogMap.set(norm, skill);
      catalogMap.set(skill.name.toLowerCase(), skill);
    });

    const provider = process.env.AI_PROVIDER || (process.env.NVIDIA_API_KEY ? 'nvidia' : 'gemini');
    let rawAiResponse = null;

    const prompt = `
Extract the key technical and professional skills mentioned or required in the following text.
Match them to real industry skills.
Output ONLY a strictly valid JSON array of objects with "name" and "confidence" (between 0.70 and 0.99):
[
  { "name": "Python", "confidence": 0.97 },
  { "name": "SQL", "confidence": 0.94 }
]
Do not include any markdown formatting, backticks, or explanation.

Text:
"""
${text}
"""
    `.trim();

    // 2. Query LLM
    if (provider === 'nvidia' && process.env.NVIDIA_API_KEY) {
      const nvidiaModel = process.env.NVIDIA_MODEL || "meta/llama-3.1-70b-instruct";
      const nvidiaRes = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: nvidiaModel,
          messages: [
            { role: "system", content: "You are an expert technical skill extractor. Output strictly valid JSON arrays of objects." },
            { role: "user", content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 512
        })
      });

      if (nvidiaRes.ok) {
        const nvidiaData = await nvidiaRes.json();
        rawAiResponse = nvidiaData?.choices?.[0]?.message?.content;
      }
    }

    if (!rawAiResponse && process.env.GEMINI_API_KEY) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
      const geminiRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (geminiRes.ok) {
        const geminiData = await geminiRes.json();
        rawAiResponse = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
      }
    }

    // 3. Parse and cross-reference with master catalog
    let extracted = [];
    if (rawAiResponse) {
      try {
        const cleaned = rawAiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) {
          extracted = parsed;
        }
      } catch (parseError) {
        console.warn('Could not parse AI JSON output:', rawAiResponse);
      }
    }

    // Heuristic fallback: if AI returned nothing or was offline, search for catalog skills directly in text
    if (extracted.length === 0) {
      const lowerText = text.toLowerCase();
      const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      skillsCatalog.forEach(skill => {
        const escaped = escapeRegExp(skill.name.toLowerCase());
        const pattern = new RegExp(`(^|[^a-zA-Z0-9+])${escaped}([^a-zA-Z0-9+]|$)`, 'i');
        if (pattern.test(lowerText)) {
          extracted.push({ name: skill.name, confidence: 0.95 });
        }
      });
    }

    // 4. Map strictly against existing master catalog (prevent arbitrary garbage pollution)
    const suggestions = [];
    const matchedSkills = [];
    const seenSkillIds = new Set();

    extracted.forEach(item => {
      const skillName = typeof item === 'string' ? item : item?.name;
      const confidence = typeof item === 'object' && typeof item?.confidence === 'number' 
        ? item.confidence 
        : 0.90;

      if (!skillName) return;

      const norm = normalize(skillName);
      const matchedMaster = catalogMap.get(norm) || catalogMap.get(skillName.toLowerCase());

      if (matchedMaster) {
        const skillId = String(matchedMaster.id);
        if (!seenSkillIds.has(skillId)) {
          seenSkillIds.add(skillId);
          const suggestionObj = {
            skillId: skillId,
            id: skillId,
            name: matchedMaster.name,
            category: matchedMaster.category || 'General',
            matched: true,
            confidence: Math.round(confidence * 100) / 100
          };
          suggestions.push(suggestionObj);
          matchedSkills.push(matchedMaster);
        }
      }
    });

    // Sort by confidence descending
    suggestions.sort((a, b) => b.confidence - a.confidence);

    res.status(200).json({
      suggestions,
      matched_skills: matchedSkills,
      new_skills: [] // We protect master catalog integrity by prioritizing approved master catalog skills
    });

  } catch (error) {
    console.error('getSuggestions error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
