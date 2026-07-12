'use client';

import React, { useState, useEffect } from 'react';
import { AdminStatStrip } from '@/components/admin/admin-stat-strip';
import { AnalyticsCharts } from '@/components/admin/analytics-charts';
import { AnalyticsTable } from '@/components/admin/analytics-table';
import { mockApplicationAnalytics, mockSkillAnalytics } from '@/lib/mock-data';
import { ApplicationAnalytics, SkillAnalytics } from '@/lib/types';
import { LayoutDashboard, Table as TableIcon } from 'lucide-react';

export default function AdminDashboardPage() {
  const [appAnalytics, setAppAnalytics] = useState<ApplicationAnalytics[] | null>(null);
  const [skillAnalytics, setSkillAnalytics] = useState<SkillAnalytics[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'charts' | 'table'>('charts');

  useEffect(() => {
    // Simulate API fetch delay
    const timer = setTimeout(() => {
      setAppAnalytics(mockApplicationAnalytics);
      setSkillAnalytics(mockSkillAnalytics);
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

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
        ) : (
          <>
            {/* Stats Summary Strip */}
            <AdminStatStrip 
              applicationAnalytics={appAnalytics || []} 
              skillAnalytics={skillAnalytics || []} 
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
