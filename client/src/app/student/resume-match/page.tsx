'use client';

import React, { useState } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Briefcase, 
  GraduationCap, 
  Lightbulb, 
  FileText, 
  RefreshCw,
  TrendingUp,
  Zap
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

interface ScoringBreakdown {
  mandatory_skills: {
    points_earned: number;
    max_points: number;
    matched_count: number;
    total_count: number;
  };
  preferred_skills: {
    points_earned: number;
    max_points: number;
    matched_count: number;
    total_count: number;
  };
  experience: {
    points_earned: number;
    max_points: number;
    candidate_years: number;
    required_years: number;
  };
  education: {
    points_earned: number;
    max_points: number;
    candidate_level: string;
    required_level: string;
  };
}

interface MatchResult {
  overall_score: number;
  scoring_breakdown: ScoringBreakdown;
  skills_analysis: {
    matched_mandatory: string[];
    missing_mandatory: string[];
    matched_preferred: string[];
    missing_preferred: string[];
  };
  recommendations: {
    resume_changes: string[];
    learning_priorities: string[];
  };
}

export default function ResumeMatchPage() {
  const [jobDescription, setJobDescription] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLoadProfile = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setError('Please log in to auto-load your profile data.');
      return;
    }

    try {
      const [skillsRes, profileRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/students/me/skills`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/api/v1/students/me/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      let skillNames: string[] = [];
      if (skillsRes.ok) {
        const skillsData = await skillsRes.json();
        skillNames = (skillsData.skills || []).map((s: { name: string }) => s.name);
      }

      let profileInfo = '';
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        const p = profileData.profile || profileData;
        profileInfo = `Education: ${p.major || 'Computer Science'}, ${p.university || 'University'}\nGraduation: ${p.graduation_year || 2026}\nSummary: ${p.bio || ''}`;
      }

      setResumeText(`Skills: ${skillNames.join(', ')}\n\n${profileInfo}`);
    } catch (e) {
      setError('Failed to fetch profile details.');
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobDescription || jobDescription.length < 50) {
      setError('Please paste a job description with at least 50 characters.');
      return;
    }

    setError(null);
    setIsAnalyzing(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/skills/match-resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          job_description: jobDescription,
          resume_text: resumeText
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Analysis failed');
      }

      setMatchResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 transition-colors">
      <div className="max-w-[1400px] mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 mb-2">
              <Sparkles className="w-3.5 h-3.5" /> Defensible Multi-Tier AI Matching
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Resume ↔ Job Match Analyzer
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Compare your credentials against target job descriptions with transparent mathematical scoring.
            </p>
          </div>
        </div>

        {/* Form Inputs Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Job Description Card */}
          <div className="bg-white dark:bg-gray-800/90 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                <Briefcase className="w-4 h-4 text-blue-500" />
                Target Job Description
              </label>
              <span className="text-xs text-gray-400">{jobDescription.length} chars</span>
            </div>
            <textarea
              rows={8}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste full job posting or requirements here (minimum 50 characters)..."
              className="w-full p-4 rounded-xl text-sm bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none resize-none transition-all placeholder:text-gray-400"
            />
          </div>

          {/* Candidate Resume Card */}
          <div className="bg-white dark:bg-gray-800/90 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                <FileText className="w-4 h-4 text-purple-500" />
                Your Resume or Portfolio Summary
              </label>
              <button
                type="button"
                onClick={handleLoadProfile}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <Zap className="w-3 h-3" /> Auto-fill from Profile
              </button>
            </div>
            <textarea
              rows={8}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste your resume text, skills list, or experience bullets..."
              className="w-full p-4 rounded-xl text-sm bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-purple-500 outline-none resize-none transition-all placeholder:text-gray-400"
            />
          </div>

        </div>

        {/* Action Button & Error */}
        <div className="flex flex-col items-center gap-4">
          {error && (
            <div className="flex items-center gap-2 px-4 py-2 text-sm text-rose-600 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="inline-flex items-center justify-center px-8 py-3.5 
                       bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 
                       hover:from-blue-700 hover:to-purple-700
                       disabled:opacity-50 text-white rounded-xl font-semibold text-base transition-all duration-200 
                       shadow-[0_10px_25px_rgba(79,70,229,0.3)] hover:scale-[1.01] active:scale-[0.99]"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                Extracting Requirements & Calculating Match...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Run Match Analysis
              </>
            )}
          </button>
        </div>

        {/* Results Section */}
        {matchResult && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Top Stat Row: Score Dial & Category Progress */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Overall Score Dial */}
              <div className="bg-white dark:bg-gray-800/90 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50 shadow-sm flex flex-col items-center justify-center text-center">
                <div className="relative flex items-center justify-center mb-3">
                  <div className="w-32 h-32 rounded-full border-8 border-gray-100 dark:border-gray-700 flex items-center justify-center">
                    <span className="text-4xl font-extrabold text-gray-900 dark:text-gray-100">
                      {matchResult.overall_score}
                    </span>
                    <span className="text-base font-bold text-gray-400">/100</span>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Overall Match Score</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Deterministic formula based on requirements, experience & credentials
                </p>
              </div>

              {/* Breakdown Bars */}
              <div className="lg:col-span-2 bg-white dark:bg-gray-800/90 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50 shadow-sm space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Weighted Scoring Breakdown
                </h3>

                <div className="space-y-3">
                  {/* Mandatory */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                      <span>Mandatory Skills (45% weight)</span>
                      <span>{matchResult.scoring_breakdown.mandatory_skills.points_earned} / 45 pts</span>
                    </div>
                    <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${(matchResult.scoring_breakdown.mandatory_skills.points_earned / 45) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Preferred */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                      <span>Preferred Skills (25% weight)</span>
                      <span>{matchResult.scoring_breakdown.preferred_skills.points_earned} / 25 pts</span>
                    </div>
                    <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${(matchResult.scoring_breakdown.preferred_skills.points_earned / 25) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Experience */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                      <span>Experience Level (20% weight)</span>
                      <span>{matchResult.scoring_breakdown.experience.points_earned} / 20 pts</span>
                    </div>
                    <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${(matchResult.scoring_breakdown.experience.points_earned / 20) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Education */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                      <span>Education Match (10% weight)</span>
                      <span>{matchResult.scoring_breakdown.education.points_earned} / 10 pts</span>
                    </div>
                    <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${(matchResult.scoring_breakdown.education.points_earned / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Skill Matrix Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Matched Skills */}
              <div className="bg-white dark:bg-gray-800/90 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-base">
                  <CheckCircle2 className="w-5 h-5" />
                  Matched Skills ({matchResult.skills_analysis.matched_mandatory.length + matchResult.skills_analysis.matched_preferred.length})
                </div>
                
                <div className="space-y-3">
                  <div>
                    <span className="text-xs font-medium text-gray-400 block mb-1.5">Mandatory Matched:</span>
                    <div className="flex flex-wrap gap-2">
                      {matchResult.skills_analysis.matched_mandatory.length > 0 ? (
                        matchResult.skills_analysis.matched_mandatory.map((skill, idx) => (
                          <span key={idx} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400 italic">None matched yet</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-medium text-gray-400 block mb-1.5">Preferred Matched:</span>
                    <div className="flex flex-wrap gap-2">
                      {matchResult.skills_analysis.matched_preferred.length > 0 ? (
                        matchResult.skills_analysis.matched_preferred.map((skill, idx) => (
                          <span key={idx} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400 italic">None matched yet</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Missing Skills */}
              <div className="bg-white dark:bg-gray-800/90 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold text-base">
                  <AlertCircle className="w-5 h-5" />
                  Missing Critical Requirements ({matchResult.skills_analysis.missing_mandatory.length + matchResult.skills_analysis.missing_preferred.length})
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-xs font-medium text-gray-400 block mb-1.5">Missing Mandatory (Priority):</span>
                    <div className="flex flex-wrap gap-2">
                      {matchResult.skills_analysis.missing_mandatory.length > 0 ? (
                        matchResult.skills_analysis.missing_mandatory.map((skill, idx) => (
                          <span key={idx} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-emerald-600 italic">All mandatory skills matched!</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-medium text-gray-400 block mb-1.5">Missing Preferred:</span>
                    <div className="flex flex-wrap gap-2">
                      {matchResult.skills_analysis.missing_preferred.length > 0 ? (
                        matchResult.skills_analysis.missing_preferred.map((skill, idx) => (
                          <span key={idx} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400 italic">None missing</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Recommendations & Action Plan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Resume Tailoring */}
              <div className="bg-white dark:bg-gray-800/90 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-base">
                  <Lightbulb className="w-5 h-5" />
                  Recommended Resume Changes
                </div>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  {matchResult.recommendations.resume_changes.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Learning Priorities */}
              <div className="bg-white dark:bg-gray-800/90 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-base">
                  <TrendingUp className="w-5 h-5" />
                  Suggested Learning Priorities
                </div>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  {matchResult.recommendations.learning_priorities.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
