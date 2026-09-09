'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { API_BASE_URL } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

const COLUMNS: ApplicationStatus[] = ['Applied', 'Interview', 'Offer', 'Rejected'];

interface KanbanBoardProps {
  initialApplications: Application[];
  onApplicationsChange: (apps: Application[]) => void;
}

export function KanbanBoard({ initialApplications, onApplicationsChange }: KanbanBoardProps) {
  const [applications, setApplications] = useState<Application[]>(initialApplications);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragSourceColumn, setDragSourceColumn] = useState<ApplicationStatus | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const previousAppsRef = useRef<Application[]>(initialApplications);

  // Synchronize when initialApplications changes from parent fetch
  useEffect(() => {
    setApplications(initialApplications);
    previousAppsRef.current = initialApplications;
  }, [initialApplications]);

  // Subscribe to Supabase Realtime Broadcast for multi-tab/multi-device synchronization
  useEffect(() => {
    if (!supabase) return;

    let user: { id?: string } | null = null;
    try {
      const stored = localStorage.getItem('user');
      if (stored) user = JSON.parse(stored);
    } catch (e) {
      // Ignore parse errors
    }

    if (!user?.id) return;

    const channel = supabase.channel(`student:${user.id}:applications`);
    
    channel.on('broadcast', { event: 'application:status_updated' }, (payload) => {
      const { applicationId, status } = payload.payload || {};
      if (!applicationId || !status) return;

      setApplications((prev) => {
        const updated = prev.map((app) => 
          String(app.id) === String(applicationId) ? { ...app, status: status as ApplicationStatus } : app
        );
        onApplicationsChange(updated);
        return updated;
      });
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onApplicationsChange]);

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
    const id = event.active.id as string;
    setActiveId(id);
    const found = applications.find(a => String(a.id) === String(id));
    setDragSourceColumn(found ? found.status : null);
    // Snapshot state before drag starts for rollback safety
    previousAppsRef.current = [...applications];
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isOverColumn = COLUMNS.includes(overId as ApplicationStatus);

    setApplications((apps) => {
      const activeIndex = apps.findIndex((t) => String(t.id) === String(activeId));
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
      const overIndex = apps.findIndex((t) => String(t.id) === String(overId));
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

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) {
      setDragSourceColumn(null);
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);

    // Find target column
    let newStatus: ApplicationStatus | null = null;
    if (COLUMNS.includes(overId as ApplicationStatus)) {
      newStatus = overId as ApplicationStatus;
    } else {
      const overApp = applications.find((t) => String(t.id) === overId);
      if (overApp) {
        newStatus = overApp.status;
      }
    }

    const originalStatus = dragSourceColumn;
    setDragSourceColumn(null);

    // Notify parent immediately (Optimistic state update)
    onApplicationsChange(applications);

    // If status didn't actually change, nothing to persist
    if (!newStatus || newStatus === originalStatus) {
      return;
    }

    // Persist to backend with rollback protection
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      // Offline / guest mode (mock preview only)
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/applications/${activeId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update status on server');
      }

      setFeedbackMessage({ type: 'success', text: `Moved to ${newStatus}` });
      setTimeout(() => setFeedbackMessage(null), 2500);

    } catch (err: unknown) {
      console.error('Optimistic status update failed, rolling back:', err);
      // Rollback to prior snapshot
      setApplications(previousAppsRef.current);
      onApplicationsChange(previousAppsRef.current);

      const errorMsg = err instanceof Error ? err.message : 'Network error';
      setFeedbackMessage({
        type: 'error',
        text: `Update failed (${errorMsg}). Changes reverted.`
      });
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  const activeApplication = applications.find(app => String(app.id) === String(activeId));

  return (
    <div className="relative">
      {/* Toast feedback banner */}
      {feedbackMessage && (
        <div 
          className={`absolute -top-12 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium shadow-lg transition-all animate-in fade-in slide-in-from-top-2 ${
            feedbackMessage.type === 'error'
              ? 'bg-rose-500 text-white dark:bg-rose-600'
              : 'bg-emerald-600 text-white dark:bg-emerald-700'
          }`}
        >
          {feedbackMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

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
    </div>
  );
}
