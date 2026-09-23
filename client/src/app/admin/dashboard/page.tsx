'use client';

import React, { useState, useEffect } from 'react';
import { AdminStatStrip } from '@/components/admin/admin-stat-strip';
import { AnalyticsCharts } from '@/components/admin/analytics-charts';
import { AnalyticsTable } from '@/components/admin/analytics-table';
import { ApplicationAnalytics, SkillAnalytics } from '@/lib/types';
import { API_BASE_URL } from '@/lib/api';
import { LayoutDashboard, Table as TableIcon, AlertCircle, RefreshCw } from 'lucide-react';

export default function AdminDashboardPage() {
  const [appAnalytics, setAppAnalytics] = useState<ApplicationAnalytics[] | null>(null);
  const [skillAnalytics, setSkillAnalytics] = useState<SkillAnalytics[] | null>(null);
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'charts' | 'table'>('charts');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const [appsRes, skillsRes, studentsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/v1/admin/analytics/applications`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${API_BASE_URL}/api/v1/admin/analytics/skills`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${API_BASE_URL}/api/v1/admin/analytics/students`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        if (!appsRes.ok) {
          throw new Error(`Failed to load application analytics (${appsRes.status})`);
        }
        if (!skillsRes.ok) {
          throw new Error(`Failed to load skill analytics (${skillsRes.status})`);
        }

        const appsData = await appsRes.json();
        const skillsData = await skillsRes.json();

        if (isMounted) {
          setAppAnalytics(Array.isArray(appsData) ? appsData : []);
          setSkillAnalytics(Array.isArray(skillsData) ? skillsData : []);
        }

        if (studentsRes.ok) {
          const studentsData = await studentsRes.json();
          if (isMounted) {
            setTotalStudents(typeof studentsData?.count === 'number' ? studentsData.count : 0);
          }
        }
      } catch (err) {
        console.warn('Admin analytics fetch failed:', err instanceof Error ? err.message : err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch analytics from server');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [retryCount]);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setRetryCount(prev => prev + 1);
  };

  return (
    <div className="min-h-screen p-6 md:p-8 transition-colors duration-500
                    bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <div className="max-w-[1600px] mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Admin Analytics
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Platform-wide performance and skill gap metrics
            </p>
          </div>
          
          <div className="flex bg-gray-200/50 dark:bg-gray-800/50 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('charts')}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'charts' 
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Charts
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'table' 
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <TableIcon className="w-4 h-4 mr-2" />
              Data Table
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="animate-pulse space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="h-[400px] bg-gray-200 dark:bg-gray-800 rounded-2xl" />
              <div className="h-[400px] bg-gray-200 dark:bg-gray-800 rounded-2xl" />
            </div>
          </div>
        ) : error ? (
          /* Error State */
          <div className="rounded-2xl p-8 bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Unable to load analytics</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{error}</p>
            </div>
            <button
              onClick={handleRetry}
              className="inline-flex items-center px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shadow-sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Stats Summary Strip */}
            <AdminStatStrip 
              applicationAnalytics={appAnalytics || []} 
              skillAnalytics={skillAnalytics || []} 
              totalStudents={totalStudents}
            />

            {/* View Toggle Content */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-transparent dark:from-blue-900/10 rounded-3xl -z-10 blur-xl" />
              
              {viewMode === 'charts' ? (
                <AnalyticsCharts 
                  applicationAnalytics={appAnalytics || []} 
                  skillAnalytics={skillAnalytics || []} 
                />
              ) : (
                <AnalyticsTable 
                  applicationAnalytics={appAnalytics || []} 
                  skillAnalytics={skillAnalytics || []} 
                />
              )}
            </div>
          </>
        )}
        
      </div>
    </div>
  );
}

