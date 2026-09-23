'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { TrendingUp, AlertTriangle, Layers, ArrowRight, AlertCircle, RefreshCw, Download, CheckCircle2 } from 'lucide-react';
import { AdminStatStrip } from '@/components/admin/admin-stat-strip';
import { AnalyticsCharts } from '@/components/admin/analytics-charts';
import { ApplicationAnalytics, SkillAnalytics } from '@/lib/types';
import { API_BASE_URL } from '@/lib/api';
import { exportAdminAnalyticsToCsv } from '@/lib/export-utils';

export default function AnalyticsPage() {
  const [appAnalytics, setAppAnalytics] = useState<ApplicationAnalytics[] | null>(null);
  const [skillAnalytics, setSkillAnalytics] = useState<SkillAnalytics[] | null>(null);
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [exportNotice, setExportNotice] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  const handleExportCSV = () => {
    const result = exportAdminAnalyticsToCsv({
      appAnalytics,
      skillAnalytics,
      totalStudents
    });
    if (!result.success) {
      setExportNotice({ message: result.message || 'No data available to export.', type: 'error' });
    } else {
      setExportNotice({ message: `Exported ${result.rowCount} analytics records to CSV.`, type: 'success' });
    }
    setTimeout(() => setExportNotice(null), 3500);
  };

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

  // Derived metrics from real data
  const totalApps = (appAnalytics || []).reduce((sum, item) => sum + (item.count || 0), 0);
  const interviewCount = (appAnalytics || []).find(a => a.status_name.toLowerCase() === 'interview')?.count || 0;
  const offerCount = (appAnalytics || []).find(a => a.status_name.toLowerCase() === 'offer')?.count || 0;

  const interviewRateLabel = totalApps > 0 
    ? `${((interviewCount / totalApps) * 100).toFixed(1)}% Interview Conversion` 
    : 'No application data';

  const placementRateLabel = totalStudents > 0 && offerCount > 0
    ? `${((offerCount / totalStudents) * 100).toFixed(1)}% Overall Placement`
    : totalApps > 0 && offerCount > 0
    ? `${((offerCount / totalApps) * 100).toFixed(1)}% Offer Rate`
    : 'No placement data';

  const topDemandedSkills = (skillAnalytics || []).filter(s => s.count > 0).slice(0, 2).map(s => s.skill_name);
  const skillGapLabel = topDemandedSkills.length > 0 
    ? `${topDemandedSkills.join(' & ')} Top Demands` 
    : 'No skill gaps recorded';

  return (
    <div className="min-h-screen p-6 md:p-8 transition-colors duration-500 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <div className="max-w-[1600px] mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Deep Analytics Overview
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Detailed breakdown of hiring funnels, offer conversion rates, and student skill gaps
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportCSV}
              disabled={isLoading}
              title="Export analytics to CSV"
              className="inline-flex items-center px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
            >
              <Download className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
              <span>Export CSV</span>
            </button>

            <Link
              href="/admin/dashboard"
              className="inline-flex items-center px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
            >
              Dashboard Overview
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </div>

        {/* Export Notification Banner */}
        {exportNotice && (
          <div 
            data-testid="analytics-export-notice"
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

        {/* Analytics Section Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div id="funnel" className="rounded-2xl p-6 bg-white dark:bg-gray-800/90 shadow-sm border border-gray-100 dark:border-gray-700/50 scroll-mt-28">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center mb-4">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Application Funnel</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Track drop-offs from initial application through final accepted offer.
            </p>
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{interviewRateLabel}</span>
          </div>

          <div id="placement-rates" className="rounded-2xl p-6 bg-white dark:bg-gray-800/90 shadow-sm border border-gray-100 dark:border-gray-700/50 scroll-mt-28">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center mb-4">
              <Layers className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Placement Rates</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Monitor career outcomes by degree, major, and graduation year.
            </p>
            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">{placementRateLabel}</span>
          </div>

          <div id="skill-gaps" className="rounded-2xl p-6 bg-white dark:bg-gray-800/90 shadow-sm border border-gray-100 dark:border-gray-700/50 scroll-mt-28">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Skill Gap Analysis</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Identify top missing industry skills required by recruiters.
            </p>
            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">{skillGapLabel}</span>
          </div>
        </div>

        {/* Dynamic Data Area: Loading, Error, or Charts & Stats */}
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
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Unable to load deep analytics</h3>
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
            {/* Global Stats */}
            <AdminStatStrip 
              applicationAnalytics={appAnalytics || []} 
              skillAnalytics={skillAnalytics || []} 
              totalStudents={totalStudents}
            />

            {/* Charts */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-transparent dark:from-blue-900/10 rounded-3xl -z-10 blur-xl" />
              <AnalyticsCharts 
                applicationAnalytics={appAnalytics || []} 
                skillAnalytics={skillAnalytics || []} 
              />
            </div>
          </>
        )}

      </div>
    </div>
  );
}

