'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  GraduationCap, 
  ArrowRight, 
  Search, 
  Award, 
  AlertCircle, 
  RefreshCw, 
  Layers 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { API_BASE_URL } from '@/lib/api';

export interface Cohort {
  id: string;
  name: string;
  term: string;
  major?: string;
  majors?: string[];
  totalStudents: number;
  placedStudents: number;
  activeApplications: number;
  totalApplications: number;
  placementRate: number;
}

export default function CohortsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function fetchCohorts() {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        if (isMounted) {
          setIsLoading(false);
          setError('Authentication required to view admin cohorts');
        }
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/admin/cohorts`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to load cohorts (${res.status})`);
        }

        const data = await res.json();
        if (isMounted) {
          setCohorts(Array.isArray(data) ? data : []);
          setError(null);
        }
      } catch (err) {
        console.warn('Failed to load real admin cohorts:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load cohorts');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchCohorts();

    return () => {
      isMounted = false;
    };
  }, [retryCount]);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setRetryCount(prev => prev + 1);
  };

  const filtered = cohorts.filter(c => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    const matchesName = c.name?.toLowerCase().includes(term);
    const matchesTerm = c.term?.toLowerCase().includes(term);
    const matchesMajor = c.major?.toLowerCase().includes(term);
    return matchesName || matchesTerm || matchesMajor;
  });

  return (
    <div className="min-h-screen p-6 md:p-8 transition-colors duration-500 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <div className="max-w-[1600px] mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Student Cohorts
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Live database tracking of student cohorts, graduation years, and placement rates
            </p>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search cohorts or majors..."
                className="w-full sm:w-64 pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <Button 
              onClick={handleRetry} 
              variant="outline" 
              className="rounded-xl border-gray-200 dark:border-gray-700"
              title="Refresh cohorts"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-700 dark:text-rose-300">
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
            <Button
              onClick={handleRetry}
              size="sm"
              variant="outline"
              className="border-rose-300 dark:border-rose-700 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-xs self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Retry
            </Button>
          </div>
        )}

        {/* Loading Skeletons */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 rounded-2xl bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 p-6" />
            ))}
          </div>
        ) : cohorts.length === 0 ? (
          /* Empty Database State */
          <div className="rounded-2xl p-12 bg-white dark:bg-gray-800/90 shadow-sm border border-gray-100 dark:border-gray-700/50 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center mb-4">
              <GraduationCap className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              No Student Cohorts Found
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              There are currently no student cohorts or registered students in the system. Cohorts are dynamically generated from student graduation years and application records.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          /* Filter Zero Results State */
          <div className="rounded-2xl p-8 bg-white dark:bg-gray-800/90 shadow-sm border border-gray-100 dark:border-gray-700/50 text-center">
            <Layers className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              No matching cohorts found
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">
              No cohort matches your search query &ldquo;{searchTerm}&rdquo;
            </p>
            <Button
              onClick={() => setSearchTerm('')}
              variant="outline"
              size="sm"
              className="rounded-xl text-xs"
            >
              Clear Search
            </Button>
          </div>
        ) : (
          /* Real Live Cohort Cards */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filtered.map(cohort => (
              <div 
                key={cohort.id} 
                data-testid="cohort-card"
                className="rounded-2xl p-6 bg-white dark:bg-gray-800/90 shadow-sm border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center gap-1 border border-emerald-200 dark:border-emerald-800/50">
                      <Award className="w-3.5 h-3.5" />
                      {cohort.placementRate}% Placed
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                    {cohort.name}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {cohort.term}
                  </p>

                  {cohort.major && (
                    <p className="text-[11px] font-medium text-blue-600 dark:text-blue-400 mb-4 truncate" title={cohort.major}>
                      {cohort.major}
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-2 py-4 border-t border-b border-gray-100 dark:border-gray-700/50 text-center mb-6">
                    <div>
                      <span className="block text-lg font-bold text-gray-900 dark:text-gray-100">{cohort.totalStudents}</span>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">Students</span>
                    </div>
                    <div>
                      <span className="block text-lg font-bold text-emerald-600 dark:text-emerald-400">{cohort.placedStudents}</span>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">Placed</span>
                    </div>
                    <div>
                      <span className="block text-lg font-bold text-purple-600 dark:text-purple-400">{cohort.activeApplications}</span>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">Active Apps</span>
                    </div>
                  </div>
                </div>

                <Link 
                  href="/admin/analytics"
                  className="inline-flex items-center justify-between w-full text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline pt-2 border-t border-gray-50 dark:border-gray-800"
                >
                  <span>View Cohort Metrics</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
