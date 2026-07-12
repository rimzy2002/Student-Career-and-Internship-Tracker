'use client';

import React, { useState, useEffect } from 'react';
import { mockApplications } from '@/lib/mock-data';
import { Application, ApplicationStatus } from '@/lib/types';
import { format } from 'date-fns';
import { 
  Building2, ArrowLeft, Calendar, Edit3, Trash2, ChevronDown, CheckCircle2 
} from 'lucide-react';
import Link from 'next/link';

// Mock params until we get true Next.js router params
export default function ApplicationDetailPage({ params }: { params: { id: string } }) {
  const [application, setApplication] = useState<Application | null>(null);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    // In a real app, this would be a fetch using params.id
    // For now, we grab it from mock data
    // Assuming '1' as fallback if params not provided properly in client mock
    const appId = params?.id || '1'; 
    const foundApp = mockApplications.find(a => a.id === appId) || mockApplications[0];
    setApplication(foundApp);
    setNotes(foundApp.notes || '');
  }, [params]);

  if (!application) return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-500">Loading application details...</p>
      </div>
    </div>
  );

  const STATUS_COLORS: Record<ApplicationStatus, string> = {
    'Applied': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800/50',
    'Interview': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800/50',
    'Offer': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800/50',
    'Rejected': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800/50',
  };

  const ALL_STATUSES: ApplicationStatus[] = ['Applied', 'Interview', 'Offer', 'Rejected'];

  const handleStatusChange = (newStatus: ApplicationStatus) => {
    setApplication({ ...application, status: newStatus });
    setIsStatusDropdownOpen(false);
    // In a real app: fetch(`/api/v1/applications/${application.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) })
  };

  const handleSaveNotes = () => {
    // In a real app: fetch(`/api/v1/applications/${application.id}`, { method: 'PATCH', body: JSON.stringify({ notes }) })
    alert('Notes saved successfully! (Mock)');
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this application? This action cannot be undone.')) {
      // In a real app: fetch(`/api/v1/applications/${application.id}`, { method: 'DELETE' })
      alert('Application deleted. (Mock)');
      window.location.href = '/student/dashboard';
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-8 transition-colors duration-500 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Back Link */}
        <div>
          <Link href="/student/dashboard" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>

        {/* Header Section */}
        <div className="relative rounded-2xl p-8 bg-white dark:bg-gray-800/90 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3),0_10px_40px_rgba(0,0,0,0.2)] border border-gray-100 dark:border-gray-700/50 overflow-visible">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center">
                <Building2 className="w-8 h-8 mr-3 text-blue-500" />
                {application.companyName}
              </h1>
              <p className="text-xl font-medium text-gray-600 dark:text-gray-300 mb-4">
                {application.roleTitle}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1.5" />
                  Applied {format(new Date(application.dateApplied), 'MMM d, yyyy')}
                </span>
                
                {/* Status Control */}
                <div className="relative">
                  <button 
                    onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                    className={`flex items-center px-3 py-1 rounded-full border ${STATUS_COLORS[application.status]} transition-all hover:opacity-80`}
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
            <div className="rounded-2xl p-8 bg-white dark:bg-gray-800/90 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3),0_10px_40px_rgba(0,0,0,0.2)] border border-gray-100 dark:border-gray-700/50">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Notes & Feedback</h2>
                <button 
                  onClick={handleSaveNotes}
                  className="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
                >
                  Save Notes
                </button>
              </div>
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add interview prep notes, rejection feedback, or general thoughts here..."
                className="w-full min-h-[200px] p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-y"
              />
            </div>

            {/* Linked Skills */}
            <div className="rounded-2xl p-8 bg-white dark:bg-gray-800/90 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3),0_10px_40px_rgba(0,0,0,0.2)] border border-gray-100 dark:border-gray-700/50">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Linked Skills</h2>
                <button className="flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                  <Edit3 className="w-4 h-4 mr-1.5" />
                  Edit Skills
                </button>
              </div>
              {application.skills && application.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {application.skills.map(skill => (
                    <span 
                      key={skill.id}
                      className="px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20"
                    >
                      {skill.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No skills linked yet.</p>
              )}
            </div>

          </div>

          {/* Sidebar Column */}
          <div className="space-y-8">
            
            {/* Status History Timeline */}
            <div className="rounded-2xl p-8 bg-white dark:bg-gray-800/90 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3),0_10px_40px_rgba(0,0,0,0.2)] border border-gray-100 dark:border-gray-700/50">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">Status History</h2>
              
              {application.history && application.history.length > 0 ? (
                <div className="relative border-l-2 border-gray-200 dark:border-gray-700 ml-3 space-y-6">
                  {application.history.map((item, index) => (
                    <div key={item.id} className="relative pl-6">
                      <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-white dark:bg-gray-800 border-2 border-blue-500" />
                      <div className="mb-1">
                        <span className="font-semibold text-gray-900 dark:text-gray-100 mr-2">{item.status}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 block sm:inline mt-1 sm:mt-0">
                          {format(new Date(item.timestamp), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      {item.notes && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg mt-2 border border-gray-100 dark:border-gray-800">
                          {item.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No history available.</p>
              )}
            </div>

            {/* Danger Zone */}
            <div className="rounded-2xl p-8 bg-white dark:bg-gray-800/90 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3),0_10px_40px_rgba(0,0,0,0.2)] border border-rose-100 dark:border-rose-900/30">
              <h2 className="text-lg font-semibold text-rose-600 dark:text-rose-400 mb-4">Danger Zone</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Permanently delete this application and all associated history. This action cannot be undone.
              </p>
              <button 
                onClick={handleDelete}
                className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-xl transition-colors border border-rose-200 dark:border-rose-800/50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Application
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
