'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Plus, Sparkles, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/theme-toggle';

interface MySkill {
  id: string;
  name: string;
  application_count: number;
  rejection_count: number;
}

interface MasterSkill {
  id: string;
  name: string;
}

export default function SkillsTrackerPage() {
  const router = useRouter();

  // --- States ---
  // My Skills
  const [mySkills, setMySkills] = useState<MySkill[]>([]);
  const [isLoadingMySkills, setIsLoadingMySkills] = useState(true);
  
  // Master Skills for Manual Add
  const [masterSkills, setMasterSkills] = useState<MasterSkill[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [isAddingManual, setIsAddingManual] = useState(false);

  // AI Tool
  const [aiText, setAiText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiError, setAiError] = useState('');
  const [matchedSkills, setMatchedSkills] = useState<MasterSkill[]>([]);
  const [newSkills, setNewSkills] = useState<string[]>([]);
  const [hasAiResult, setHasAiResult] = useState(false);

  // Initial Fetch
  useEffect(() => {
    fetchMySkills();
    fetchMasterSkills();
  }, []);

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  const fetchMySkills = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/v1/students/me/skills', {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setMySkills(data.skills || []);
      }
    } catch (err) {
      console.error('Failed to fetch my skills', err);
    } finally {
      setIsLoadingMySkills(false);
    }
  };

  const fetchMasterSkills = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/v1/skills');
      if (res.ok) {
        const data = await res.json();
        setMasterSkills(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch master skills', err);
    }
  };

  // --- Actions ---

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSkillId) return;

    setIsAddingManual(true);
    try {
      const res = await fetch('http://localhost:5000/api/v1/students/me/skills', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ skill_id: selectedSkillId })
      });
      if (res.ok) {
        await fetchMySkills();
        setSelectedSkillId('');
      }
    } catch (err) {
      console.error('Failed to add skill manually', err);
    } finally {
      setIsAddingManual(false);
    }
  };

  const handleRemoveSkill = async (skillId: string) => {
    // Optimistic UI update
    const previousSkills = [...mySkills];
    setMySkills(prev => prev.filter(s => s.id !== skillId));

    try {
      const res = await fetch(`http://localhost:5000/api/v1/students/me/skills/${skillId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!res.ok) {
        throw new Error('Failed to delete');
      }
    } catch (err) {
      console.error('Failed to remove skill', err);
      // Revert optimistic update
      setMySkills(previousSkills);
      alert('Could not remove skill. Please try again.');
    }
  };

  const handleAnalyze = async () => {
    if (aiText.length < 20) return;

    setIsAnalyzing(true);
    setAiError('');
    setHasAiResult(false);
    setMatchedSkills([]);
    setNewSkills([]);

    try {
      const res = await fetch('http://localhost:5000/api/v1/students/me/skill-suggestions', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ text: aiText })
      });

      if (!res.ok) {
        throw new Error('Skill suggestions are temporarily unavailable — you can still add skills manually above.');
      }

      const data = await res.json();
      
      // Filter out any matched_skills that the student already has
      const existingSkillIds = new Set(mySkills.map(s => s.id));
      const filteredMatched = (data.matched_skills || []).filter(
        (s: MasterSkill) => !existingSkillIds.has(s.id)
      );

      setMatchedSkills(filteredMatched);
      setNewSkills(data.new_skills || []);
      setHasAiResult(true);

    } catch (err: any) {
      setAiError(err.message || 'Something went wrong');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddSuggestedSkill = async (skill: MasterSkill) => {
    // Remove from suggestions list optimistically
    setMatchedSkills(prev => prev.filter(s => s.id !== skill.id));
    
    try {
      const res = await fetch('http://localhost:5000/api/v1/students/me/skills', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ skill_id: skill.id })
      });
      if (res.ok) {
        await fetchMySkills();
      }
    } catch (err) {
      console.error('Failed to add suggested skill', err);
      // Revert if failed
      setMatchedSkills(prev => [...prev, skill]);
    }
  };

  const resetAiTool = () => {
    setAiText('');
    setAiError('');
    setHasAiResult(false);
    setMatchedSkills([]);
    setNewSkills([]);
  };

  return (
    <div className="flex min-h-screen justify-center bg-background text-foreground p-4 sm:p-8 relative">
      
      <div className="absolute top-6 right-8 flex items-center gap-6">
        <div className="relative w-8 h-8">
          <ThemeToggle />
        </div>
      </div>

      <div className="w-full max-w-4xl space-y-8 mt-12">
        
        {/* Header */}
        <div className="space-y-2">
          <Link 
            href="/student/dashboard"
            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">My Skills</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Skills you've tagged across applications and feedback.
          </p>
        </div>

        {/* Manual Add Form */}
        <div className="bg-card p-6 rounded-2xl shadow-sm border border-border flex flex-col sm:flex-row items-end gap-4">
          <div className="flex-1 space-y-2 w-full">
            <Label htmlFor="skillSelect" className="text-sm font-semibold">Add a Skill</Label>
            <select
              id="skillSelect"
              value={selectedSkillId}
              onChange={(e) => setSelectedSkillId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="" disabled>Select a skill from the master list...</option>
              {masterSkills
                // Only show skills the student doesn't already have
                .filter(s => !mySkills.find(my => my.id === s.id))
                .map(skill => (
                  <option key={skill.id} value={skill.id}>{skill.name}</option>
              ))}
            </select>
          </div>
          <Button 
            onClick={handleManualAdd} 
            disabled={!selectedSkillId || isAddingManual}
            className="h-10 px-6 font-medium bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
          >
            {isAddingManual ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
          </Button>
        </div>

        {/* My Skills Grid */}
        <div className="space-y-4">
          {isLoadingMySkills ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-28 rounded-xl bg-accent animate-pulse" />
              ))}
            </div>
          ) : mySkills.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed border-border rounded-xl">
              <p className="text-muted-foreground">You haven't added any skills yet — add one above or try the AI suggestion tool.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {mySkills.map(skill => (
                <div key={skill.id} className="group relative bg-card p-5 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
                  <button 
                    onClick={() => handleRemoveSkill(skill.id)}
                    className="absolute top-3 right-3 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove skill"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  
                  <h3 className="font-semibold text-lg mb-3">{skill.name}</h3>
                  
                  <div className="space-y-1.5 text-sm">
                    <p className="text-muted-foreground">
                      Used in <span className="font-medium text-foreground">{skill.application_count}</span> application{skill.application_count !== 1 && 's'}
                    </p>
                    
                    {skill.rejection_count > 0 && (
                      <p className="flex items-center text-amber-600 dark:text-amber-500 font-medium bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded-md -ml-2 w-max">
                        <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                        Flagged in {skill.rejection_count} rejection{skill.rejection_count !== 1 && 's'}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Skill Suggestion Tool */}
        <div className="mt-12 bg-card p-6 sm:p-8 rounded-2xl border-2 border-blue-100 dark:border-blue-900/40 relative overflow-hidden">
          
          <div className="absolute top-0 right-0 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold px-3 py-1 rounded-bl-lg flex items-center">
            <Sparkles className="w-3 h-3 mr-1" />
            AI Assist
          </div>

          <h2 className="text-xl font-semibold mb-2">Discover Skills</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Paste a job description or your resume text to get intelligent skill suggestions.
          </p>

          {!hasAiResult && (
            <div className="space-y-4">
              <textarea
                value={aiText}
                onChange={e => setAiText(e.target.value)}
                placeholder="Paste text here..."
                className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
              />
              
              {aiError && (
                <div className="p-3 text-sm text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30 rounded-md border border-amber-200 dark:border-amber-900/50">
                  {aiError}
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {aiText.length < 20 ? `Need at least ${20 - aiText.length} more characters` : 'Ready to analyze'}
                </span>
                <Button 
                  onClick={handleAnalyze} 
                  disabled={aiText.length < 20 || isAnalyzing}
                  className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Analyze
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {hasAiResult && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Matched Skills */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Skills you might want to add</h3>
                {matchedSkills.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No matching skills found in our system that you don't already have.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {matchedSkills.map(skill => (
                      <button
                        key={skill.id}
                        onClick={() => handleAddSuggestedSkill(skill)}
                        className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 dark:border-blue-800 transition-colors"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add {skill.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* New Skills (Not in DB) */}
              {newSkills.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-border">
                  <h3 className="text-sm font-semibold text-foreground">New skills identified</h3>
                  <p className="text-xs text-muted-foreground -mt-2">These aren't in our system yet — noted for your reference.</p>
                  <div className="flex flex-wrap gap-2">
                    {newSkills.map((skillName, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-accent text-accent-foreground border border-border"
                      >
                        {skillName}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end">
                <Button variant="outline" size="sm" onClick={resetAiTool}>
                  Analyze another text
                </Button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
