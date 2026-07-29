'use client';

import React, { useState } from 'react';
import { StatStrip } from '@/components/dashboard/stat-strip';
import { KanbanBoard } from '@/components/dashboard/kanban-board';
import { CalendarWidget } from '@/components/dashboard/calendar-widget';
import { mockApplications } from '@/lib/mock-data';
import { Application } from '@/lib/types';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [applications, setApplications] = useState<Application[]>(mockApplications);

  const handleApplicationsChange = (newApps: Application[]) => {
    setApplications(newApps);
  };

  return (
    <div className="min-h-screen p-6 md:p-8 transition-colors duration-500
                    bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <div className="max-w-[1600px] mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Dashboard
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Track and manage your internship applications
            </p>
          </div>
          
          <Link 
            href="/student/applications/new"
            className="inline-flex items-center justify-center px-5 py-2.5 
                       bg-gradient-to-r from-blue-600 to-purple-600 
                       hover:from-blue-700 hover:to-purple-700
                       text-white rounded-xl font-medium text-sm transition-all duration-200 
                       shadow-[0_1px_3px_rgba(0,0,0,0.1),0_10px_20px_rgba(59,130,246,0.15)]
                       hover:shadow-[0_1px_3px_rgba(0,0,0,0.1),0_10px_20px_rgba(59,130,246,0.25)]
                       active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Application
          </Link>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          
          {/* Left Column: Stats & Kanban */}
          <div className="xl:col-span-3 space-y-8">
            {/* Stats Summary Strip */}
            <StatStrip applications={applications} />

            {/* Kanban Board Area */}
            <div className="relative">
              {/* Subtle background glow effect behind the board */}
              <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-transparent dark:from-blue-900/10 rounded-3xl -z-10 blur-xl" />
              
              <KanbanBoard 
                initialApplications={applications} 
                onApplicationsChange={handleApplicationsChange} 
              />
            </div>
          </div>

          {/* Right Column: Widgets */}
          <div className="xl:col-span-1">
            <CalendarWidget />
          </div>
          
        </div>
        
      </div>
    </div>
  );
}
