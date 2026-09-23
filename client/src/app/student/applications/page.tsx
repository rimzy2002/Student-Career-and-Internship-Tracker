'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Application, ApplicationStatus } from '@/lib/types';
import { formatDistanceToNow, format } from 'date-fns';
import Link from 'next/link';
import { 
  Building2, 
  Search, 
  Plus, 
  ArrowRight, 
  Briefcase, 
  RefreshCw, 
  X, 
  AlertCircle,
  Download,
  CheckCircle2
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';
import { exportApplicationsToCsv } from '@/lib/export-utils';

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  'Applied': 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800/50',
  'Interview': 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800/50',
  'Offer': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50',
  'Rejected': 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800/50',
};

const STATUS_OPTIONS: (ApplicationStatus | 'All')[] = ['All', 'Applied', 'Interview', 'Offer', 'Rejected'];

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | ApplicationStatus>('All');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [exportNotice, setExportNotice] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  const handleExportCSV = () => {
    const result = exportApplicationsToCsv(applications);
    if (!result.success) {
      setExportNotice({ message: result.message || 'No data available to export.', type: 'error' });
    } else {
      setExportNotice({ message: `Exported ${result.rowCount} applications to CSV.`, type: 'success' });
    }
    setTimeout(() => setExportNotice(null), 3500);
  };

  const fetchApplications = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/v1/applications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch applications (${res.status})`);
      }

      const data = await res.json();
      if (Array.isArray(data)) {
        setApplications(data);
      }
    } catch (err: unknown) {
      console.error('Failed to load applications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load applications');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (isMounted) await fetchApplications();
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered applications
  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      const matchesStatus = statusFilter === 'All' || app.status === statusFilter;
      const matchesSearch = 
        searchQuery.trim() === '' ||
        app.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.roleTitle.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [applications, statusFilter, searchQuery]);

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      All: applications.length,
      Applied: 0,
      Interview: 0,
      Offer: 0,
      Rejected: 0
    };
    applications.forEach(app => {
      if (counts[app.status] !== undefined) {
        counts[app.status] += 1;
      }
    });
    return counts;
  }, [applications]);

  const formatAppDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return formatDistanceToNow(d, { addSuffix: true });
    } catch {
      return dateStr;
    }
  };

  const formatExactDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return format(d, 'MMM d, yyyy');
    } catch {
      return '';
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-8 transition-colors duration-500 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                All Applications
              </h1>
              {!isLoading && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {applications.length} {applications.length === 1 ? 'record' : 'records'}
                </span>
              )}
            </div>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              View and manage your entire live application history
            </p>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => fetchApplications(true)}
              disabled={isLoading || isRefreshing}
              title="Refresh applications"
              className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            </button>

            <button
              onClick={handleExportCSV}
              disabled={isLoading}
              title="Export applications to CSV"
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors font-medium text-sm shadow-sm disabled:opacity-50 shrink-0"
            >
              <Download className="w-4 h-4 sm:mr-2 text-gray-500 dark:text-gray-400" />
              <span>Export CSV</span>
            </button>

            <Link 
              href="/student/applications/new"
              className="inline-flex items-center justify-center px-5 py-2.5 
                         bg-gradient-to-r from-blue-600 to-purple-600 
                         hover:from-blue-700 hover:to-purple-700
                         text-white rounded-xl font-medium text-sm transition-all duration-200 
                         shadow-[0_1px_3px_rgba(0,0,0,0.1),0_10px_20px_rgba(59,130,246,0.15)]
                         hover:shadow-[0_1px_3px_rgba(0,0,0,0.1),0_10px_20px_rgba(59,130,246,0.25)]
                         active:scale-[0.98] shrink-0"
            >
              <Plus className="w-4 h-4 sm:mr-2" />
              <span>Add New</span>
            </Link>
          </div>
        </div>

        {/* Export Notification Banner */}
        {exportNotice && (
          <div 
            data-testid="export-notice"
            className={`p-3 rounded-xl border text-sm flex items-center gap-2 transition-all ${
              exportNotice.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
            }`}
          >
            {exportNotice.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            )}
            <span>{exportNotice.message}</span>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white dark:bg-gray-800/80 p-3 sm:p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {STATUS_OPTIONS.map((status) => {
              const isSelected = statusFilter === status;
              const count = statusCounts[status] || 0;
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isSelected 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <span>{status}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isSelected ? 'bg-white/25 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search companies or roles..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-900 outline-none transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
            <button 
              onClick={() => fetchApplications()}
              className="text-xs font-semibold underline hover:no-underline"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Main Content Area */}
        {isLoading ? (
          /* Loading Skeleton State */
          <div className="rounded-2xl bg-white dark:bg-gray-800/90 shadow-sm border border-gray-100 dark:border-gray-700/50 p-6 space-y-4">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-md w-48 animate-pulse" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700/40 rounded-xl animate-pulse flex items-center justify-between px-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-600" />
                    <div className="space-y-2">
                      <div className="w-36 h-4 bg-gray-200 dark:bg-gray-600 rounded" />
                      <div className="w-24 h-3 bg-gray-200 dark:bg-gray-600 rounded" />
                    </div>
                  </div>
                  <div className="w-20 h-6 bg-gray-200 dark:bg-gray-600 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ) : applications.length === 0 ? (
          /* Global Empty State: No applications in database */
          <div className="rounded-2xl bg-white dark:bg-gray-800/90 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3),0_10px_40px_rgba(0,0,0,0.2)] border border-gray-100 dark:border-gray-700/50 p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center mb-4 border border-blue-100 dark:border-blue-800/50">
              <Briefcase className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              No Applications Saved Yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md mx-auto mb-6">
              You haven&apos;t tracked any job or internship applications yet. Add your first application to start tracking interview stages and outcomes.
            </p>
            <Link
              href="/student/applications/new"
              className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-medium text-sm shadow-md hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Application
            </Link>
          </div>
        ) : filteredApplications.length === 0 ? (
          /* Filter/Search Zero Results State */
          <div className="rounded-2xl bg-white dark:bg-gray-800/90 shadow-sm border border-gray-100 dark:border-gray-700/50 p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4 text-gray-400">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">
              No Matching Applications Found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              No applications matched your current filters
              {searchQuery ? ` for "${searchQuery}"` : ''}
              {statusFilter !== 'All' ? ` with status "${statusFilter}"` : ''}.
            </p>
            <button
              onClick={() => { setSearchQuery(''); setStatusFilter('All'); }}
              className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 rounded-xl transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          /* Data Table View */
          <div className="rounded-2xl bg-white dark:bg-gray-800/90 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3),0_10px_40px_rgba(0,0,0,0.2)] border border-gray-100 dark:border-gray-700/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-800/50 uppercase border-b border-gray-100 dark:border-gray-700/50">
                  <tr>
                    <th scope="col" className="px-6 py-4 font-semibold">Company & Role</th>
                    <th scope="col" className="px-6 py-4 font-semibold">Status</th>
                    <th scope="col" className="px-6 py-4 font-semibold hidden sm:table-cell">Applied</th>
                    <th scope="col" className="px-6 py-4 font-semibold hidden md:table-cell">Skills</th>
                    <th scope="col" className="px-6 py-4 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {filteredApplications.map((app) => (
                    <tr key={app.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mr-4 border border-blue-100 dark:border-blue-800/40 shrink-0">
                            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="min-w-0">
                            <Link 
                              href={`/student/applications/${app.id}`} 
                              className="font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors block truncate"
                            >
                              {app.companyName}
                            </Link>
                            <span className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 block truncate">
                              {app.roleTitle}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md border text-xs font-medium ${STATUS_COLORS[app.status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400 hidden sm:table-cell whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-700 dark:text-gray-300 text-xs">
                            {formatAppDate(app.dateApplied)}
                          </span>
                          <span className="text-[11px] text-gray-400">
                            {formatExactDate(app.dateApplied)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        {app.skills && app.skills.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {app.skills.slice(0, 3).map(skill => (
                              <span 
                                key={skill.id} 
                                className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
                              >
                                {skill.name}
                              </span>
                            ))}
                            {app.skills.length > 3 && (
                              <span className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                                +{app.skills.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No skills tagged</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <Link 
                          href={`/student/applications/${app.id}`}
                          className="inline-flex items-center justify-center p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="View Details"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
}
