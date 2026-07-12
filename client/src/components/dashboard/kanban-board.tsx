'use client';

import React, { useState } from 'react';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { Application, ApplicationStatus } from '@/lib/types';
import { KanbanColumn } from './kanban-column';
import { KanbanCard } from './kanban-card';

const COLUMNS: ApplicationStatus[] = ['Applied', 'Interview', 'Offer', 'Rejected'];

interface KanbanBoardProps {
  initialApplications: Application[];
  onApplicationsChange: (apps: Application[]) => void;
}

export function KanbanBoard({ initialApplications, onApplicationsChange }: KanbanBoardProps) {
  const [applications, setApplications] = useState<Application[]>(initialApplications);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === 'Task';
    const isOverTask = over.data.current?.type === 'Task';
    const isOverColumn = COLUMNS.includes(overId as ApplicationStatus);

    setApplications((apps) => {
      const activeIndex = apps.findIndex((t) => t.id === activeId);
      const activeApp = apps[activeIndex];
      if (!activeApp) return apps;

      if (isOverColumn) {
        // Dropping onto a column directly
        if (activeApp.status !== overId) {
          const newApps = [...apps];
          newApps[activeIndex] = { ...activeApp, status: overId as ApplicationStatus };
          return newApps;
        }
        return apps;
      }

      // Dropping onto another card
      const overIndex = apps.findIndex((t) => t.id === overId);
      const overApp = apps[overIndex];
      if (!overApp) return apps;

      if (activeApp.status !== overApp.status) {
        const newApps = [...apps];
        newApps[activeIndex] = { ...activeApp, status: overApp.status };
        return arrayMove(newApps, activeIndex, overIndex);
      }

      return arrayMove(apps, activeIndex, overIndex);
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    // Trigger API update here when connected to backend
    // fetch(`/api/v1/applications/${activeId}/status`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) })

    onApplicationsChange(applications); // bubble up state if needed for stats
  };

  const activeApplication = applications.find(app => app.id === activeId);

  return (
    <div className="flex overflow-x-auto pb-4 gap-6 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {COLUMNS.map(status => (
          <KanbanColumn 
            key={status} 
            status={status} 
            applications={applications.filter(app => app.status === status)} 
          />
        ))}

        <DragOverlay>
          {activeApplication ? <KanbanCard application={activeApplication} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
