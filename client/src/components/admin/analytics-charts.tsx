import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { ApplicationAnalytics, SkillAnalytics } from '@/lib/types';
import { Layers, AlertTriangle } from 'lucide-react';

interface AnalyticsChartsProps {
  applicationAnalytics: ApplicationAnalytics[];
  skillAnalytics: SkillAnalytics[];
}

export function AnalyticsCharts({ applicationAnalytics, skillAnalytics }: AnalyticsChartsProps) {
  
  // Colors for the charts matching the minimal professional aesthetic
  const STATUS_COLORS: Record<string, string> = {
    'Applied': '#3b82f6', // blue-500
    'Interview': '#8b5cf6', // purple-500
    'Offer': '#10b981', // green-500
    'Rejected': '#f43f5e', // rose-500
  };

  const hasAppVolume = (applicationAnalytics || []).some(a => a.count > 0);
  const hasSkillGaps = (skillAnalytics || []).some(s => s.count > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
      
      {/* Application Volume Chart */}
      <div className="rounded-2xl p-6 bg-white dark:bg-gray-800/90 
                      shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_40px_rgba(0,0,0,0.03)] 
                      dark:shadow-[0_1px_3px_rgba(0,0,0,0.3),0_10px_40px_rgba(0,0,0,0.2)]
                      border border-gray-100 dark:border-gray-700/50">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Application Volume</h2>
        
        <div className="h-[300px] w-full">
          {!hasAppVolume ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-gray-50/50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700/60">
              <Layers className="w-10 h-10 text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No application volume data</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Student applications submitted on the platform will appear here.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={applicationAnalytics}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:opacity-20" />
                <XAxis 
                  dataKey="status_name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6b7280', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  dx={-10}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {applicationAnalytics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status_name] || '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Skill Gap Chart */}
      <div className="rounded-2xl p-6 bg-white dark:bg-gray-800/90 
                      shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_40px_rgba(0,0,0,0.03)] 
                      dark:shadow-[0_1px_3px_rgba(0,0,0,0.3),0_10px_40px_rgba(0,0,0,0.2)]
                      border border-gray-100 dark:border-gray-700/50">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Top Skill Gaps (Rejections)</h2>
        
        <div className="h-[300px] w-full">
          {!hasSkillGaps ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-gray-50/50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700/60">
              <AlertTriangle className="w-10 h-10 text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No skill gaps recorded</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Rejection feedback and skill tags will aggregate here.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={skillAnalytics}
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" className="dark:opacity-20" />
                <XAxis 
                  type="number"
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6b7280', fontSize: 12 }} 
                />
                <YAxis 
                  type="category" 
                  dataKey="skill_name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  dx={-10}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 6, 6, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

