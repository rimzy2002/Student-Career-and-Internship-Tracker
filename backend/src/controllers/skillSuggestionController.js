const { supabase } = require('../config/supabase');

exports.getSuggestions = async (req, res) => {
  const { text } = req.body;

  if (!text || text.length < 20) {
    return res.status(400).json({ message: 'Please provide at least 20 characters of text for analysis.' });
  }

  const provider = process.env.AI_PROVIDER || (process.env.NVIDIA_API_KEY ? 'nvidia' : 'gemini');
  let responseText = null;

  try {
    const prompt = `
      Extract the top technical and professional skills from the following job description or resume text.
      Return ONLY a valid JSON array of strings (e.g. ["React", "Python", "Project Management"]).
      Do not include any markdown formatting, backticks, or explanation.
      
      Text to analyze:
      ${text}
    `;

    if (provider === 'nvidia') {
      // --- NVIDIA NIM / AI Foundation Endpoints ---
      const nvidiaKey = process.env.NVIDIA_API_KEY;
      if (!nvidiaKey) {
        return res.status(500).json({ message: 'NVIDIA_API_KEY is not configured on the server.' });
      }

      const nvidiaModel = process.env.NVIDIA_MODEL || "meta/llama-3.1-70b-instruct";
      const nvidiaRes = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${nvidiaKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          model: nvidiaModel,
          messages: [
            { role: "system", content: "You are an expert technical skill extractor. You output strictly valid JSON arrays of strings without markdown." },
            { role: "user", content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 512
        })
      });

      if (!nvidiaRes.ok) {
        console.error('NVIDIA API Error:', await nvidiaRes.text());
        return res.status(502).json({ message: 'Failed to communicate with NVIDIA AI provider.' });
      }

      const nvidiaData = await nvidiaRes.json();
      responseText = nvidiaData?.choices?.[0]?.message?.content;
    } else {
      // --- Google Gemini API (Default Fallback) ---
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: 'AI Suggestion feature is not configured on the server.' });
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const geminiRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!geminiRes.ok) {
        console.error('Gemini API Error:', await geminiRes.text());
        return res.status(502).json({ message: 'Failed to communicate with AI provider.' });
      }

      const geminiData = await geminiRes.json();
      responseText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    }

    if (!responseText) {
      throw new Error('Invalid response structure from AI.');
    }

    // Clean up potential markdown if the LLM ignored instructions
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let suggestedSkillNames = [];
    try {
      suggestedSkillNames = JSON.parse(responseText);
      if (!Array.isArray(suggestedSkillNames)) {
        suggestedSkillNames = [];
      }
    } catch (e) {
      console.error('Failed to parse Gemini output as JSON:', responseText);
      return res.status(500).json({ message: 'AI returned an unparsable response.' });
    }

    // 2. Cross-reference with our database skills
    const { data: dbSkills, error: dbError } = await supabase.from('skills').select('*');
    if (dbError) throw dbError;
    
    const matched_skills = [];
    const new_skills = [];

    // Case-insensitive mapping for easy lookup
    const dbSkillsMap = new Map(
      (dbSkills || []).map(sk => [sk.name.toLowerCase(), sk])
    );

    for (const skillName of suggestedSkillNames) {
      const lowerName = skillName.toLowerCase();
      if (dbSkillsMap.has(lowerName)) {
        matched_skills.push(dbSkillsMap.get(lowerName));
      } else {
        new_skills.push(skillName);
      }
    }

    res.status(200).json({
      matched_skills,
      new_skills
    });

  } catch (error) {
    console.error('getSuggestions error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
