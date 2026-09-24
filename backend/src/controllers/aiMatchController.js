const { supabase } = require('../config/supabase');
const {
  calculateMatchScore,
  normalizeSkill,
  normalizeDegree,
  getCanonicalSkillName,
  KNOWN_CATALOG,
  buildCandidateSkills,
  groundJobRequirements,
  parseJobDescriptionDeterministic,
  isSkillInSourceText
} = require('../utils/matchingEngine');

exports.calculateMatchScore = calculateMatchScore;
exports.normalizeSkill = normalizeSkill;
exports.normalizeDegree = normalizeDegree;
exports.getCanonicalSkillName = getCanonicalSkillName;

/**
 * Match Candidate Resume/Profile to Job Description
 * Authenticated student endpoint with strict grounding and deterministic scoring.
 */
exports.matchResumeToJob = async (req, res) => {
  // CRITICAL SECURITY RULE: Only trust authenticated user identity from verified JWT.
  // Never read studentId or userId from req.body or arbitrary headers.
  const studentId = req.user?.userId;
  const { job_description, resume_text } = req.body;

  if (!job_description || job_description.length < 50) {
    return res.status(400).json({ message: 'Please provide at least 50 characters of job description text.' });
  }

  try {
    // 1. Fetch authenticated student's structured saved profile skills and facts directly from DB
    let savedProfileSkills = [];
    let userProfile = null;

    if (studentId) {
      try {
        const { data: profileData } = await supabase
          .from('users')
          .select('first_name, last_name, university, major, graduation_year, bio')
          .eq('id', studentId)
          .is('deleted_at', null)
          .maybeSingle();

        if (profileData) {
          userProfile = profileData;
        }

        const { data: skillsData } = await supabase
          .from('student_skills')
          .select(`
            skill_id,
            skills (
              id,
              name,
              normalized_name,
              is_active
            )
          `)
          .eq('student_id', studentId);

        if (Array.isArray(skillsData)) {
          savedProfileSkills = skillsData
            .filter(row => row.skills && row.skills.is_active !== false)
            .map(row => row.skills.name)
            .filter(Boolean);
        }
      } catch (dbErr) {
        console.warn('Notice: Could not load user profile or skills from database:', dbErr.message);
      }
    }

    // 2. Extract candidate skills directly from resume_text using deterministic catalog
    const extractedResumeSkills = [];
    if (resume_text) {
      for (const item of KNOWN_CATALOG) {
        if (item.regex.test(resume_text)) {
          extractedResumeSkills.push(item.canonical);
        }
      }
    }

    // Authoritative candidate skills: savedProfileSkills UNION extractedResumeSkills
    const candidateSkillsMap = buildCandidateSkills(savedProfileSkills, extractedResumeSkills);

    // Profile context for LLM extraction
    let profileContext = '';
    if (userProfile || savedProfileSkills.length > 0) {
      profileContext = `
Student Profile Facts:
- Name: ${userProfile?.first_name || ''} ${userProfile?.last_name || ''}
- Major: ${userProfile?.major || 'Computer Science'}
- University: ${userProfile?.university || 'University'}
- Graduation Year: ${userProfile?.graduation_year || 2026}
- Saved Profile Skills: ${savedProfileSkills.join(', ') || 'None specified'}
- Bio: ${userProfile?.bio || ''}
      `.trim();
    }

    const candidateSummaryText = [
      resume_text ? `Candidate Resume / Portfolio:\n${resume_text}` : '',
      profileContext ? `Profile Facts:\n${profileContext}` : ''
    ].filter(Boolean).join('\n\n') || 'Candidate has baseline Computer Science degree and skills.';

    // 3. Strict AI extraction prompt
    const extractionPrompt = `
You are an expert technical recruiter and resume analyzer.
Analyze the following Job Description and Candidate credentials.

CRITICAL EXTRACTION RULES:
1. Extract ONLY technologies, skills, qualifications, experience and requirements that are DIRECTLY SUPPORTED by the supplied job description.
2. Do NOT infer tools commonly associated with the role.
3. Do NOT add AWS, Docker, Kubernetes, Node.js, cloud technologies, databases, frameworks or other technologies unless the job description explicitly mentions them or contains an unambiguous equivalent.
4. For alternative requirements (e.g. "Go, Java, or Python" or "React or Vue"), represent them as an alternative group with:
   {"type": "any_of", "skills": ["Go", "Java", "Python"], "label": "Go / Java / Python", "requiredMatches": 1}
5. Categorize into mandatory_skills vs preferred_skills based on explicit job indicators:
   - Mandatory indicators: "required", "must", "looking for", "what we're looking for", "what you'll do", "experience with", "understanding of", "basics in", "familiar with".
   - Preferred indicators: "nice to have", "bonus", "preferred", "advantageous", "plus", "exposure to".

Job Description:
"""
${job_description}
"""

Candidate Credentials:
"""
${candidateSummaryText}
"""

Extract structured facts and output ONLY valid JSON without markdown formatting, backticks, or preamble:
{
  "job": {
    "role_title": "Detected job title",
    "mandatory_skills": ["Skill1", "Skill2"],
    "preferred_skills": ["SkillA"],
    "required_years_experience": 0,
    "required_education_level": "Bachelor"
  },
  "candidate": {
    "skills": ["Skill1", "SkillX"],
    "years_experience": 1,
    "education_level": "Bachelor"
  },
  "recommended_resume_changes": [
    "Specific actionable recommendation"
  ],
  "suggested_learning_priorities": [
    "Skill or technology to learn next"
  ]
}
`.trim();

    // 4. Query AI Provider (NVIDIA NIM or Gemini) with safe timeout and error handling
    const provider = process.env.AI_PROVIDER || (process.env.NVIDIA_API_KEY ? 'nvidia' : 'gemini');
    let rawAiResponse = null;

    try {
      if (provider === 'nvidia' && process.env.NVIDIA_API_KEY) {
        const nvidiaModel = process.env.NVIDIA_MODEL || 'meta/llama-3.1-70b-instruct';
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const nvidiaRes = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: nvidiaModel,
            messages: [
              { role: 'system', content: 'You are a precise JSON-only technical resume extraction engine.' },
              { role: 'user', content: extractionPrompt }
            ],
            temperature: 0.1,
            max_tokens: 1024
          }),
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (nvidiaRes.ok) {
          const data = await nvidiaRes.json();
          rawAiResponse = data?.choices?.[0]?.message?.content;
        }
      }

      if (!rawAiResponse && process.env.GEMINI_API_KEY) {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const geminiRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: extractionPrompt }] }]
          }),
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          rawAiResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        }
      }
    } catch (aiErr) {
      console.warn('AI request failed or timed out, safely continuing to deterministic engine:', aiErr.message);
    }

    // 5. Parse JSON extraction if available
    let parsedExtraction = null;
    if (rawAiResponse) {
      try {
        const cleaned = rawAiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        parsedExtraction = JSON.parse(cleaned);
      } catch (parseErr) {
        console.warn('Failed to parse AI output, falling back to deterministic extraction:', parseErr.message);
      }
    }

    // 6. Grounding & Fallback Layer
    let groundedJob;
    let candidateExp = 1;
    let candidateEdu = userProfile?.major ? 'Bachelor' : 'Bachelor';
    let recommendations = [];
    let learningPriorities = [];

    if (parsedExtraction && parsedExtraction.job) {
      // Validate every extracted requirement against JD source text; discard hallucinations
      groundedJob = groundJobRequirements(parsedExtraction.job, job_description);

      // Merge any additional skills the AI accurately discovered from resume
      if (Array.isArray(parsedExtraction.candidate?.skills)) {
        for (const s of parsedExtraction.candidate.skills) {
          const norm = normalizeSkill(s);
          if (norm && !candidateSkillsMap.has(norm)) {
            const canonical = getCanonicalSkillName(s);
            candidateSkillsMap.set(norm, {
              name: canonical,
              normalized: norm,
              source: 'Resume'
            });
          }
        }
      }

      candidateExp = Math.max(0, Number(parsedExtraction.candidate?.years_experience) || 1);
      candidateEdu = parsedExtraction.candidate?.education_level || candidateEdu;
      recommendations = Array.isArray(parsedExtraction.recommended_resume_changes) ? parsedExtraction.recommended_resume_changes : [];
      learningPriorities = Array.isArray(parsedExtraction.suggested_learning_priorities) ? parsedExtraction.suggested_learning_priorities : [];
    } else {
      // Deterministic parser: Extract directly from source text without LLM
      groundedJob = parseJobDescriptionDeterministic(job_description);
    }

    // 7. Deterministic Mathematical Scoring Engine (Authoritative)
    const scoreCandidate = {
      skills: candidateSkillsMap,
      years_experience: candidateExp,
      education_level: candidateEdu
    };

    const scoreResult = calculateMatchScore(groundedJob, scoreCandidate);
    const {
      overallScore,
      mandatoryScore,
      preferredScore,
      experienceScore,
      educationScore,
      matched_mandatory,
      missing_mandatory,
      matched_preferred,
      missing_preferred,
      matchedSkills,
      missingSkills,
      rawMandatory,
      rawPreferred
    } = scoreResult;

    // Generate tailored recommendations if missing from AI output
    if (!recommendations || recommendations.length === 0) {
      recommendations = [];
      if (missing_mandatory.length > 0) {
        const topMissing = missing_mandatory[0];
        recommendations.push(`Highlight any practical project or coursework experience in ${topMissing} to address core requirements.`);
      }
      recommendations.push('Include quantitative metrics in your resume bullets (e.g., improved response time by 30%, reduced query latency).');
      recommendations.push('Align your technical skills section directly with the target job keywords and technologies.');
    }

    if (!learningPriorities || learningPriorities.length === 0) {
      learningPriorities = [];
      for (const m of missing_mandatory) {
        learningPriorities.push(`${m} (Core Role Requirement)`);
      }
      for (const p of missing_preferred) {
        learningPriorities.push(`${p} (Preferred / Bonus)`);
      }
      if (learningPriorities.length === 0) {
        learningPriorities.push('Advanced system architecture & high-throughput API design');
      }
    }

    return res.status(200).json({
      overall_score: overallScore,
      scoring_breakdown: {
        mandatory_skills: {
          points_earned: mandatoryScore,
          max_points: 45,
          matched_count: matched_mandatory.length,
          total_count: rawMandatory.length
        },
        preferred_skills: {
          points_earned: preferredScore,
          max_points: 25,
          matched_count: matched_preferred.length,
          total_count: rawPreferred.length
        },
        experience: {
          points_earned: experienceScore,
          max_points: 20,
          candidate_years: scoreResult.candidateExp,
          required_years: scoreResult.requiredExp
        },
        education: {
          points_earned: educationScore,
          max_points: 10,
          candidate_level: candidateEdu,
          required_level: groundedJob.required_education_level
        }
      },
      skills_analysis: {
        matched_mandatory,
        missing_mandatory,
        matched_preferred,
        missing_preferred
      },
      matchedSkills,
      missingSkills,
      recommendations: {
        resume_changes: recommendations,
        learning_priorities: learningPriorities
      }
    });

  } catch (error) {
    console.error('matchResumeToJob error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
