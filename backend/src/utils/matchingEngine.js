/**
 * Defensible, Deterministic Resume-to-Job Matching Engine
 * 
 * Rules:
 * 1. Authoritative candidate skills from authenticated student profile + extracted resume skills.
 * 2. Grounded job requirement extraction: Discards hallucinated skills absent from the JD.
 * 3. Canonical skill normalization with maintainable deterministic alias map.
 * 4. Narrowly justified skill relationships (e.g., SQL <-> PostgreSQL relational DB capability).
 * 5. First-class alternative requirements handling (e.g., "Go, Java, or Python" OR group).
 * 6. Defensible 100-point mathematical scoring formula (Mandatory 45, Preferred 25, Exp 20, Edu 10).
 */

const DEGREE_HIERARCHY = {
  'none': 0,
  'high school': 1,
  'associate': 2,
  'bachelor': 3,
  'master': 4,
  'phd': 5,
  'doctorate': 5
};

const normalizeDegree = (deg) => {
  if (!deg || typeof deg !== 'string') return 2; // Default baseline
  const lower = deg.toLowerCase();
  for (const [key, val] of Object.entries(DEGREE_HIERARCHY)) {
    if (lower.includes(key)) return val;
  }
  return 3; // Default bachelor equivalent
};

// Standard skill normalization alias map (preserves backward compatibility with existing tests)
const ALIAS_MAP = {
  'js': 'javascript',
  'javascript': 'javascript',
  'es6': 'javascript',
  'ecmascript': 'javascript',
  'ts': 'typescript',
  'typescript': 'typescript',
  'react': 'react',
  'react.js': 'react',
  'reactjs': 'react',
  'node': 'node.js',
  'nodejs': 'node.js',
  'node.js': 'node.js',
  'express': 'express.js',
  'expressjs': 'express.js',
  'express.js': 'express.js',
  'postgres': 'postgresql',
  'postgresql': 'postgresql',
  'psql': 'postgresql',
  'mongo': 'mongodb',
  'mongodb': 'mongodb',
  'py': 'python',
  'python': 'python',
  'golang': 'go',
  'go': 'go',
  'java': 'java',
  'vuejs': 'vue',
  'vue.js': 'vue',
  'vue': 'vue',
  'nextjs': 'next.js',
  'next.js': 'next.js',
  'tailwind': 'tailwindcss',
  'tailwindcss': 'tailwindcss',
  'tailwind css': 'tailwindcss',
  'aws cloud': 'aws',
  'aws': 'aws',
  'amazon web services': 'aws',
  'docker': 'docker',
  'docker container': 'docker',
  'docker containers': 'docker',
  'kubernetes': 'kubernetes',
  'k8s': 'kubernetes',
  'git': 'git',
  'github': 'git',
  'gitlab': 'git',
  'rest': 'rest apis',
  'rest api': 'rest apis',
  'rest apis': 'rest apis',
  'restful': 'rest apis',
  'restful api': 'rest apis',
  'restful apis': 'rest apis',
  'restapis': 'rest apis',
  'sql': 'sql',
  'relational database': 'sql',
  'relational databases': 'sql',
  'c++': 'c++',
  'cpp': 'c++',
  'c#': 'c#',
  'csharp': 'c#',
  'ai': 'ai',
  'artificial intelligence': 'ai',
  'blockchain': 'blockchain',
  'web3': 'blockchain',
  'agile': 'agile',
  'scrum': 'agile',
  'kanban': 'agile'
};

const normalizeSkill = (s) => {
  if (!s || typeof s !== 'string') return '';
  const cleaned = s.trim().toLowerCase().replace(/[^a-z0-9.+]/g, '');
  return ALIAS_MAP[cleaned] || cleaned;
};

