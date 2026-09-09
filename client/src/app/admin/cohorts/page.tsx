'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Users, GraduationCap, ArrowRight, Search, Plus, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Cohort {
  id: string;
  name: string;
  term: string;
  totalStudents: number;
  placedStudents: number;
  activeApplications: number;
  placementRate: number;
}

const mockCohorts: Cohort[] = [
  {
    id: 'c-2026',
    name: 'Class of 2026',
    term: 'Fall 2025 - Spring 2026',
    totalStudents: 84,
    placedStudents: 62,
    activeApplications: 154,
    placementRate: 74,
  },
  {
    id: 'c-2025',
    name: 'Class of 2025',
    term: 'Fall 2024 - Spring 2025',
    totalStudents: 120,
    placedStudents: 108,
    activeApplications: 45,
    placementRate: 90,
  },
  {
    id: 'c-summer-26',
    name: 'Summer 2026 Internship Track',
    term: 'Summer 2026',
    totalStudents: 56,
    placedStudents: 38,
    activeApplications: 92,
    placementRate: 68,
  }
];

export default function CohortsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [cohorts] = useState<Cohort[]>(mockCohorts);

  const filtered = cohorts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.term.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              Manage student cohorts, track placement progress, and review batch analytics
            </p>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search cohorts..."
                className="w-full sm:w-64 pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
              <Plus className="w-4 h-4 mr-2" />
              New Cohort
            </Button>
          </div>
        </div>

        {/* Cohort Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filtered.map(cohort => (
            <div 
              key={cohort.id} 
              className="rounded-2xl p-6 bg-white dark:bg-gray-800/90 shadow-sm border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  {cohort.placementRate}% Placed
                </span>
              </div>

              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                {cohort.name}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
                {cohort.term}
              </p>

              <div className="grid grid-cols-3 gap-2 py-4 border-t border-b border-gray-100 dark:border-gray-700/50 text-center mb-6">
                <div>
                  <span className="block text-lg font-bold text-gray-900 dark:text-gray-100">{cohort.totalStudents}</span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">Students</span>
                </div>
                <div>
                  <span className="block text-lg font-bold text-blue-600 dark:text-blue-400">{cohort.placedStudents}</span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">Placed</span>
                </div>
                <div>
                  <span className="block text-lg font-bold text-purple-600 dark:text-purple-400">{cohort.activeApplications}</span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">Active Apps</span>
                </div>
              </div>

              <Link 
                href="/admin/dashboard"
                className="inline-flex items-center justify-between w-full text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                <span>View Batch Analytics</span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
