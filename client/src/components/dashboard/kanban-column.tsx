import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Application, ApplicationStatus } from '@/lib/types';
import { KanbanCard } from './kanban-card';

interface KanbanColumnProps {
  status: ApplicationStatus;
  applications: Application[];
}

export function KanbanColumn({ status, applications }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  return (
    <div className="flex flex-col w-[350px] shrink-0">
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="font-semibold text-gray-700 dark:text-gray-200">{status}</h2>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          {applications.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 rounded-2xl p-3 min-h-[500px] transition-colors duration-200
                    ${isOver 
                      ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/30' 
                      : 'bg-gray-50/50 dark:bg-gray-800/30 border-transparent'}
                    border-2 border-dashed`}
      >
        <SortableContext 
          id={status}
          items={applications.map(app => app.id)}
          strategy={verticalListSortingStrategy}
        >
          {applications.map(app => (
            <KanbanCard key={app.id} application={app} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
