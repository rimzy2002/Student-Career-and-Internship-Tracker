'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  Sparkles, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Briefcase, 
  Layers, 
  Award,
  Zap,
  Check,
  X,
  Loader2
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

export type ProficiencyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface MySkillItem {
  id: string;
  skillId?: string;
  name: string;
  category: string;
  proficiency: ProficiencyLevel;
  source: 'manual' | 'ai' | 'application' | 'resume';
  application_count: number;
  interview_count: number;
  offer_count: number;
  rejection_count: number;
  interview_rate: number;
  offer_rate: number;
}

export interface MasterSkillItem {
  id: string;
  name: string;
  category: string;
  normalized_name?: string;
}

export interface AiSuggestionItem {
  skillId: string;
  id?: string;
  name: string;
  category: string;
  confidence: number;
  matched: boolean;
}

const CATEGORIES = [
  'All',
  'Programming',
  'Engineering Software',
  'Industrial Automation',
  'Web & Frameworks',
  'Databases',
  'Cloud & DevOps',
  'Data & Analytics'
];

export default function SkillsManagementPage() {
  // --- States ---
  const [mySkills, setMySkills] = useState<MySkillItem[]>([]);
  const [isLoadingMySkills, setIsLoadingMySkills] = useState(true);

  // Master Skills & Search Combobox
  const [masterSkills, setMasterSkills] = useState<MasterSkillItem[]>([]);
  const [isLoadingMaster, setIsLoadingMaster] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSkill, setSelectedSkill] = useState<MasterSkillItem | null>(null);
  const [addProficiency, setAddProficiency] = useState<ProficiencyLevel>('intermediate');
  const [isAdding, setIsAdding] = useState(false);

  // AI Discovery Tool
  const [aiText, setAiText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestionItem[]>([]);
  const [selectedAiSkillIds, setSelectedAiSkillIds] = useState<Set<string>>(new Set());
  const [isBatchAdding, setIsBatchAdding] = useState(false);

  // Notifications & Feedback
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  const getHeaders = React.useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }, []);

  // Fetch Logged-in Student Skills
  const fetchMySkills = React.useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/students/skills`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setMySkills(data.skills || (Array.isArray(data) ? data : []));
      }
    } catch (err) {
      console.warn('Could not load student skills from server:', err);
    } finally {
      setIsLoadingMySkills(false);
    }
  }, [getHeaders]);

  // Fetch Master Catalog Skills
  const fetchMasterSkills = React.useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/skills`);
      if (res.ok) {
        const data = await res.json();
        setMasterSkills(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn('Could not load master catalog from server:', err);
    } finally {
      setIsLoadingMaster(false);
    }
  }, []);

  useEffect(() => {
    void fetchMySkills();
    void fetchMasterSkills();
  }, [fetchMySkills, fetchMasterSkills]);

  // Set of already added skill IDs for easy filtering
  const existingSkillIds = useMemo(() => {
    return new Set(mySkills.map(s => String(s.skillId || s.id)));
  }, [mySkills]);

  // Filtered master skills based on search query & category pill
  const filteredMasterSkills = useMemo(() => {
    return masterSkills.filter(skill => {
      const matchesCategory = selectedCategory === 'All' || skill.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchesSearch = !searchQuery || skill.name.toLowerCase().includes(searchQuery.toLowerCase());
      const notYetAdded = !existingSkillIds.has(String(skill.id));
      return matchesCategory && matchesSearch && notYetAdded;
    });
  }, [masterSkills, selectedCategory, searchQuery, existingSkillIds]);

  // --- Manual Add Skill Action ---
  const handleAddSkill = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedSkill) return;

    const skillId = selectedSkill.id;
    setIsAdding(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/students/skills`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          skillId: skillId,
          proficiency: addProficiency,
          source: 'manual'
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to add skill');
      }

      showToast('success', `Added ${selectedSkill.name} (${addProficiency}) to your skills!`);
      setSelectedSkill(null);
      setSearchQuery('');
      await fetchMySkills();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Could not add skill');
    } finally {
      setIsAdding(false);
    }
  };

  // --- Remove Skill Action ---
  const handleRemoveSkill = async (skillId: string, skillName: string) => {
    const priorSkills = [...mySkills];
    // Optimistic delete
    setMySkills(prev => prev.filter(s => String(s.skillId || s.id) !== String(skillId)));

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/students/skills/${skillId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      if (!res.ok) {
        throw new Error('Failed to delete skill from server');
      }

      showToast('success', `Removed ${skillName}`);
    } catch (err: unknown) {
      // Revert rollback
      setMySkills(priorSkills);
      showToast('error', err instanceof Error ? err.message : 'Could not remove skill');
    }
  };

  // --- AI Discovery Analyze Action ---
  const handleAnalyzeAi = async () => {
    if (aiText.length < 20) {
      showToast('error', 'Please paste at least 20 characters to analyze.');
      return;
    }

    setIsAnalyzing(true);
    setAiSuggestions([]);
    setSelectedAiSkillIds(new Set());

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/students/skills/suggest`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ text: aiText })
      });

      if (!res.ok) {
        throw new Error('AI suggestion service unavailable');
      }

      const data = await res.json();
      const list: AiSuggestionItem[] = data.suggestions || [];
      
      // Filter out skills the student already owns
      const unowned = list.filter(item => !existingSkillIds.has(String(item.skillId || item.id)));
      
      setAiSuggestions(unowned);

      // Pre-select high-confidence matches by default (>= 0.85)
      const initialChecked = new Set<string>();
      unowned.forEach(s => {
        if (s.confidence >= 0.85) {
          initialChecked.add(String(s.skillId || s.id));
        }
      });
      setSelectedAiSkillIds(initialChecked);

      if (unowned.length === 0) {
        showToast('success', 'Analysis complete! You already possess all detected skills.');
      } else {
        showToast('success', `Found ${unowned.length} skills. Review and approve below.`);
      }
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Failed to analyze text');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Toggle single AI skill checkbox
  const toggleAiSkill = (id: string) => {
    setSelectedAiSkillIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Batch Add Approved AI Skills
  const handleBatchAddAiSkills = async () => {
    if (selectedAiSkillIds.size === 0) return;

    setIsBatchAdding(true);
    const toAdd = aiSuggestions.filter(s => selectedAiSkillIds.has(String(s.skillId || s.id)));

    let successCount = 0;
    for (const skill of toAdd) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/students/skills`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            skillId: skill.skillId || skill.id,
            proficiency: 'intermediate',
            source: 'ai'
          })
        });
        if (res.ok) successCount += 1;
      } catch {
        // continue batch
      }
    }

    await fetchMySkills();
    // Remove added from suggestions
    setAiSuggestions(prev => prev.filter(s => !selectedAiSkillIds.has(String(s.skillId || s.id))));
    setSelectedAiSkillIds(new Set());
    setIsBatchAdding(false);
    showToast('success', `Successfully added ${successCount} verified skills!`);
  };

  const getProficiencyBadge = (level: ProficiencyLevel) => {
    switch (level) {
      case 'beginner':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'advanced':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      default:
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 transition-colors">
      <div className="max-w-[1400px] mx-auto space-y-10">

        {/* Floating Toast Feedback */}
        {toast && (
          <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium shadow-xl animate-in fade-in slide-in-from-top-3 ${
            toast.type === 'error' ? 'bg-rose-500 text-white' : 'bg-emerald-600 text-white'
          }`}>
            {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{toast.text}</span>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Link 
              href="/student/dashboard" 
              className="inline-flex items-center text-xs font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 mb-2 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">
              My Skills Portfolio
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage your verified competencies and track their real-world impact across your internship applications.
            </p>
          </div>

          <Link 
            href="/student/resume-match"
            className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors shadow-sm"
          >
            <Sparkles className="w-4 h-4 mr-2" /> Resume ↔ Job Match
          </Link>
        </div>

        {/* =======================================================
            SECTION 1: MY SKILLS & CAREER ANALYTICS
        ======================================================== */}
        <div className="bg-white dark:bg-gray-800/90 rounded-2xl p-6 md:p-8 border border-gray-100 dark:border-gray-700/50 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/50 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  My Skills
                </h2>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {mySkills.length} {mySkills.length === 1 ? 'skill' : 'skills'} registered
                </span>
              </div>
            </div>
          </div>

          {isLoadingMySkills ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading skills portfolio...
            </div>
          ) : mySkills.length === 0 ? (
            <div className="text-center py-12 px-4 border-2 border-dashed border-gray-200 dark:border-gray-700/60 rounded-xl space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">No skills added yet</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Search our master catalog below or paste a job posting in AI Skill Discovery to populate your competencies.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {mySkills.map((skill) => (
                <div 
                  key={skill.id}
                  className="group relative p-4 rounded-xl border border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-900/40 hover:bg-white dark:hover:bg-gray-800 hover:shadow-md transition-all space-y-3"
                >
                  {/* Top: Name, Category, Remove Button */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {skill.name}
                      </h3>
                      <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                        {skill.category}
                      </span>
                    </div>

                    <button
                      onClick={() => handleRemoveSkill(String(skill.skillId || skill.id), skill.name)}
                      className="text-gray-400 hover:text-rose-500 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                      title="Remove skill"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Badges: Proficiency & Source */}
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border ${getProficiencyBadge(skill.proficiency)}`}>
                      {skill.proficiency}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-200/60 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300">
                      {skill.source === 'ai' ? 'AI Extracted' : 'Manual'}
                    </span>
                  </div>

                  {/* Career Conversion Analytics Strip */}
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-700/40 text-xs text-gray-600 dark:text-gray-300 grid grid-cols-3 gap-2 text-center">
                    <div className="p-1.5 rounded-lg bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/40">
                      <span className="block text-[10px] text-gray-400 uppercase font-bold">Applications</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{skill.application_count}</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/40">
                      <span className="block text-[10px] text-gray-400 uppercase font-bold">Interviews</span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">{skill.interview_count}</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/40">
                      <span className="block text-[10px] text-gray-400 uppercase font-bold">Offers</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">{skill.offer_count}</span>
                    </div>
                  </div>

                  {/* Conversion Ratio Pill */}
                  {skill.application_count > 0 && (
                    <div className="flex justify-between items-center text-[11px] text-gray-500 dark:text-gray-400 font-medium px-1">
                      <span>Interview conversion:</span>
                      <span className="font-semibold text-gray-700 dark:text-gray-200">{skill.interview_rate}%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* =======================================================
            SECTION 2: ADD SKILLS (SEARCHABLE COMBOBOX)
        ======================================================== */}
        <div className="bg-white dark:bg-gray-800/90 rounded-2xl p-6 md:p-8 border border-gray-100 dark:border-gray-700/50 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-700/50 pb-4">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Add Skills
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Search across verified industry categories with standardized proficiency tiers.
              </p>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(category => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Search Input & Dropdown Suggestions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Search Combobox Area */}
            <div className="lg:col-span-2 space-y-3 relative">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Search Master Catalog
              </label>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type to search e.g. Python, MATLAB, PLC, React, SQL..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-gray-100"
                />
              </div>

              {/* Autocomplete Results Box */}
              <div className="max-h-56 overflow-y-auto rounded-xl border border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-900/40 p-2 divide-y divide-gray-100 dark:divide-gray-800 scrollbar-thin">
                {isLoadingMaster ? (
                  <div className="py-4 text-center text-xs text-gray-400">Loading catalog...</div>
                ) : filteredMasterSkills.length === 0 ? (
                  <div className="py-4 text-center text-xs text-gray-400">No matching skills found in catalog.</div>
                ) : (
                  filteredMasterSkills.slice(0, 15).map(skill => (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => setSelectedSkill(skill)}
                      className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between text-xs transition-colors ${
                        selectedSkill?.id === skill.id
                          ? 'bg-blue-600 text-white font-bold'
                          : 'hover:bg-white dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200'
                      }`}
                    >
                      <span className="font-semibold">{skill.name}</span>
                      <span className={`text-[11px] ${selectedSkill?.id === skill.id ? 'text-blue-100' : 'text-gray-400'}`}>
                        {skill.category}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Proficiency Selection & Add Action */}
            <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-5 border border-gray-100 dark:border-gray-700/50 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Select Proficiency
                </label>

                <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-200/60 dark:bg-gray-800/80 rounded-xl">
                  {(['beginner', 'intermediate', 'advanced'] as ProficiencyLevel[]).map(lvl => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setAddProficiency(lvl)}
                      className={`py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                        addProficiency === lvl
                          ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                          : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-100'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>

                {selectedSkill && (
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 text-xs">
                    <span className="text-gray-500 dark:text-gray-400">Ready to add:</span>
                    <span className="font-bold text-blue-700 dark:text-blue-300 ml-1.5">{selectedSkill.name}</span>
                    <span className="text-gray-400 ml-1">({addProficiency})</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleAddSkill()}
                disabled={!selectedSkill || isAdding}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add to My Skills
              </button>
            </div>

          </div>
        </div>

        {/* =======================================================
            SECTION 3: AI SKILL DISCOVERY
        ======================================================== */}
        <div className="bg-white dark:bg-gray-800/90 rounded-2xl p-6 md:p-8 border border-gray-100 dark:border-gray-700/50 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-700/50 pb-4">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                AI Skill Discovery
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Paste a job description, resume, or LinkedIn post. AI maps skills to the verified catalog with required approval.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <textarea
              rows={5}
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              placeholder="Paste job description, resume bullet points, or role requirements here (min 20 characters)..."
              className="w-full p-4 rounded-xl text-sm bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all placeholder:text-gray-400 text-gray-900 dark:text-gray-100"
            />

            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">{aiText.length} characters</span>

              <button
                type="button"
                onClick={handleAnalyzeAi}
                disabled={isAnalyzing || aiText.length < 20}
                className="inline-flex items-center px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-40 transition-all shadow-sm"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" /> Discover Skills
                  </>
                )}
              </button>
            </div>
          </div>

          {/* AI Extracted Suggestions List */}
          {aiSuggestions.length > 0 && (
            <div className="pt-6 border-t border-gray-100 dark:border-gray-700/50 space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    AI Suggestions ({aiSuggestions.length} found)
                  </h3>
                  <p className="text-xs text-gray-400">
                    Select the skills you want to add to your profile.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleBatchAddAiSkills}
                  disabled={selectedAiSkillIds.size === 0 || isBatchAdding}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-sm"
                >
                  {isBatchAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Add Selected Skills ({selectedAiSkillIds.size})
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {aiSuggestions.map((item) => {
                  const id = String(item.skillId || item.id);
                  const isChecked = selectedAiSkillIds.has(id);
                  const pct = Math.round(item.confidence * 100);

                  return (
                    <div
                      key={id}
                      onClick={() => toggleAiSkill(id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        isChecked 
                          ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-sm'
                          : 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // Controlled via card click
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 pointer-events-none"
                        />
                        <div>
                          <span className="font-semibold text-xs block">{item.name}</span>
                          <span className="text-[10px] text-gray-400">{item.category}</span>
                        </div>
                      </div>

                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-indigo-600 dark:text-indigo-400">
                        {pct}% match
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
