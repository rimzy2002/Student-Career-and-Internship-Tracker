'use client';

import React from 'react';
import Link from 'next/link';
import { BarChart3, TrendingUp, AlertTriangle, Layers, ArrowRight } from 'lucide-react';
import { AdminStatStrip } from '@/components/admin/admin-stat-strip';
import { AnalyticsCharts } from '@/components/admin/analytics-charts';
import { mockApplicationAnalytics, mockSkillAnalytics } from '@/lib/mock-data';

export default function AnalyticsPage() {
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
          
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
          >
            Dashboard Overview
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>

        {/* Analytics Section Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl p-6 bg-white dark:bg-gray-800/90 shadow-sm border border-gray-100 dark:border-gray-700/50">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center mb-4">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Application Funnel</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Track drop-offs from initial application through final accepted offer.
            </p>
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">82% Interview Conversion</span>
          </div>

          <div className="rounded-2xl p-6 bg-white dark:bg-gray-800/90 shadow-sm border border-gray-100 dark:border-gray-700/50">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center mb-4">
              <Layers className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Placement Rates</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Monitor career outcomes by degree, major, and graduation year.
            </p>
            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">88.4% Overall Placement</span>
          </div>

          <div className="rounded-2xl p-6 bg-white dark:bg-gray-800/90 shadow-sm border border-gray-100 dark:border-gray-700/50">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Skill Gap Analysis</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Identify top missing industry skills required by recruiters.
            </p>
            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">Docker & AWS Top Demands</span>
          </div>
        </div>

        {/* Global Stats */}
        <AdminStatStrip 
          applicationAnalytics={mockApplicationAnalytics} 
          skillAnalytics={mockSkillAnalytics} 
        />

        {/* Charts */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-transparent dark:from-blue-900/10 rounded-3xl -z-10 blur-xl" />
          <AnalyticsCharts 
            applicationAnalytics={mockApplicationAnalytics} 
            skillAnalytics={mockSkillAnalytics} 
          />
        </div>

      </div>
    </div>
  );
}
