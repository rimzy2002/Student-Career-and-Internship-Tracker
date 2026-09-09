'use client';

import React, { useState, useEffect } from 'react';
import { Application, ApplicationStatus } from '@/lib/types';
import { format } from 'date-fns';
import { 
  Building2, ArrowLeft, Calendar, Trash2, ChevronDown, CheckCircle2, Loader2, Save, AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/lib/api';

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  'Applied': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800/50',
  'Interview': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800/50',
  'Offer': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800/50',
  'Rejected': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800/50',
};

const ALL_STATUSES: ApplicationStatus[] = ['Applied', 'Interview', 'Offer', 'Rejected'];

export default function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const router = useRouter();
  const unwrappedParams = React.use ? (params && typeof (params as Promise<{ id: string }>).then === 'function' ? React.use(params as Promise<{ id: string }>) : params as { id: string }) : (params as { id: string });
  const appId = unwrappedParams?.id;

  const [application, setApplication] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSavedNotice, setNotesSavedNotice] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function fetchAppDetails() {
      if (!appId) return;
      setIsLoading(true);
      setError(null);

      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) {
          setIsLoading(false);
          return;
        }

        const res = await fetch(`${API_BASE_URL}/api/v1/applications/${appId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!res.ok) {
          throw new Error('Application not found or could not be loaded');
        }

        const data: Application = await res.json();
        setApplication(data);
        setNotes(data.notes || '');
      } catch (err: unknown) {
        console.error('Error loading application:', err);
        setError(err instanceof Error ? err.message : 'Failed to load application');
      } finally {
        setIsLoading(false);
      }
    }

    fetchAppDetails();
  }, [appId]);

  const handleStatusChange = async (newStatus: ApplicationStatus) => {
    if (!application || application.status === newStatus) {
      setIsStatusDropdownOpen(false);
      return;
    }

    // Optimistic update
    const prevApp = { ...application };
    setApplication({ ...application, status: newStatus });
    setIsStatusDropdownOpen(false);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${API_BASE_URL}/api/v1/applications/${application.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) {
        throw new Error('Failed to update status');
      }

      // Re-fetch to update the status history timeline
      const refreshRes = await fetch(`${API_BASE_URL}/api/v1/applications/${application.id}`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (refreshRes.ok) {
        const updated = await refreshRes.json();
        setApplication(updated);
      }
    } catch (err) {
      console.error('Failed to change status:', err);
      // Revert optimistic update
      setApplication(prevApp);
      alert('Could not update status. Please try again.');
    }
  };

  const handleSaveNotes = async () => {
    if (!application) return;
    setIsSavingNotes(true);
    setNotesSavedNotice(false);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${API_BASE_URL}/api/v1/applications/${application.id}/notes`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ notes })
      });

      if (!res.ok) {
        throw new Error('Failed to save notes');
      }

      setApplication({ ...application, notes });
      setNotesSavedNotice(true);
      setTimeout(() => setNotesSavedNotice(false), 3000);
    } catch (err) {
      console.error('Failed to save notes:', err);
      alert('Could not save notes. Please try again.');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleDelete = async () => {
    if (!application) return;
    if (confirm(`Are you sure you want to delete your application for ${application.companyName}? This action cannot be undone.`)) {
      setIsDeleting(true);
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const res = await fetch(`${API_BASE_URL}/api/v1/applications/${application.id}`, {
          method: 'DELETE',
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        });

        if (!res.ok) {
          throw new Error('Failed to delete application');
        }

        router.push('/student/applications');
        router.refresh();
      } catch (err) {
        console.error('Failed to delete application:', err);
        alert('Could not delete application. Please try again.');
        setIsDeleting(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="mt-4 text-gray-500 font-medium text-sm">Loading application details from database...</p>
        </div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md text-center p-8 rounded-2xl bg-white dark:bg-gray-800 shadow-md border border-gray-100 dark:border-gray-700">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Application Not Found</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {error || 'This application might have been deleted or does not exist.'}
          </p>
          <Link
            href="/student/applications"
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Applications
          </Link>
        </div>
      </div>
    );
  }

  const formatHeaderDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-8 transition-colors duration-500 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Back Link */}
        <div>
          <Link href="/student/applications" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Applications
          </Link>
        </div>

        {/* Header Section */}
        <div className="relative rounded-2xl p-6 sm:p-8 bg-white dark:bg-gray-800/90 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3),0_10px_40px_rgba(0,0,0,0.2)] border border-gray-100 dark:border-gray-700/50 overflow-visible">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center">
                <Building2 className="w-8 h-8 mr-3 text-blue-500 shrink-0" />
                <span>{application.companyName}</span>
              </h1>
              <p className="text-lg sm:text-xl font-medium text-gray-600 dark:text-gray-300 mb-4">
                {application.roleTitle}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1.5" />
                  Applied {formatHeaderDate(application.dateApplied)}
                </span>
                
                {/* Status Control Dropdown */}
                <div className="relative">
                  <button 
                    onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                    className={`flex items-center px-3 py-1 rounded-full border ${STATUS_COLORS[application.status] || 'bg-gray-100 text-gray-700'} transition-all hover:opacity-80`}
                  >
                    <span className="font-semibold text-xs uppercase tracking-wider">{application.status}</span>
                    <ChevronDown className="w-4 h-4 ml-1.5" />
                  </button>

                  {isStatusDropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 w-48 rounded-xl bg-white dark:bg-gray-800 shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-20">
                      {ALL_STATUSES.map(s => (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(s)}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center justify-between ${application.status === s ? 'font-medium text-gray-900 dark:text-white bg-gray-50/50 dark:bg-gray-700/20' : 'text-gray-600 dark:text-gray-300'}`}
                        >
                          {s}
                          {application.status === s && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Notes Section */}
            <div className="rounded-2xl p-6 sm:p-8 bg-white dark:bg-gray-800/90 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3),0_10px_40px_rgba(0,0,0,0.2)] border border-gray-100 dark:border-gray-700/50">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Notes & Feedback</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Track your interview preparation, questions, or recruiter details.</p>
                </div>
                <div className="flex items-center gap-2">
                  {notesSavedNotice && (
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                    </span>
                  )}
                  <button 
                    onClick={handleSaveNotes}
                    disabled={isSavingNotes}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isSavingNotes ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5 mr-1.5" /> Save Notes
                      </>
                    )}
                  </button>
                </div>
              </div>
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add interview prep notes, rejection feedback, job link, or general thoughts here..."
                className="w-full min-h-[180px] p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-y text-sm"
              />
            </div>

            {/* Linked Skills */}
            <div className="rounded-2xl p-6 sm:p-8 bg-white dark:bg-gray-800/90 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3),0_10px_40px_rgba(0,0,0,0.2)] border border-gray-100 dark:border-gray-700/50">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Linked Skills</h2>
                <Link 
                  href="/student/skills"
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Manage All Skills &rarr;
                </Link>
              </div>
              {application.skills && application.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {application.skills.map(skill => (
                    <span 
                      key={skill.id}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20"
                    >
                      {skill.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm italic">No skills linked to this application.</p>
              )}
            </div>

          </div>

          {/* Sidebar Column */}
          <div className="space-y-8">
            
            {/* Status History Timeline */}
            <div className="rounded-2xl p-6 sm:p-8 bg-white dark:bg-gray-800/90 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3),0_10px_40px_rgba(0,0,0,0.2)] border border-gray-100 dark:border-gray-700/50">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">Status History</h2>
              
              {application.history && application.history.length > 0 ? (
                <div className="relative border-l-2 border-gray-200 dark:border-gray-700 ml-3 space-y-6">
                  {application.history.map((item) => (
                    <div key={item.id} className="relative pl-6">
                      <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-white dark:bg-gray-800 border-2 border-blue-500" />
                      <div className="mb-1">
                        <span className="font-semibold text-gray-900 dark:text-gray-100 mr-2">{item.status}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 block sm:inline mt-1 sm:mt-0">
                          {item.timestamp ? format(new Date(item.timestamp), 'MMM d, yyyy h:mm a') : ''}
                        </span>
                      </div>
                      {item.notes && (
                        <p className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 p-2.5 rounded-lg mt-2 border border-gray-100 dark:border-gray-800">
                          {item.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No status changes recorded yet.</p>
              )}
            </div>

            {/* Danger Zone */}
            <div className="rounded-2xl p-6 sm:p-8 bg-white dark:bg-gray-800/90 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3),0_10px_40px_rgba(0,0,0,0.2)] border border-rose-100 dark:border-rose-900/30">
              <h2 className="text-lg font-semibold text-rose-600 dark:text-rose-400 mb-2">Delete Application</h2>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-5 leading-relaxed">
                Permanently archive this application and its timeline. You won't be able to recover it.
              </p>
              <button 
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-xl transition-colors border border-rose-200 dark:border-rose-800/50 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" /> Delete Application
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
