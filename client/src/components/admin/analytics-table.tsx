import React from 'react';
import { ApplicationAnalytics, SkillAnalytics } from '@/lib/types';

interface AnalyticsTableProps {
  applicationAnalytics: ApplicationAnalytics[];
  skillAnalytics: SkillAnalytics[];
}

export function AnalyticsTable({ applicationAnalytics, skillAnalytics }: AnalyticsTableProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
      
      {/* Application Volume Table */}
      <div className="rounded-2xl bg-white dark:bg-gray-800/90 
                      shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_40px_rgba(0,0,0,0.03)] 
                      dark:shadow-[0_1px_3px_rgba(0,0,0,0.3),0_10px_40px_rgba(0,0,0,0.2)]
                      border border-gray-100 dark:border-gray-700/50 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700/50">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Application Volume Data</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 uppercase">
              <tr>
                <th scope="col" className="px-6 py-4 font-medium">Status</th>
                <th scope="col" className="px-6 py-4 font-medium text-right">Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {applicationAnalytics.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{item.status_name}</td>
                  <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300">{item.count}</td>
                </tr>
              ))}
              {applicationAnalytics.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-6 py-8 text-center text-gray-500">No data available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Skill Gap Table */}
      <div className="rounded-2xl bg-white dark:bg-gray-800/90 
                      shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_40px_rgba(0,0,0,0.03)] 
                      dark:shadow-[0_1px_3px_rgba(0,0,0,0.3),0_10px_40px_rgba(0,0,0,0.2)]
                      border border-gray-100 dark:border-gray-700/50 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700/50">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Top Skill Gaps Data</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 uppercase">
              <tr>
                <th scope="col" className="px-6 py-4 font-medium">Skill</th>
                <th scope="col" className="px-6 py-4 font-medium text-right">Rejections</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {skillAnalytics.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{item.skill_name}</td>
                  <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300">{item.count}</td>
                </tr>
              ))}
              {skillAnalytics.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-6 py-8 text-center text-gray-500">No data available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
