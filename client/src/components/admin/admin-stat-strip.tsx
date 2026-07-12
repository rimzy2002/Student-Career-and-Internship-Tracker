import React, { useRef, useEffect } from 'react';
import { ApplicationAnalytics, SkillAnalytics } from '@/lib/types';
import { Layers, Users, AlertTriangle } from 'lucide-react';

interface AdminStatStripProps {
  applicationAnalytics: ApplicationAnalytics[];
  skillAnalytics: SkillAnalytics[];
}

export function AdminStatStrip({ applicationAnalytics, skillAnalytics }: AdminStatStripProps) {
  const totalApplications = applicationAnalytics.reduce((acc, curr) => acc + curr.count, 0);
  
  // Mocked value for total students until backend endpoint is available
  const totalStudents = 142; 
  
  const topSkillGap = skillAnalytics.length > 0 ? skillAnalytics[0].skill_name : 'N/A';

  const stats = [
    { label: 'Total Applications', value: totalApplications, icon: Layers, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Total Students', value: totalStudents, icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Top Skill Gap', value: topSkillGap, icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <StatCard key={i} stat={stat} Icon={Icon} />
        );
      })}
    </div>
  );
}

function StatCard({ stat, Icon }: { stat: any, Icon: any }) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateY = ((x - centerX) / centerX) * 4;
      const rotateX = ((y - centerY) / centerY) * -4;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    };

    const handleMouseLeave = () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
    };

    card.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      card.removeEventListener('mousemove', handleMouseMove);
      card.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div 
      ref={cardRef}
      className="rounded-2xl p-6 transition-all duration-300 ease-out
                 bg-white dark:bg-gray-800/90 
                 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_40px_rgba(0,0,0,0.03)] 
                 hover:shadow-[0_1px_3px_rgba(0,0,0,0.05),0_20px_60px_rgba(0,0,0,0.12)]
                 dark:shadow-[0_1px_3px_rgba(0,0,0,0.3),0_10px_40px_rgba(0,0,0,0.2)]
                 dark:hover:shadow-[0_1px_3px_rgba(0,0,0,0.3),0_20px_60px_rgba(0,0,0,0.5)]
                 border border-gray-100 dark:border-gray-700/50"
      style={{ transformStyle: 'preserve-3d' }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{stat.label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
        </div>
        <div className={`p-4 rounded-xl ${stat.bg}`}>
          <Icon className={`w-6 h-6 ${stat.color}`} />
        </div>
      </div>
    </div>
  );
}
