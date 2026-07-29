import React, { useState } from 'react';
import { Settings, ChevronLeft, ChevronRight, Pencil, Plus } from 'lucide-react';

export function CalendarWidget() {
  const [view, setView] = useState<'Weekly' | 'Monthly'>('Weekly');

  // Static dates for UI mockup based on the image provided
  const days = ['W', 'T', 'F', 'S', 'S', 'M', 'T'];
  const dates = [1, 2, 3, 4, 5, 6, 7];

  return (
    <div className="relative w-full rounded-3xl overflow-hidden p-6 
                    bg-white/20 dark:bg-gray-800/30 
                    backdrop-blur-xl border border-white/30 dark:border-white/10
                    shadow-[0_8px_32px_0_rgba(31,38,135,0.15)]
                    text-gray-800 dark:text-gray-100">
      
      {/* Background Gradient Effect (Optional, to mimic the image's colorful background if the parent doesn't have one) */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-400/30 to-purple-400/20 dark:from-slate-600/30 dark:to-purple-900/20 -z-10 mix-blend-overlay"></div>

      {/* Top Bar: Toggle & Settings */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex bg-black/10 dark:bg-black/30 rounded-full p-1 backdrop-blur-md">
          <button
            onClick={() => setView('Weekly')}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors
              ${view === 'Weekly' 
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setView('Monthly')}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors
              ${view === 'Monthly' 
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
          >
            Monthly
          </button>
        </div>
        <button className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Month & Navigation */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-4xl font-bold tracking-tight">July</h2>
        <div className="flex gap-2 text-gray-500 dark:text-gray-400">
          <button className="p-1 hover:text-gray-800 dark:hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button className="p-1 hover:text-gray-800 dark:hover:text-white transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Days & Dates */}
      <div className="grid grid-cols-7 gap-2 mb-8">
        {days.map((day, i) => (
          <div key={`day-${i}`} className="text-center font-bold text-gray-500 dark:text-gray-400 text-sm mb-2">
            {day}
          </div>
        ))}
        {dates.map((date, i) => (
          <div key={`date-${i}`} className="text-center font-bold text-lg">
            {date}
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-white/30 dark:bg-white/10 mb-6"></div>

      {/* Bottom Actions */}
      <div className="flex justify-between items-center gap-4">
        <div className="flex items-center gap-2 flex-1 text-gray-500 dark:text-gray-400">
          <Pencil className="w-4 h-4" />
          <input 
            type="text" 
            placeholder="Add a note..." 
            className="bg-transparent border-none outline-none text-sm w-full placeholder:text-gray-500 dark:placeholder:text-gray-400"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 dark:bg-white/10 hover:bg-white/30 dark:hover:bg-white/20 transition-colors backdrop-blur-md text-sm font-semibold shadow-sm">
          <Plus className="w-4 h-4" />
          New Event
        </button>
      </div>
    </div>
  );
}
