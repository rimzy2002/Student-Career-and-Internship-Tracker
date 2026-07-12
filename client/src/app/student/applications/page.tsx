'use client';

import React from 'react';
import { mockApplications } from '@/lib/mock-data';
import { formatDistanceToNow } from 'date-fns';
import { ApplicationStatus } from '@/lib/types';
import Link from 'next/link';
import { Building2, Search, Plus, ArrowRight } from 'lucide-react';

export default function ApplicationsPage() {
  
  const STATUS_COLORS: Record<ApplicationStatus, string> = {
    'Applied': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800/50',
    'Interview': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800/50',
    'Offer': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800/50',
    'Rejected': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800/50',
  };

  return (
    <div className="min-h-screen p-6 md:p-8 transition-colors duration-500 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <div className="max-w-[1600px] mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              All Applications
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              View and manage your entire application history
            </p>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search companies or roles..."
                className="w-full sm:w-64 pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
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
              <span className="hidden sm:inline">Add New</span>
            </Link>
          </div>
        </div>

        {/* Data Table View */}
        <div className="rounded-2xl bg-white dark:bg-gray-800/90 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3),0_10px_40px_rgba(0,0,0,0.2)] border border-gray-100 dark:border-gray-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-800/50 uppercase border-b border-gray-100 dark:border-gray-700/50">
                <tr>
                  <th scope="col" className="px-6 py-4 font-medium">Company & Role</th>
                  <th scope="col" className="px-6 py-4 font-medium">Status</th>
                  <th scope="col" className="px-6 py-4 font-medium hidden sm:table-cell">Applied</th>
                  <th scope="col" className="px-6 py-4 font-medium hidden md:table-cell">Skills</th>
                  <th scope="col" className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {mockApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mr-4 border border-gray-200 dark:border-gray-700">
                          <Building2 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        </div>
                        <div>
                          <Link href={`/student/applications/${app.id}`} className="font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors block">
                            {app.companyName}
                          </Link>
                          <span className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 block">{app.roleTitle}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md border text-xs font-medium ${STATUS_COLORS[app.status]}`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                      {formatDistanceToNow(new Date(app.dateApplied), { addSuffix: true })}
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {app.skills.slice(0, 2).map(skill => (
                          <span key={skill.id} className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                            {skill.name}
                          </span>
                        ))}
                        {app.skills.length > 2 && (
                          <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                            +{app.skills.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/student/applications/${app.id}`}
                        className="inline-flex items-center justify-center p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
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
        
      </div>
    </div>
  );
}
