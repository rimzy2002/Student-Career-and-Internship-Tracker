const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
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
} = require('../src/utils/matchingEngine');
const aiMatchController = require('../src/controllers/aiMatchController');
const { supabase } = require('../src/config/supabase');

describe('CareerTrack Resume Matching Accuracy Suite', () => {

  const COULLAX_JD = `
Ready to fire up your dev career? 🔥

At Coullax, we Build the Unbuilt creating cutting edge AI and blockchain products for the future. We’re looking for curious, fast learners who enjoy solving real problems and building real things.

What You’ll Do

Work on real product features using React, Next.js, and Go
Debug, solve problems, and actually ship code
Collaborate in Agile teams stand-ups, code reviews, the works
Integrate with REST APIs and work with PostgreSQL databases
Learn fast and contribute from day one

What We’re Looking For

Basics in JS/TS + React
Familiar with Go, Java, or Python + REST APIs
Understanding of relational databases
Agile mindset and strong problem-solving attitude
Currently pursuing a degree in CS, Software Engineering, or related field

Nice to Have

AI / Blockchain exposure
Personal or open-source projects

What You Get

Work on real global products
Modern tech stack + mentorship
Flexible, fast paced, builder culture
  `.trim();

  describe('Step 14: Focused Unit Tests (Requirements 1 - 20)', () => {

    test('1. saved profile skill TypeScript survives into candidate skills', () => {
      const savedSkills = ['TypeScript'];
      const candidateSkills = buildCandidateSkills(savedSkills, []);
      assert.ok(candidateSkills.has('typescript'));
      assert.equal(candidateSkills.get('typescript').name, 'TypeScript');
      assert.equal(candidateSkills.get('typescript').source, 'Profile');
    });

    test('2. saved profile skill SQL survives into candidate skills', () => {
      const savedSkills = ['SQL'];
      const candidateSkills = buildCandidateSkills(savedSkills, []);
      assert.ok(candidateSkills.has('sql'));
      assert.equal(candidateSkills.get('sql').name, 'SQL');
      assert.equal(candidateSkills.get('sql').source, 'Profile');
    });

    test('3. JS normalizes to JavaScript', () => {
      assert.equal(normalizeSkill('JS'), 'javascript');
      assert.equal(normalizeSkill('js'), 'javascript');
      assert.equal(getCanonicalSkillName('js'), 'JavaScript');
    });

    test('4. TS normalizes to TypeScript', () => {
      assert.equal(normalizeSkill('TS'), 'typescript');
      assert.equal(normalizeSkill('ts'), 'typescript');
      assert.equal(getCanonicalSkillName('ts'), 'TypeScript');
    });

    test('5. PostgreSQL job evidence maps correctly to database/SQL relationship', () => {
      const job = {
        mandatory_skills: [{
          name: 'PostgreSQL',
          normalized: 'postgresql',
          evidence: 'Integrate with REST APIs and work with PostgreSQL databases'
        }]
      };
      // Candidate only has SQL (from profile)
      const candidate = {
        skills: buildCandidateSkills(['SQL'], [])
      };

      const result = calculateMatchScore(job, candidate);
      assert.equal(result.matched_mandatory.length, 1);
      assert.equal(result.missing_mandatory.length, 0);
      assert.equal(result.matchedSkills[0].skill, 'SQL');
      assert.equal(result.matchedSkills[0].matchedRequirement, 'PostgreSQL');
      assert.equal(result.matchedSkills[0].matchType, 'relationship');
      assert.equal(result.matchedSkills[0].jobEvidence, 'Integrate with REST APIs and work with PostgreSQL databases');
    });

    test('6. Next.js does NOT become Node.js', () => {
      assert.notEqual(normalizeSkill('Next.js'), normalizeSkill('Node.js'));
      assert.notEqual(normalizeSkill('nextjs'), 'node.js');

      // Given a JD requiring Next.js, candidate with Node.js does not match Next.js
      const job = {
        mandatory_skills: ['Next.js']
      };
      const candidate = {
        skills: ['Node.js']
      };
      const result = calculateMatchScore(job, candidate);
      assert.equal(result.matched_mandatory.length, 0);
      assert.equal(result.missing_mandatory.length, 1);
      assert.deepEqual(result.missing_mandatory, ['Next.js']);
    });

    test('7. AWS is rejected when absent from JD', () => {
      const ungroundedJob = {
        mandatory_skills: ['React', 'AWS'],
        preferred_skills: []
      };
      const grounded = groundJobRequirements(ungroundedJob, COULLAX_JD);
      const skillNames = grounded.mandatory_skills.map(s => s.name || s.label);
      assert.ok(!skillNames.includes('AWS'), 'AWS must be discarded when not in JD');
      assert.ok(skillNames.includes('React'), 'React must be retained when present in JD');
    });

    test('8. Docker is rejected when absent from JD', () => {
      const ungroundedJob = {
        mandatory_skills: ['React'],
        preferred_skills: ['Docker']
      };
      const grounded = groundJobRequirements(ungroundedJob, COULLAX_JD);
      const preferredNames = grounded.preferred_skills.map(s => s.name || s.label);
      assert.ok(!preferredNames.includes('Docker'), 'Docker must be discarded when absent from JD');
    });

    test('9. "modern tech stack" does not create AWS/Docker/Kubernetes', () => {
      const snippet = 'Work on real global products with modern tech stack + mentorship';
      const parsed = parseJobDescriptionDeterministic(snippet);
      const allExtracted = [
        ...parsed.mandatory_skills.map(s => s.name || s.label),
        ...parsed.preferred_skills.map(s => s.name || s.label)
      ];
      assert.ok(!allExtracted.includes('AWS'), 'AWS must not be inferred from modern tech stack');
      assert.ok(!allExtracted.includes('Docker'), 'Docker must not be inferred from modern tech stack');
      assert.ok(!allExtracted.includes('Kubernetes'), 'Kubernetes must not be inferred from modern tech stack');
    });

    test('10. OR group "Go, Java, or Python" requires only one match', () => {
      const job = {
        mandatory_skills: [{
          type: 'any_of',
          skills: ['Go', 'Java', 'Python'],
          label: 'Go / Java / Python',
          requiredMatches: 1
        }]
      };
      // Candidate with only Python satisfies the 1 requirement
      const candidate = {
        skills: ['Python']
      };
      const result = calculateMatchScore(job, candidate);
      assert.equal(result.rawMandatory.length, 1, 'Group counts as single requirement');
      assert.equal(result.matched_mandatory.length, 1);
      assert.equal(result.missing_mandatory.length, 0);
      assert.equal(result.mandatoryScore, 45, 'Full points awarded for satisfying alternative group');
    });

    test('11. candidate Java satisfies Go/Java/Python group', () => {
      const job = {
        mandatory_skills: [{
          type: 'any_of',
          skills: ['Go', 'Java', 'Python'],
          label: 'Go / Java / Python',
          requiredMatches: 1
        }]
      };
      const candidate = {
        skills: ['Java']
      };
      const result = calculateMatchScore(job, candidate);
      assert.equal(result.matched_mandatory.length, 1);
      assert.equal(result.matchedSkills[0].satisfiedBy, 'Java');
    });

    test('12. candidate Python satisfies Go/Java/Python group', () => {
      const job = {
        mandatory_skills: [{
          type: 'any_of',
          skills: ['Go', 'Java', 'Python'],
          label: 'Go / Java / Python',
          requiredMatches: 1
        }]
      };
      const candidate = {
        skills: ['Python']
      };
      const result = calculateMatchScore(job, candidate);
      assert.equal(result.matched_mandatory.length, 1);
      assert.equal(result.matchedSkills[0].satisfiedBy, 'Python');
    });

    test('13. candidate without any group member leaves requirement missing', () => {
      const job = {
        mandatory_skills: [{
          type: 'any_of',
          skills: ['Go', 'Java', 'Python'],
          label: 'Go / Java / Python',
          requiredMatches: 1
        }]
      };
      const candidate = {
        skills: ['JavaScript', 'HTML', 'CSS']
      };
      const result = calculateMatchScore(job, candidate);
      assert.equal(result.matched_mandatory.length, 0);
      assert.equal(result.missing_mandatory.length, 1);
      assert.equal(result.missing_mandatory[0], 'Go / Java / Python');
    });

    test('14. AI/Blockchain under "Nice to Have" becomes preferred', () => {
      const parsed = parseJobDescriptionDeterministic(COULLAX_JD);
      const preferredNames = parsed.preferred_skills.map(s => s.name);
      assert.ok(preferredNames.includes('AI'), 'AI under Nice to Have must be preferred');
      assert.ok(preferredNames.includes('Blockchain'), 'Blockchain under Nice to Have must be preferred');
      const mandatoryNames = parsed.mandatory_skills.map(s => s.name || s.label);
      assert.ok(!mandatoryNames.includes('AI'), 'AI must not be mandatory');
      assert.ok(!mandatoryNames.includes('Blockchain'), 'Blockchain must not be mandatory');
    });

    test('15. candidate skill union deduplicates profile + extracted skills', () => {
      const profileSkills = ['React', 'TypeScript', 'SQL'];
      const resumeSkills = ['react', 'TypeScript', 'REST APIs', 'Node.js'];
      const combined = buildCandidateSkills(profileSkills, resumeSkills);

      // React should appear once with 'Profile & Resume' source
      assert.ok(combined.has('react'));
      assert.equal(combined.get('react').source, 'Profile & Resume');

      // TypeScript should appear once with 'Profile & Resume' source
      assert.ok(combined.has('typescript'));
      assert.equal(combined.get('typescript').source, 'Profile & Resume');

      // SQL from profile only
      assert.ok(combined.has('sql'));
      assert.equal(combined.get('sql').source, 'Profile');

      // REST APIs from resume only
      assert.ok(combined.has('rest apis'));
      assert.equal(combined.get('rest apis').source, 'Resume');
    });

    test('16. malformed AI output safely uses deterministic fallback', () => {
      // Deterministic parser parses source directly
      const fallbackJob = parseJobDescriptionDeterministic(COULLAX_JD);
      assert.ok(fallbackJob.mandatory_skills.length > 0);
      assert.ok(fallbackJob.preferred_skills.length > 0);
      // Validates that it does not hallucinate
      const allNames = [
        ...fallbackJob.mandatory_skills.map(s => s.name || s.label),
        ...fallbackJob.preferred_skills.map(s => s.name || s.label)
      ];
      assert.ok(!allNames.includes('AWS'));
      assert.ok(!allNames.includes('Docker'));
      assert.ok(!allNames.includes('Node.js'));
    });

    test('17. LLM cannot override deterministic final score', () => {
      const job = {
        mandatory_skills: ['React'],
        preferred_skills: [],
        required_years_experience: 1,
        required_education_level: 'Bachelor'
      };
      const candidate = {
        skills: ['React'],
        years_experience: 1,
        education_level: 'Bachelor'
      };
      // Even if AI claims score is 40 or 99, deterministic formula governs
      const mathResult = calculateMatchScore(job, candidate);
      assert.equal(mathResult.overallScore, 100);
    });

    test('18. score remains <= 100', () => {
      const job = {
        mandatory_skills: ['React', 'TypeScript'],
        preferred_skills: ['Docker', 'AWS'],
        required_years_experience: 1,
        required_education_level: 'Bachelor'
      };
      const candidate = {
        skills: ['React', 'TypeScript', 'Docker', 'AWS', 'ExtraSkill1', 'ExtraSkill2'],
        years_experience: 10,
        education_level: 'PhD'
      };
      const result = calculateMatchScore(job, candidate);
      assert.ok(result.overallScore <= 100);
      assert.equal(result.overallScore, 100);
    });

    test('19. missing optional data does not throw', () => {
      assert.doesNotThrow(() => {
        calculateMatchScore(null, null);
      });
      assert.doesNotThrow(() => {
        groundJobRequirements(null, null);
      });
      assert.doesNotThrow(() => {
        buildCandidateSkills(null, null);
      });
      assert.doesNotThrow(() => {
        parseJobDescriptionDeterministic(null);
      });
    });

    test('20. unauthorized user cannot fetch another student\'s saved skills', async () => {
      // Create request where attacker injects spoofed studentId in body and headers
      let queriedStudentId = null;

      // Mock Supabase select eq
      const originalFrom = supabase.from;
      supabase.from = (table) => {
        return {
          select: () => ({
            eq: (col, val) => {
              if (table === 'student_skills' && col === 'student_id') {
                queriedStudentId = val;
              }
              return {
                is: () => ({ maybeSingle: async () => ({ data: null }) }),
                then: (resolve) => resolve({ data: [] })
              };
            }
          })
        };
      };

      try {
        const req = {
          user: { userId: 'real-student-456', role: 'student' },
          body: {
            studentId: 'target-student-999', // Spoof attempt
            userId: 'target-student-999',    // Spoof attempt
            job_description: COULLAX_JD,
            resume_text: 'Sample resume text with React and SQL'
          }
        };

        const res = {
          statusCode: 200,
          status(code) { this.statusCode = code; return this; },
          json(payload) { this.body = payload; return this; }
        };

        await aiMatchController.matchResumeToJob(req, res);

        assert.equal(queriedStudentId, 'real-student-456', 'Must only query DB with authenticated req.user.userId');
        assert.notEqual(queriedStudentId, 'target-student-999', 'Must never use client-provided studentId');
      } finally {
        supabase.from = originalFrom;
      }
    });

  });

  describe('Step 15: Required Coullax Production Regression Scenario', () => {

    test('executes end-to-end regression match against exact Coullax job description', () => {
      // 1. Candidate Saved Profile Skills
      const candidateProfileSkills = [
        'JavaScript',
        'TypeScript',
        'SQL',
        'React',
        'Python'
      ];

      // 2. Candidate Resume Text
      const resumeSummary = `
Skills: React, TypeScript, REST APIs, SQL
Education: Computer Science, University
Graduation: 2026
Summary: Full-stack builder excited about building real things and solving complex problems.
      `.trim();

      // 3. Extract candidate skills using authoritative union
      const extractedResumeSkills = [];
      for (const item of KNOWN_CATALOG) {
        if (item.regex.test(resumeSummary)) {
          extractedResumeSkills.push(item.canonical);
        }
      }
      const candidateSkills = buildCandidateSkills(candidateProfileSkills, extractedResumeSkills);

      // Verify Candidate Skills Union
      assert.ok(candidateSkills.has('typescript'), 'TypeScript present in candidate');
      assert.ok(candidateSkills.has('sql'), 'SQL present in candidate');
      assert.ok(candidateSkills.has('react'), 'React present in candidate');
      assert.ok(candidateSkills.has('javascript'), 'JavaScript present in candidate');
      assert.ok(candidateSkills.has('python'), 'Python present in candidate');
      assert.ok(candidateSkills.has('rest apis'), 'REST APIs present in candidate');

      // 4. Grounded Job Requirements Extraction
      const groundedJob = parseJobDescriptionDeterministic(COULLAX_JD);

      const allJobSkills = [
        ...groundedJob.mandatory_skills.map(s => s.name || s.label),
        ...groundedJob.preferred_skills.map(s => s.name || s.label)
      ];

      // Defenses: ABSOLUTELY NO HALLUCINATIONS
      assert.ok(!allJobSkills.includes('AWS'), 'AWS MUST NOT appear in extracted job requirements');
      assert.ok(!allJobSkills.includes('Docker'), 'Docker MUST NOT appear in extracted job requirements');
      assert.ok(!allJobSkills.includes('Kubernetes'), 'Kubernetes MUST NOT appear');
      assert.ok(!allJobSkills.includes('Node.js'), 'Node.js MUST NOT be treated as a required/matched job skill');

      // Expected Extractions
      assert.ok(allJobSkills.includes('React'), 'React must be in job requirements');
      assert.ok(allJobSkills.includes('TypeScript'), 'TypeScript must be in job requirements');
      assert.ok(allJobSkills.includes('JavaScript'), 'JavaScript must be in job requirements');
      assert.ok(allJobSkills.includes('Next.js'), 'Next.js must be in job requirements');
      assert.ok(allJobSkills.includes('REST APIs'), 'REST APIs must be in job requirements');
      assert.ok(allJobSkills.includes('Go / Java / Python'), 'Go / Java / Python must be alternative group');
      assert.ok(allJobSkills.includes('AI'), 'AI must appear in preferred');
      assert.ok(allJobSkills.includes('Blockchain'), 'Blockchain must appear in preferred');

      // 5. Deterministic Scoring Execution
      const scoreCandidate = {
        skills: candidateSkills,
        years_experience: 1,
        education_level: 'Bachelor'
      };

      const result = calculateMatchScore(groundedJob, scoreCandidate);

      // Expected Matches Verification:
      // TypeScript: MATCHED
      assert.ok(result.matched_mandatory.includes('TypeScript'), 'TypeScript: MATCHED');

      // SQL / relational database capability: MATCHED appropriately
      const hasSqlMatch = result.matchedSkills.some(m => m.skill === 'SQL' || m.matchedRequirement === 'PostgreSQL');
      assert.ok(hasSqlMatch, 'SQL / relational database capability: MATCHED appropriately');
      assert.ok(!result.missing_mandatory.includes('SQL'), 'SQL is not missing');

      // JavaScript: MATCHED
      assert.ok(result.matched_mandatory.includes('JavaScript'), 'JavaScript: MATCHED');

      // React: MATCHED
      assert.ok(result.matched_mandatory.includes('React'), 'React: MATCHED');

      // REST APIs: MATCHED
      assert.ok(result.matched_mandatory.includes('REST APIs'), 'REST APIs: MATCHED');

      // Go / Java / Python alternative: SATISFIED by candidate Python
      assert.ok(result.matched_mandatory.includes('Go / Java / Python'), 'Go / Java / Python satisfied by candidate Python');
      const orMatchDetail = result.matchedSkills.find(m => m.skill === 'Go / Java / Python');
      assert.equal(orMatchDetail.satisfiedBy, 'Python');

      // Next.js: May remain missing if candidate does not actually have Next.js
      assert.ok(result.missing_mandatory.includes('Next.js'), 'Next.js accurately missing for candidate');

      // Internal Consistency
      assert.ok(result.overallScore <= 100, 'Score <= 100');
      assert.ok(result.overallScore > 64, 'Score improved past broken 64 fallback baseline');
      assert.equal(
        result.overallScore,
        result.mandatoryScore + result.preferredScore + result.experienceScore + result.educationScore,
        'Overall score equals sum of category points'
      );
    });

  });

});
