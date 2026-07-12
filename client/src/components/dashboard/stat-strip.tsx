import React from 'react';
import { Application } from '@/lib/types';
import { Briefcase, Clock, CheckCircle, Target } from 'lucide-react';

interface StatStripProps {
  applications: Application[];
}

export function StatStrip({ applications }: StatStripProps) {
  const total = applications.length;
  const active = applications.filter(a => a.status === 'Applied' || a.status === 'Interview').length;
  const interviews = applications.filter(a => a.status === 'Interview').length;
  const offers = applications.filter(a => a.status === 'Offer').length;

  const stats = [
    { label: 'Total Applications', value: total, icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Active', value: active, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Interviews', value: interviews, icon: Target, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Offers Received', value: offers, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <div 
            key={i}
            className="rounded-2xl p-5 transition-all duration-300 ease-out
                     bg-white dark:bg-gray-800/90 
                     shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_40px_rgba(0,0,0,0.03)] 
                     hover:shadow-[0_1px_3px_rgba(0,0,0,0.05),0_20px_60px_rgba(0,0,0,0.08)]
                     dark:shadow-[0_1px_3px_rgba(0,0,0,0.3),0_10px_40px_rgba(0,0,0,0.2)]
                     dark:hover:shadow-[0_1px_3px_rgba(0,0,0,0.3),0_20px_60px_rgba(0,0,0,0.4)]
                     border border-gray-100 dark:border-gray-700/50"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-full ${stat.bg}`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
