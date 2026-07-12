import React, { useRef, useEffect, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Application } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { Building2, Calendar } from 'lucide-react';
import Link from 'next/link';

interface KanbanCardProps {
  application: Application;
}

export function KanbanCard({ application }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: application.id, data: application });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  const cardRef = useRef<HTMLDivElement>(null);

  // 3D Tilt effect
  useEffect(() => {
    const card = cardRef.current;
    if (!card || isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateY = ((x - centerX) / centerX) * 4; // reduced intensity from 8
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
  }, [isDragging]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="mb-3 outline-none"
    >
      <div
        ref={cardRef}
        className="group relative w-full rounded-xl p-4 cursor-grab active:cursor-grabbing transition-shadow duration-300 ease-out
                   bg-white dark:bg-gray-800/90 
                   shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_40px_rgba(0,0,0,0.03)] 
                   hover:shadow-[0_1px_3px_rgba(0,0,0,0.05),0_20px_60px_rgba(0,0,0,0.12)]
                   dark:shadow-[0_1px_3px_rgba(0,0,0,0.3),0_10px_40px_rgba(0,0,0,0.2)]
                   dark:hover:shadow-[0_1px_3px_rgba(0,0,0,0.3),0_20px_60px_rgba(0,0,0,0.5)]
                   border border-gray-100 dark:border-gray-700/50"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 leading-tight hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
          <Link href={`/student/applications/${application.id}`} onPointerDown={(e) => e.stopPropagation()}>
            {application.roleTitle}
          </Link>
        </h3>
        
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-3 space-x-2">
          <span className="flex items-center">
            <Building2 className="w-3.5 h-3.5 mr-1" />
            {application.companyName}
          </span>
        </div>

        <div className="flex items-center text-xs text-gray-400 dark:text-gray-500 mb-4">
          <Calendar className="w-3.5 h-3.5 mr-1" />
          Applied {formatDistanceToNow(new Date(application.dateApplied), { addSuffix: true })}
        </div>

        {application.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {application.skills.map(skill => (
              <span 
                key={skill.id}
                className="px-2 py-0.5 text-xs font-medium rounded-md
                           bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400
                           border border-blue-100 dark:border-blue-500/20"
              >
                {skill.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
