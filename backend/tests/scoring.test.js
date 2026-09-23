const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateMatchScore,
  normalizeSkill,
  normalizeDegree
} = require('../src/controllers/aiMatchController');

describe('Deterministic Scoring Engine', () => {

  describe('Skill & Degree Normalization', () => {
    test('normalizes common aliases correctly', () => {
      assert.equal(normalizeSkill('js'), 'javascript');
      assert.equal(normalizeSkill('ts'), 'typescript');
      assert.equal(normalizeSkill('react.js'), 'react');
      assert.equal(normalizeSkill('reactjs'), 'react');
      assert.equal(normalizeSkill('node'), 'node.js');
      assert.equal(normalizeSkill('nodejs'), 'node.js');
      assert.equal(normalizeSkill('postgres'), 'postgresql');
      assert.equal(normalizeSkill('py'), 'python');
      assert.equal(normalizeSkill('golang'), 'go');
      assert.equal(normalizeSkill('vue.js'), 'vue');
      assert.equal(normalizeSkill('next.js'), 'next.js');
      assert.equal(normalizeSkill('tailwind'), 'tailwindcss');
    });

    test('handles casing, whitespace, and special characters', () => {
      assert.equal(normalizeSkill('  React.JS  '), 'react');
      assert.equal(normalizeSkill('TYPE-SCRIPT'), 'typescript');
      assert.equal(normalizeSkill(''), '');
      assert.equal(normalizeSkill(null), '');
      assert.equal(normalizeSkill(undefined), '');
      assert.equal(normalizeSkill(123), '');
    });

    test('normalizes degree hierarchy correctly', () => {
      assert.equal(normalizeDegree('none'), 0);
      assert.equal(normalizeDegree('High School Diploma'), 1);
      assert.equal(normalizeDegree('Associate of Science'), 2);
      assert.equal(normalizeDegree('Bachelor of Science in CS'), 3);
      assert.equal(normalizeDegree('Master of Science'), 4);
      assert.equal(normalizeDegree('PhD in Computer Science'), 5);
      assert.equal(normalizeDegree('Doctorate'), 5);
      assert.equal(normalizeDegree(null), 2); // Default fallback
      assert.equal(normalizeDegree(''), 2);
    });
  });

  describe('Boundary: 0% and Partial Matches', () => {
    test('calculates near-minimum score when candidate has 0 skills and 0 experience', () => {
      const job = {
        mandatory_skills: ['Go', 'Rust', 'Kubernetes'],
        preferred_skills: ['GraphQL', 'gRPC'],
        required_years_experience: 5,
        required_education_level: 'Master'
      };

      const candidate = {
        skills: ['PHP', 'WordPress'],
        years_experience: 0,
        education_level: 'High School'
      };

      const result = calculateMatchScore(job, candidate);
      assert.equal(result.mandatoryScore, 0);
      assert.equal(result.preferredScore, 0);
      assert.equal(result.experienceScore, 0);
      assert.equal(result.educationScore, 3); // High School (1) < Master (4) (diff > 1) -> 3 points
      assert.equal(result.overallScore, 3);
      assert.equal(result.matched_mandatory.length, 0);
      assert.equal(result.missing_mandatory.length, 3);
    });

    test('calculates partial skill match proportionally', () => {
      const job = {
        mandatory_skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
        preferred_skills: ['Docker', 'AWS'],
        required_years_experience: 2,
        required_education_level: 'Bachelor'
      };

      // Matches 2 of 4 mandatory skills (50% of 45 = 23 rounded)
      // Matches 1 of 2 preferred skills (50% of 25 = 13 rounded)
      // Has 1 of 2 years experience (50% of 20 = 10)
      // Has Bachelor degree (10)
      const candidate = {
        skills: ['react.js', 'ts'], // tests normalization: 'react.js' -> 'react', 'ts' -> 'typescript'
        years_experience: 1,
        education_level: 'Bachelor'
      };

      const result = calculateMatchScore(job, candidate);
      assert.equal(result.mandatoryScore, 23);
      assert.equal(result.preferredScore, 0);
      assert.equal(result.experienceScore, 10);
      assert.equal(result.educationScore, 10);
      assert.equal(result.overallScore, 43);
      assert.deepEqual(result.matched_mandatory, ['React', 'TypeScript']);
      assert.deepEqual(result.missing_mandatory, ['Node.js', 'PostgreSQL']);
    });
  });

  describe('Boundary: 100% Mandatory Skills', () => {
    test('awards full 45 points when all mandatory skills are matched', () => {
      const job = {
        mandatory_skills: ['Python', 'SQL', 'FastAPI'],
        preferred_skills: ['Docker'],
        required_years_experience: 2,
        required_education_level: 'Bachelor'
      };

      const candidate = {
        skills: ['python', 'sql', 'fastapi'],
        years_experience: 0,
        education_level: 'Associate'
      };

      const result = calculateMatchScore(job, candidate);
      assert.equal(result.mandatoryScore, 45);
      assert.equal(result.matched_mandatory.length, 3);
      assert.equal(result.missing_mandatory.length, 0);
    });
  });

  describe('Boundary: Preferred Skills Contribution', () => {
    test('awards full 25 points when all preferred skills are matched', () => {
      const job = {
        mandatory_skills: ['JavaScript'],
        preferred_skills: ['AWS', 'Docker', 'Redis'],
        required_years_experience: 1,
        required_education_level: 'Bachelor'
      };

      const candidate = {
        skills: ['JavaScript', 'AWS', 'Docker', 'Redis'],
        years_experience: 1,
        education_level: 'Bachelor'
      };

      const result = calculateMatchScore(job, candidate);
      assert.equal(result.mandatoryScore, 45);
      assert.equal(result.preferredScore, 25);
      assert.equal(result.matched_preferred.length, 3);
      assert.equal(result.missing_preferred.length, 0);
    });
  });

  describe('Boundary: Experience Contribution & Experience Cap', () => {
    test('experience scales linearly with required years', () => {
      const job = {
        mandatory_skills: [],
        preferred_skills: [],
        required_years_experience: 4,
        required_education_level: 'Bachelor'
      };

      const candidate = {
        skills: [],
        years_experience: 2,
        education_level: 'Bachelor'
      };

      const result = calculateMatchScore(job, candidate);
      assert.equal(result.experienceScore, 10); // 2/4 * 20 = 10
    });

    test('experience caps at maximum 20 points even when candidate exceeds required years', () => {
      const job = {
        mandatory_skills: ['Python'],
        preferred_skills: [],
        required_years_experience: 2,
        required_education_level: 'Bachelor'
      };

      const candidate = {
        skills: ['Python'],
        years_experience: 10, // 5x requirement
        education_level: 'Bachelor'
      };

      const result = calculateMatchScore(job, candidate);
      assert.equal(result.experienceScore, 20); // capped at 20
    });

    test('awards full 20 experience points when job requires 0 experience', () => {
      const job = {
        mandatory_skills: ['HTML'],
        required_years_experience: 0,
        required_education_level: 'Bachelor'
      };

      const candidate = {
        skills: ['HTML'],
        years_experience: 0,
        education_level: 'Bachelor'
      };

      const result = calculateMatchScore(job, candidate);
      assert.equal(result.experienceScore, 20);
    });
  });

  describe('Boundary: Education Ranking & Normalization', () => {
    test('awards 10 points when candidate degree matches or exceeds required level', () => {
      const job = { required_education_level: 'Bachelor' };
      const candSame = { education_level: 'Bachelor of Science' };
      const candHigher = { education_level: 'Master of Science' };

      assert.equal(calculateMatchScore(job, candSame).educationScore, 10);
      assert.equal(calculateMatchScore(job, candHigher).educationScore, 10);
    });

    test('awards 6 points when candidate degree is one level below required', () => {
      const job = { required_education_level: 'Bachelor' }; // rank 3
      const cand = { education_level: 'Associate of Arts' }; // rank 2 (diff = 1)

      assert.equal(calculateMatchScore(job, cand).educationScore, 6);
    });

    test('awards 3 points when candidate degree is two or more levels below required', () => {
      const job = { required_education_level: 'Master' }; // rank 4
      const cand = { education_level: 'High School' }; // rank 1 (diff = 3)

      assert.equal(calculateMatchScore(job, cand).educationScore, 3);
    });
  });

  describe('Boundary: Total Score Never Exceeds 100', () => {
    test('perfect candidate achieves exactly 100 points, never exceeding 100', () => {
      const job = {
        mandatory_skills: ['React', 'Node.js', 'PostgreSQL'],
        preferred_skills: ['TypeScript', 'Docker'],
        required_years_experience: 2,
        required_education_level: 'Bachelor'
      };

      const candidate = {
        skills: ['React', 'Node.js', 'PostgreSQL', 'TypeScript', 'Docker', 'Kubernetes'],
        years_experience: 5,
        education_level: 'Master'
      };

      const result = calculateMatchScore(job, candidate);
      assert.equal(result.mandatoryScore, 45);
      assert.equal(result.preferredScore, 25);
      assert.equal(result.experienceScore, 20);
      assert.equal(result.educationScore, 10);
      assert.equal(result.overallScore, 100);
      assert.ok(result.overallScore <= 100);
      assert.ok(result.overallScore >= 0);
    });
  });

  describe('Robustness: Missing and Malformed Inputs', () => {
    test('handles empty and null job safely without throwing', () => {
      const result = calculateMatchScore(null, { skills: ['React'] });
      assert.ok(typeof result.overallScore === 'number');
      assert.ok(result.overallScore >= 0 && result.overallScore <= 100);
    });

    test('handles empty and null candidate safely without throwing', () => {
      const result = calculateMatchScore({ mandatory_skills: ['Java'] }, null);
      assert.ok(typeof result.overallScore === 'number');
      assert.ok(result.overallScore >= 0 && result.overallScore <= 100);
    });

    test('handles non-numeric or negative experience values gracefully', () => {
      const job = { required_years_experience: 'not-a-number' };
      const candidate = { years_experience: -5 };

      const result = calculateMatchScore(job, candidate);
      assert.equal(result.experienceScore, 20); // 0 required -> default full
    });
  });

});
