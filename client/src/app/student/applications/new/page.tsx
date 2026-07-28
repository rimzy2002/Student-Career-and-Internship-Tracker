'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skill } from '@/lib/types';
import { ThemeToggle } from '@/components/theme-toggle';

export default function NewApplicationPage() {
  const router = useRouter();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Form State
  const [companyName, setCompanyName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [dateApplied, setDateApplied] = useState(() => new Date().toISOString().split('T')[0]);
  
  // Inline Errors
  const [companyError, setCompanyError] = useState('');
  const [roleError, setRoleError] = useState('');
  const [dateError, setDateError] = useState('');
  
  // Skills State
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [isLoadingSkills, setIsLoadingSkills] = useState(true);

  useEffect(() => {
    async function fetchSkills() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/v1/skills`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setAvailableSkills(data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch skills:', err);
      } finally {
        setIsLoadingSkills(false);
      }
    }
    fetchSkills();
  }, []);

  const toggleSkill = (id: string) => {
    setSelectedSkillIds(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const validateForm = () => {
    let isValid = true;
    setCompanyError('');
    setRoleError('');
    setDateError('');

    if (companyName.trim().length === 0) {
      setCompanyError('Company name is required.');
      isValid = false;
    }

    if (roleTitle.trim().length === 0) {
      setRoleError('Role/position title is required.');
      isValid = false;
    }

    if (!dateApplied) {
      setDateError('Date applied is required.');
      isValid = false;
    } else {
      const selectedDate = new Date(dateApplied);
      const today = new Date();
      // Reset hours to only compare dates
      today.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);
      
      if (selectedDate > today) {
        setDateError('Applied date cannot be in the future.');
        isValid = false;
      }
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/v1/applications`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          company_name: companyName.trim(),
          role_title: roleTitle.trim(),
          date_applied: dateApplied,
          skill_ids: selectedSkillIds
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to add application');
      }

      router.push('/student/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground p-4 sm:p-8 relative">
      
      <div className="absolute top-6 right-8 flex items-center gap-6">
        <div className="relative w-8 h-8">
          <ThemeToggle />
        </div>
      </div>

      <div className="w-full max-w-[420px] space-y-8 bg-card p-8 rounded-2xl shadow-lg border border-border">
        
        <div className="space-y-2">
          <Link 
            href="/student/dashboard"
            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">
            Add New Application
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Enter the details below to track a new application.
          </p>
        </div>

        {error && (
          <div className="relative flex items-center justify-between p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-red-500 text-sm font-medium border border-red-200 dark:border-red-900/50">
            <span>{error}</span>
            <button 
              type="button" 
              onClick={() => setError('')}
              className="text-red-400 hover:text-red-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          
          <div className="space-y-2">
            <Label htmlFor="companyName" className="text-sm font-semibold">Company Name</Label>
            <Input 
              id="companyName" 
              type="text" 
              value={companyName} 
              onChange={(e) => { setCompanyName(e.target.value); if(companyError) setCompanyError(''); }} 
              placeholder="e.g. Acme Corp" 
              className={`h-12 bg-background ${companyError ? 'border-red-500 focus-visible:ring-red-500' : 'border-input'}`} 
            />
            {companyError && <p className="text-xs text-red-500 mt-1">{companyError}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="roleTitle" className="text-sm font-semibold">Role / Position Title</Label>
            <Input 
              id="roleTitle" 
              type="text" 
              value={roleTitle} 
              onChange={(e) => { setRoleTitle(e.target.value); if(roleError) setRoleError(''); }} 
              placeholder="e.g. Software Engineer Intern" 
              className={`h-12 bg-background ${roleError ? 'border-red-500 focus-visible:ring-red-500' : 'border-input'}`} 
            />
            {roleError && <p className="text-xs text-red-500 mt-1">{roleError}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateApplied" className="text-sm font-semibold">Applied Date</Label>
            <Input 
              id="dateApplied" 
              type="date" 
              value={dateApplied} 
              onChange={(e) => { setDateApplied(e.target.value); if(dateError) setDateError(''); }} 
              className={`h-12 bg-background ${dateError ? 'border-red-500 focus-visible:ring-red-500' : 'border-input'}`} 
            />
            {dateError && <p className="text-xs text-red-500 mt-1">{dateError}</p>}
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold">Relevant Skills</Label>
            
            {isLoadingSkills ? (
              <div className="flex items-center text-sm text-muted-foreground py-2">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading skills...
              </div>
            ) : availableSkills.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No skills available yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableSkills.map((skill) => {
                  const isSelected = selectedSkillIds.includes(skill.id);
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => toggleSkill(skill.id)}
                      className={`
                        inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-colors border
                        ${isSelected 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                          : 'bg-background text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground'
                        }
                      `}
                    >
                      {skill.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <Link href="/student/dashboard">
              <Button variant="ghost" type="button" className="h-12 px-5 font-medium">
                Cancel
              </Button>
            </Link>
            <Button 
              type="submit" 
              disabled={isSubmitting} 
              className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm transition-all hover:shadow-md"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Add Application'
              )}
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}
