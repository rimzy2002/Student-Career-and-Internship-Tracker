'use client';

import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  Plus, 
  Calendar as CalendarIcon, 
  ExternalLink 
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday, 
  addMonths, 
  subMonths, 
  addWeeks, 
  subWeeks 
} from 'date-fns';
import { Application, ApplicationStatus } from '@/lib/types';
import Link from 'next/link';

export interface CalendarWidgetProps {
  applications?: Application[];
}

const STATUS_COLORS: Record<ApplicationStatus | string, string> = {
  'Applied': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800/50',
  'Interview': 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800/50',
  'Offer': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50',
  'Rejected': 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800/50',
};

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

/**
 * Normalizes an application's application date into a YYYY-MM-DD string key.
 */
function getAppDateKey(app: Application): string | null {
  const raw = app.dateApplied || (app as unknown as { date_applied?: string }).date_applied;
  if (!raw) return null;
  if (typeof raw === 'string') {
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
  }
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return null;
    return format(d, 'yyyy-MM-dd');
  } catch {
    return null;
  }
}

export function CalendarWidget({ applications = [] }: CalendarWidgetProps) {
  const [view, setView] = useState<'Weekly' | 'Monthly'>('Monthly');
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  // Map real applications by date key (YYYY-MM-DD)
  const applicationsByDate = useMemo(() => {
    const map = new Map<string, Application[]>();
    if (!Array.isArray(applications)) return map;

    for (const app of applications) {
      const key = getAppDateKey(app);
      if (key) {
        const existing = map.get(key) || [];
        existing.push(app);
        map.set(key, existing);
      }
    }
    return map;
  }, [applications]);

  // Compute days for grid (Weekly vs Monthly)
  const calendarDays = useMemo(() => {
    if (view === 'Weekly') {
      const base = selectedDate || currentDate;
      const start = startOfWeek(base, { weekStartsOn: 1 });
      const end = endOfWeek(base, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    } else {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const start = startOfWeek(monthStart, { weekStartsOn: 1 });
      const end = endOfWeek(monthEnd, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    }
  }, [view, currentDate, selectedDate]);

  // Real milestone count in the current viewed month
  const currentMonthMilestonesCount = useMemo(() => {
    if (!Array.isArray(applications)) return 0;
    return applications.filter(app => {
      const key = getAppDateKey(app);
      if (!key) return false;
      const [y, m] = key.split('-').map(Number);
      return y === currentDate.getFullYear() && m === (currentDate.getMonth() + 1);
    }).length;
  }, [applications, currentDate]);

  // Navigation handlers
  const handlePrev = () => {
    if (view === 'Weekly') {
      setCurrentDate(prev => subWeeks(prev, 1));
      setSelectedDate(prev => subWeeks(prev, 1));
    } else {
      setCurrentDate(prev => {
        const target = subMonths(prev, 1);
        setSelectedDate(startOfMonth(target));
        return target;
      });
    }
  };

  const handleNext = () => {
    if (view === 'Weekly') {
      setCurrentDate(prev => addWeeks(prev, 1));
      setSelectedDate(prev => addWeeks(prev, 1));
    } else {
      setCurrentDate(prev => {
        const target = addMonths(prev, 1);
        setSelectedDate(startOfMonth(target));
        return target;
      });
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  };

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    if (!isSameMonth(day, currentDate)) {
      setCurrentDate(day);
    }
  };

  // Selected date milestones
  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');
  const selectedDayMilestones = applicationsByDate.get(selectedDateKey) || [];

  return (
    <div 
      data-testid="calendar-widget"
      className="relative w-full rounded-3xl overflow-hidden p-6 
                 bg-white/20 dark:bg-gray-800/30 
                 backdrop-blur-xl border border-white/30 dark:border-white/10
                 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)]
                 text-gray-800 dark:text-gray-100 flex flex-col justify-between"
    >
      {/* Background Gradient Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-400/20 to-purple-400/15 dark:from-slate-600/20 dark:to-purple-900/20 -z-10 mix-blend-overlay pointer-events-none" />

      {/* Top Bar: View Toggle & Today Quick-Jump */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex bg-black/10 dark:bg-black/30 rounded-full p-1 backdrop-blur-md">
          <button
            onClick={() => setView('Weekly')}
            className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all ${
              view === 'Weekly'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setView('Monthly')}
            className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all ${
              view === 'Monthly'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Monthly
          </button>
        </div>

        <button 
          onClick={handleToday}
          className="px-3 py-1 rounded-full text-xs font-medium bg-white/40 dark:bg-white/10 hover:bg-white/60 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 border border-white/40 dark:border-white/10 transition-colors shadow-sm"
          title="Jump to today"
        >
          Today
        </button>
      </div>

      {/* Month & Navigation Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {currentMonthMilestonesCount === 1 
              ? '1 application milestone' 
              : `${currentMonthMilestonesCount} application milestones`}
          </p>
        </div>
        
        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
          <button 
            onClick={handlePrev}
            aria-label="Previous month"
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={handleNext}
            aria-label="Next month"
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Weekday Column Headers */}
      <div className="grid grid-cols-7 gap-1 text-center font-semibold text-xs text-gray-500 dark:text-gray-400 mb-2">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days Grid */}
      <div className="grid grid-cols-7 gap-1 mb-5">
        {calendarDays.map((day) => {
          const dayKey = format(day, 'yyyy-MM-dd');
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isCurrentDay = isToday(day);
          const isSelected = isSameDay(day, selectedDate);
          const dayMilestones = applicationsByDate.get(dayKey) || [];
          const hasMilestones = dayMilestones.length > 0;

          return (
            <button
              key={day.toISOString()}
              onClick={() => handleDayClick(day)}
              className={`relative h-9 w-full flex flex-col items-center justify-center rounded-xl text-xs sm:text-sm font-medium transition-all ${
                isSelected
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold shadow-md shadow-blue-500/20'
                  : isCurrentDay
                  ? 'border-2 border-blue-500/80 text-blue-600 dark:text-blue-400 font-bold bg-blue-500/10'
                  : isCurrentMonth
                  ? 'text-gray-800 dark:text-gray-200 hover:bg-white/40 dark:hover:bg-white/10'
                  : 'text-gray-400/40 dark:text-gray-500/40 hover:bg-white/20 dark:hover:bg-white/5'
              }`}
              title={hasMilestones ? `${dayMilestones.length} application(s) on ${format(day, 'MMM d')}` : undefined}
            >
              <span>{format(day, 'd')}</span>
              
              {/* Milestone Indicator Dot */}
              {hasMilestones && (
                <span 
                  className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                    isSelected ? 'bg-white' : 'bg-blue-500 dark:bg-blue-400'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-white/30 dark:bg-white/10 mb-4" />

      {/* Selected Day Milestones & Month Overview */}
      <div className="space-y-3 mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
            <CalendarIcon className="w-3.5 h-3.5 text-blue-500" />
            <span>{format(selectedDate, 'EEE, MMMM d, yyyy')}</span>
          </div>
          {isToday(selectedDate) && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Today
            </span>
          )}
        </div>

        {/* Real Application Milestones on Selected Date or Empty Month */}
        {selectedDayMilestones.length > 0 ? (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {selectedDayMilestones.map((app) => {
              const statusName = app.status || (app as unknown as { current_status_name?: string }).current_status_name || 'Applied';
              const company = app.companyName || (app as unknown as { company_name?: string }).company_name || 'Unknown Company';
              const role = app.roleTitle || (app as unknown as { role_title?: string }).role_title || 'Untitled Role';
              const badgeStyle = STATUS_COLORS[statusName] || STATUS_COLORS['Applied'];

              return (
                <Link
                  key={app.id}
                  href={`/student/applications/${app.id}`}
                  className="group block p-2.5 rounded-2xl bg-white/40 dark:bg-white/5 hover:bg-white/70 dark:hover:bg-white/10 border border-white/40 dark:border-white/10 transition-all shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {company}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                        {role}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badgeStyle}`}>
                      {statusName}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Send className="w-3 h-3" />
                      Application submitted
                    </span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : currentMonthMilestonesCount === 0 ? (
          <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              No application milestones this month.
            </p>
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              No milestones on this day.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Actions: Log Application Link */}
      <div className="pt-2">
        <Link 
          href="/student/applications/new"
          className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-xs font-semibold shadow-sm transition-all active:scale-[0.99]"
        >
          <Plus className="w-3.5 h-3.5" />
          Log Application
        </Link>
      </div>
    </div>
  );
}