// Canonical display names
const CANONICAL_DISPLAY_NAMES = {
  'javascript': 'JavaScript',
  'typescript': 'TypeScript',
  'react': 'React',
  'next.js': 'Next.js',
  'node.js': 'Node.js',
  'express.js': 'Express.js',
  'python': 'Python',
  'go': 'Go',
  'java': 'Java',
  'c++': 'C++',
  'c#': 'C#',
  'sql': 'SQL',
  'postgresql': 'PostgreSQL',
  'mongodb': 'MongoDB',
  'rest apis': 'REST APIs',
  'aws': 'AWS',
  'docker': 'Docker',
  'kubernetes': 'Kubernetes',
  'git': 'Git',
  'tailwindcss': 'TailwindCSS',
  'vue': 'Vue',
  'ai': 'AI',
  'blockchain': 'Blockchain',
  'agile': 'Agile'
};

const getCanonicalSkillName = (s) => {
  if (!s || typeof s !== 'string') return '';
  const norm = normalizeSkill(s);
  return CANONICAL_DISPLAY_NAMES[norm] || (s.charAt(0).toUpperCase() + s.slice(1));
};

// Catalog definitions with exact word-boundary detection regexes for source text grounding
const KNOWN_CATALOG = [
  {
    canonical: 'TypeScript',
    normalized: 'typescript',
    regex: /\b(typescript|ts)\b/i
  },
  {
    canonical: 'JavaScript',
    normalized: 'javascript',
    regex: /\b(javascript|js|ecmascript|es6)\b/i
  },
  {
    canonical: 'React',
    normalized: 'react',
    regex: /\breact(\.?js)?\b/i
  },
  {
    canonical: 'Next.js',
    normalized: 'next.js',
    regex: /\bnext(\.?js)?\b/i
  },
  {
    canonical: 'Node.js',
    normalized: 'node.js',
    regex: /\bnode(\.?js)?\b/i
  },
  {
    canonical: 'Express.js',
    normalized: 'express.js',
    regex: /\bexpress(\.?js)?\b/i
  },
  {
    canonical: 'Python',
    normalized: 'python',
    regex: /\b(python|py)\b/i
  },
  {
    canonical: 'Go',
    normalized: 'go',
    // Go requires case-sensitive word boundary or golang to prevent false-positives with English "go"
    regex: /(\bGo\b|\bgolang\b)/
  },
  {
    canonical: 'Java',
    normalized: 'java',
    // Ensure Java does not match JavaScript
    regex: /\bjava\b(?!script)/i
  },
  {
    canonical: 'C++',
    normalized: 'c++',
    regex: /\b(c\+\+|cpp)\b/i
  },
  {
    canonical: 'C#',
    normalized: 'c#',
    regex: /\b(c#|csharp)\b/i
  },
  {
    canonical: 'PostgreSQL',
    normalized: 'postgresql',
    regex: /\b(postgresql|postgres|psql)\b/i
  },
  {
    canonical: 'SQL',
    normalized: 'sql',
    regex: /\b(sql|relational databases?)\b/i
  },
  {
    canonical: 'MongoDB',
    normalized: 'mongodb',
    regex: /\b(mongodb|mongo)\b/i
  },
  {
    canonical: 'REST APIs',
    normalized: 'rest apis',
    regex: /\b(rest(\s*apis?|\s*ful)?)\b/i
  },
  {
    canonical: 'AWS',
    normalized: 'aws',
    regex: /\b(aws|amazon web services)\b/i
  },
  {
    canonical: 'Docker',
    normalized: 'docker',
    regex: /\b(docker|containerization|containers?)\b/i
  },
  {
    canonical: 'Kubernetes',
    normalized: 'kubernetes',
    regex: /\b(kubernetes|k8s)\b/i
  },
  {
    canonical: 'Git',
    normalized: 'git',
    regex: /\b(git|github|gitlab)\b/i
  },
  {
    canonical: 'TailwindCSS',
    normalized: 'tailwindcss',
    regex: /\b(tailwindcss|tailwind(\s*css)?)\b/i
  },
  {
    canonical: 'Vue',
    normalized: 'vue',
    regex: /\b(vue|vue\.?js)\b/i
  },
  {
    canonical: 'AI',
    normalized: 'ai',
    regex: /(\bAI\b|\bartificial intelligence\b)/i
  },
  {
    canonical: 'Blockchain',
    normalized: 'blockchain',
    regex: /\b(blockchain|web3)\b/i
  },
  {
    canonical: 'Agile',
    normalized: 'agile',
    regex: /\b(agile|scrum|kanban)\b/i
  }
];

/**
 * Find exact line or sentence in source text where skill pattern appears
 */
const findEvidenceInText = (text, regex) => {
  if (!text || !regex) return null;
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && regex.test(trimmed)) {
      return trimmed.replace(/^[•\-\*#\d\.\s]+/, '').trim();
    }
  }
  // Try sentence split if not found on single line
  const sentences = text.split(/(?<=[.!?])\s+/);
  for (const s of sentences) {
    const trimmed = s.trim();
    if (trimmed && regex.test(trimmed)) {
      return trimmed;
    }
  }
  return null;
};

/**
 * Check if a skill exists in source text
 */
const isSkillInSourceText = (skillStr, sourceText) => {
  if (!skillStr || !sourceText) return { exists: false, evidence: null };
  const norm = normalizeSkill(skillStr);

  const entry = KNOWN_CATALOG.find(c => c.normalized === norm);
  if (entry) {
    const evidence = findEvidenceInText(sourceText, entry.regex);
    return { exists: !!evidence, evidence, canonical: entry.canonical };
  }

  // Fallback for custom skills
  const escaped = skillStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const customRegex = new RegExp(`\\b${escaped}\\b`, 'i');
  const evidence = findEvidenceInText(sourceText, customRegex);
  return { exists: !!evidence, evidence, canonical: skillStr };
};

/**
 * Detect alternative requirements pattern like "Go, Java, or Python" in text
 * Supports Oxford commas: "Go, Java, or Python"
 */
const detectAlternativeGroups = (text) => {
  const groups = [];
  if (!text) return groups;

  // Patterns such as "Go, Java, or Python", "React or Vue", "Java, C#, or Python", "AWS or Azure"
  const orPattern = /([A-Za-z0-9.+]+(?:\s*,\s*[A-Za-z0-9.+]+)*)\s*,?\s*or\s+([A-Za-z0-9.+]+)/gi;
  let match;
  while ((match = orPattern.exec(text)) !== null) {
    const rawList = match[1].split(',').map(s => s.trim()).concat([match[2].trim()]);
    // Filter to known technical skills
    const validSkills = [];
    for (const item of rawList) {
      const norm = normalizeSkill(item);
      const catalogEntry = KNOWN_CATALOG.find(c => c.normalized === norm);
      if (catalogEntry && !validSkills.includes(catalogEntry.canonical)) {
        validSkills.push(catalogEntry.canonical);
      }
    }

    if (validSkills.length >= 2) {
      const evidence = findEvidenceInText(text, new RegExp(validSkills[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')) || match[0];
      groups.push({
        type: 'any_of',
        skills: validSkills,
        requiredMatches: 1,
        label: validSkills.join(' / '),
        evidence
      });
    }
  }

  return groups;
};

/**
 * Build candidate skills map from authenticated profile skills + resume extracted skills
 */
const buildCandidateSkills = (savedProfileSkills = [], extractedResumeSkills = []) => {
  const skillsMap = new Map();

  // Add saved profile skills (Source: Profile)
  for (const s of (savedProfileSkills || [])) {
    if (!s || typeof s !== 'string') continue;
    const norm = normalizeSkill(s);
    if (!norm) continue;
    const canonical = getCanonicalSkillName(s);
    skillsMap.set(norm, {
      name: canonical,
      normalized: norm,
      source: 'Profile'
    });
  }

  // Merge extracted resume skills
  for (const s of (extractedResumeSkills || [])) {
    if (!s || typeof s !== 'string') continue;
    const norm = normalizeSkill(s);
    if (!norm) continue;
    const canonical = getCanonicalSkillName(s);
    if (skillsMap.has(norm)) {
      skillsMap.get(norm).source = 'Profile & Resume';
    } else {
      skillsMap.set(norm, {
        name: canonical,
        normalized: norm,
        source: 'Resume'
      });
    }
  }

  return skillsMap;
};

/**
 * Grounding Layer: Validates job requirements against original job description source text.
 * Discards hallucinated skills absent from the JD.
 */
const groundJobRequirements = (rawJob = {}, originalJdText = '') => {
  if (!originalJdText) return rawJob;

  const rawMandatory = Array.isArray(rawJob?.mandatory_skills) ? rawJob.mandatory_skills : [];
  const rawPreferred = Array.isArray(rawJob?.preferred_skills) ? rawJob.preferred_skills : [];

  // Detect alternative groups present in the JD
  const detectedOrGroups = detectAlternativeGroups(originalJdText);
  const alternativeGroupSkills = new Set();
  for (const grp of detectedOrGroups) {
    grp.skills.forEach(s => alternativeGroupSkills.add(normalizeSkill(s)));
  }

  const validateSkillList = (list, isPreferredSection = false) => {
    const validated = [];
    const seen = new Set();

    for (const item of list) {
      if (!item) continue;

      // Handle already structured alternative group
      if (typeof item === 'object' && item.type === 'any_of') {
        const validGroupMembers = [];
        for (const s of (item.skills || [])) {
          const { exists } = isSkillInSourceText(s, originalJdText);
          if (exists) validGroupMembers.push(getCanonicalSkillName(s));
        }
        if (validGroupMembers.length > 0) {
          const label = item.label || validGroupMembers.join(' / ');
          if (!seen.has(label)) {
            seen.add(label);
            validated.push({
              type: 'any_of',
              skills: validGroupMembers,
              requiredMatches: item.requiredMatches || 1,
              label,
              evidence: item.evidence || findEvidenceInText(originalJdText, new RegExp(validGroupMembers[0], 'i'))
            });
          }
        }
        continue;
      }

      // If string contains explicit OR pattern like "Go, Java, or Python" or "Go / Java / Python"
      const itemStr = String(item).trim();
      if (itemStr.includes(' or ') || itemStr.includes(' / ')) {
        const parts = itemStr.split(/ or | \/ /i).map(p => p.trim());
        const validParts = [];
        for (const p of parts) {
          const { exists, canonical } = isSkillInSourceText(p, originalJdText);
          if (exists && !validParts.includes(canonical)) validParts.push(canonical);
        }
        if (validParts.length >= 2) {
          const label = validParts.join(' / ');
          if (!seen.has(label)) {
            seen.add(label);
            validated.push({
              type: 'any_of',
              skills: validParts,
              requiredMatches: 1,
              label,
              evidence: findEvidenceInText(originalJdText, new RegExp(validParts[0], 'i')) || itemStr
            });
          }
          continue;
        }
      }

      // Check grounding against source JD text
      const { exists, evidence, canonical } = isSkillInSourceText(itemStr, originalJdText);

      // CRITICAL DEFENSE: Discard hallucinated technologies not in the source text
      if (!exists) {
        continue;
      }

      const norm = normalizeSkill(canonical);

      // If this skill is part of a detected OR group in the requirements, do not duplicate as standalone mandatory
      if (alternativeGroupSkills.has(norm)) {
        continue;
      }

      if (!seen.has(norm)) {
        seen.add(norm);
        validated.push({
          name: canonical,
          normalized: norm,
          evidence
        });
      }
    }

    return validated;
  };

  const groundedMandatory = validateSkillList(rawMandatory, false);
  const groundedPreferred = validateSkillList(rawPreferred, true);

  // Add detected OR groups to mandatory requirements if not already present
  for (const grp of detectedOrGroups) {
    const alreadyPresent = groundedMandatory.some(m => m.type === 'any_of' && m.label === grp.label);
    if (!alreadyPresent) {
      groundedMandatory.push(grp);
    }
  }

  return {
    role_title: rawJob.role_title || 'Software Engineer',
    mandatory_skills: groundedMandatory,
    preferred_skills: groundedPreferred,
    required_years_experience: Math.max(0, Number(rawJob?.required_years_experience) || 0),
    required_education_level: rawJob?.required_education_level || 'Bachelor'
  };
};

/**
 * Deterministic Job Description & Resume Parser (Fallback & Grounding Engine)
 * Runs safely when AI is offline, malformed, or hallucinating.
 * NEVER invents skills.
 */
const parseJobDescriptionDeterministic = (jdText = '') => {
  if (!jdText) {
    return {
      role_title: 'Software Engineer',
      mandatory_skills: [],
      preferred_skills: [],
      required_years_experience: 0,
      required_education_level: 'Bachelor'
    };
  }

  // Detect sections in the JD
  const lines = jdText.split(/\r?\n/);
  const preferredHeaders = ['nice to have', 'preferred', 'bonus', 'plus', 'advantageous', 'optional'];
  const mandatoryHeaders = ['what you’ll do', "what you'll do", 'what we’re looking for', "what we're looking for", 'requirements', 'qualifications', 'must have', 'responsibilities'];
  const ignoreHeaders = ['what you get', 'what we offer', 'benefits', 'perks', 'about us', 'about the company', 'who we are'];

  const jdLower = jdText.toLowerCase();
  const hasExplicitSections = mandatoryHeaders.some(h => jdLower.includes(h)) || preferredHeaders.some(h => jdLower.includes(h));

  let currentSection = hasExplicitSections ? 'general' : 'mandatory';

  const mandatorySkillsList = [];
  const preferredSkillsList = [];

  // Check detected OR groups
  const orGroups = detectAlternativeGroups(jdText);
  const groupSkills = new Set();
  orGroups.forEach(g => g.skills.forEach(s => groupSkills.add(normalizeSkill(s))));

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();

    // Section header check
    if (ignoreHeaders.some(h => lower.includes(h))) {
      currentSection = 'ignore';
      continue;
    }
    if (preferredHeaders.some(h => lower.includes(h))) {
      currentSection = 'preferred';
      continue;
    }
    if (mandatoryHeaders.some(h => lower.includes(h))) {
      currentSection = 'mandatory';
      continue;
    }

    if (currentSection === 'ignore') {
      continue;
    }

    // When explicit sections exist, do not extract skills from general company descriptions/hooks
    if (currentSection === 'general') {
      continue;
    }

    // Check each known skill in line
    for (const catalogItem of KNOWN_CATALOG) {
      if (catalogItem.regex.test(trimmed)) {
        const norm = catalogItem.normalized;
        // Do not add individual skills that belong to an OR group
        if (groupSkills.has(norm)) continue;

        const evidence = trimmed.replace(/^[•\-\*#\d\.\s]+/, '').trim();
        const skillObj = {
          name: catalogItem.canonical,
          normalized: norm,
          evidence
        };

        if (currentSection === 'preferred') {
          // If already in mandatory, move to preferred because it was explicitly classified under Nice to Have
          const mandIdx = mandatorySkillsList.findIndex(s => s.normalized === norm);
          if (mandIdx !== -1) {
            mandatorySkillsList.splice(mandIdx, 1);
          }
          if (!preferredSkillsList.some(s => s.normalized === norm)) {
            preferredSkillsList.push(skillObj);
          }
        } else if (currentSection === 'mandatory') {
          if (!mandatorySkillsList.some(s => s.normalized === norm) && !preferredSkillsList.some(s => s.normalized === norm)) {
            mandatorySkillsList.push(skillObj);
          }
        }
      }
    }
  }

  // Add OR groups to mandatory
  for (const grp of orGroups) {
    mandatorySkillsList.push(grp);
  }

  // Detect degree from text
  let detectedDegree = 'Bachelor';
  if (/master|m\.s\.|graduate degree/i.test(jdText)) detectedDegree = 'Master';
  if (/phd|doctorate/i.test(jdText)) detectedDegree = 'PhD';

  // Detect experience years
  let detectedExp = 0;
  const expMatch = /(\d+)\+?\s*years?(?:\s+of)?\s+experience/i.exec(jdText);
  if (expMatch) {
    detectedExp = parseInt(expMatch[1], 10) || 0;
  }

  return {
    role_title: 'Software Engineer',
    mandatory_skills: mandatorySkillsList,
    preferred_skills: preferredSkillsList,
    required_years_experience: detectedExp,
    required_education_level: detectedDegree
  };
};

/**
 * Deterministic Mathematical Scoring Engine
 * 
 * Weights:
 * - Mandatory Skills: 45 points
 * - Preferred Skills: 25 points
 * - Experience Level: 20 points
 * - Education Match: 10 points
 */
const calculateMatchScore = (job, candidate) => {
  const rawMandatory = Array.isArray(job?.mandatory_skills) ? job.mandatory_skills : [];
  const rawPreferred = Array.isArray(job?.preferred_skills) ? job.preferred_skills : [];

  // Build candidate skills Map if candidate.skills is array or already Map
  let candidateSkillsMap = new Map();
  if (candidate?.skills instanceof Map) {
    candidateSkillsMap = candidate.skills;
  } else if (Array.isArray(candidate?.skills)) {
    for (const s of candidate.skills) {
      if (typeof s === 'string') {
        const norm = normalizeSkill(s);
        if (norm) {
          candidateSkillsMap.set(norm, {
            name: getCanonicalSkillName(s),
            normalized: norm,
            source: candidate?.source || 'Resume'
          });
        }
      } else if (s && typeof s === 'object' && s.normalized) {
        candidateSkillsMap.set(s.normalized, s);
      }
    }
  }

  const matched_mandatory = [];
  const missing_mandatory = [];
  const matched_preferred = [];
  const missing_preferred = [];

  const matchedSkills = [];
  const missingSkills = [];

  // Helper: Test if candidate possesses skill or database equivalent
  const checkCandidatePossessesSkill = (reqSkillStr) => {
    const norm = normalizeSkill(reqSkillStr);
    
    // Direct match
    if (candidateSkillsMap.has(norm)) {
      const candSkill = candidateSkillsMap.get(norm);
      return {
        matched: true,
        skill: candSkill.name,
        source: candSkill.source,
        type: 'exact'
      };
    }

    // Database Relationship: PostgreSQL <-> SQL / relational databases capability
    if (norm === 'postgresql' && candidateSkillsMap.has('sql')) {
      const candSkill = candidateSkillsMap.get('sql');
      return {
        matched: true,
        skill: 'SQL',
        source: candSkill.source,
        type: 'relationship',
        explanation: 'SQL capability satisfies relational database requirement'
      };
    }

    if (norm === 'sql' && candidateSkillsMap.has('postgresql')) {
      const candSkill = candidateSkillsMap.get('postgresql');
      return {
        matched: true,
        skill: 'PostgreSQL',
        source: candSkill.source,
        type: 'relationship',
        explanation: 'PostgreSQL capability satisfies SQL requirement'
      };
    }

    return { matched: false };
  };

  // 1. Process Mandatory Requirements
  for (const item of rawMandatory) {
    if (!item) continue;

    // A. Alternative Group (e.g., Go, Java, or Python)
    if (typeof item === 'object' && item.type === 'any_of') {
      const groupSkills = item.skills || [];
      const label = item.label || groupSkills.join(' / ');
      const evidence = item.evidence || '';

      let satisfied = false;
      let matchedCandidateSkill = null;

      for (const opt of groupSkills) {
        const check = checkCandidatePossessesSkill(opt);
        if (check.matched) {
          satisfied = true;
          matchedCandidateSkill = check;
          break; // At least one acceptable option satisfies requirement
        }
      }

      if (satisfied) {
        matched_mandatory.push(label);
        matchedSkills.push({
          skill: label,
          satisfiedBy: matchedCandidateSkill.skill,
          candidateSource: matchedCandidateSkill.source,
          jobEvidence: evidence,
          status: 'satisfied',
          type: 'alternative',
          matchType: 'alternative'
        });
      } else {
        missing_mandatory.push(label);
        missingSkills.push({
          skill: label,
          jobEvidence: evidence,
          status: 'missing',
          type: 'alternative',
          matchType: 'alternative'
        });
      }
      continue;
    }

    // B. Check string format with inline OR like "Go / Java / Python"
    const skillName = typeof item === 'string' ? item : item.name;
    const evidence = typeof item === 'object' ? item.evidence : null;

    if (typeof skillName === 'string' && (skillName.includes(' / ') || skillName.includes(' or '))) {
      const parts = skillName.split(/ or | \/ /i).map(s => s.trim());
      let satisfied = false;
      let matchedCandidateSkill = null;

      for (const opt of parts) {
        const check = checkCandidatePossessesSkill(opt);
        if (check.matched) {
          satisfied = true;
          matchedCandidateSkill = check;
          break;
        }
      }

      if (satisfied) {
        matched_mandatory.push(skillName);
        matchedSkills.push({
          skill: skillName,
          satisfiedBy: matchedCandidateSkill.skill,
          candidateSource: matchedCandidateSkill.source,
          jobEvidence: evidence || `Familiar with ${skillName}`,
          status: 'satisfied',
          type: 'alternative',
          matchType: 'alternative'
        });
      } else {
        missing_mandatory.push(skillName);
        missingSkills.push({
          skill: skillName,
          jobEvidence: evidence || `Familiar with ${skillName}`,
          status: 'missing',
          type: 'alternative',
          matchType: 'alternative'
        });
      }
      continue;
    }

    // C. Standard Skill Requirement
    const check = checkCandidatePossessesSkill(skillName);
    if (check.matched) {
      // If matched via relationship, record the candidate's skill that satisfied it
      const recordedName = check.type === 'relationship' ? check.skill : skillName;
      matched_mandatory.push(recordedName);
      matchedSkills.push({
        skill: check.skill,
        matchedRequirement: skillName,
        candidateSource: check.source,
        jobEvidence: evidence || skillName,
        status: 'satisfied',
        type: check.type,
        matchType: check.type,
        explanation: check.explanation
      });
    } else {
      missing_mandatory.push(skillName);
      missingSkills.push({
        skill: skillName,
        jobEvidence: evidence || skillName,
        status: 'missing',
        type: 'exact',
        matchType: 'exact'
      });
    }
  }

  // 2. Process Preferred Requirements
  for (const item of rawPreferred) {
    if (!item) continue;
    const skillName = typeof item === 'string' ? item : item.name;
    const evidence = typeof item === 'object' ? item.evidence : null;

    const check = checkCandidatePossessesSkill(skillName);
    if (check.matched) {
      const recordedName = check.type === 'relationship' ? check.skill : skillName;
      matched_preferred.push(recordedName);
      matchedSkills.push({
        skill: check.skill,
        matchedRequirement: skillName,
        candidateSource: check.source,
        jobEvidence: evidence || skillName,
        status: 'satisfied',
        category: 'preferred',
        type: check.type,
        matchType: check.type
      });
    } else {
      missing_preferred.push(skillName);
      missingSkills.push({
        skill: skillName,
        jobEvidence: evidence || skillName,
        status: 'missing',
        category: 'preferred',
        type: 'exact',
        matchType: 'exact'
      });
    }
  }

  // 3. Mathematical Scoring Allocation (0 - 100)
  const mandatoryScore = rawMandatory.length > 0 
    ? Math.round((matched_mandatory.length / rawMandatory.length) * 45) 
    : 45;

  const preferredScore = rawPreferred.length > 0 
    ? Math.round((matched_preferred.length / rawPreferred.length) * 25) 
    : 25;

  const requiredExp = Math.max(0, Number(job?.required_years_experience) || 0);
  const candidateExp = Math.max(0, Number(candidate?.years_experience) || 0);
  let experienceScore = 20;
  if (requiredExp > 0) {
    experienceScore = Math.min(20, Math.round((candidateExp / requiredExp) * 20));
  }

  const reqEduRank = normalizeDegree(job?.required_education_level);
  const candEduRank = normalizeDegree(candidate?.education_level);
  let educationScore = 10;
  if (candEduRank < reqEduRank) {
    educationScore = candEduRank === reqEduRank - 1 ? 6 : 3;
  }

  const overallScore = Math.min(100, Math.max(0, mandatoryScore + preferredScore + experienceScore + educationScore));

  return {
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
    candidateExp,
    requiredExp,
    rawMandatory,
    rawPreferred
  };
};

module.exports = {
  DEGREE_HIERARCHY,
  normalizeDegree,
  ALIAS_MAP,
  normalizeSkill,
  getCanonicalSkillName,
  KNOWN_CATALOG,
  findEvidenceInText,
  isSkillInSourceText,
  detectAlternativeGroups,
  buildCandidateSkills,
  groundJobRequirements,
  parseJobDescriptionDeterministic,
  calculateMatchScore
};
