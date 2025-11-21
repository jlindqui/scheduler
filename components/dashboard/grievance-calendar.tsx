'use client';

import React, { useMemo, useState } from 'react';
import { Calendar, dateFnsLocalizer, Views, Event, Navigate, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addDays, addBusinessDays } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '@/styles/calendar.css';
import { GrievanceListItem } from '@/app/lib/definitions';
import { useRouter } from 'next/navigation';

// Setup the localizer for react-big-calendar using date-fns
const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface GrievanceCalendarProps {
  grievances: GrievanceListItem[];
  stepInfo: Record<string, {
    stepName?: string;
    stage?: string;
    timeLimitDays: number;
    isCalendarDays: boolean;
    createdAt: Date;
    nextStepName?: string;
  }>;
}

interface GrievanceEvent extends Event {
  id: string;
  grievanceId: string;
  type: 'deadline' | 'filed';
  status: 'active' | 'overdue' | 'completed';
  grievorName: string;
}

export function GrievanceCalendar({ grievances, stepInfo }: GrievanceCalendarProps) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>(Views.MONTH);

  // Convert grievances to calendar events
  const events = useMemo(() => {
    const calendarEvents: GrievanceEvent[] = [];

    grievances.forEach(grievance => {
      // Add filing date event
      if (grievance.filedAt) {
        calendarEvents.push({
          id: `filed-${grievance.id}`,
          grievanceId: grievance.id,
          title: `Filed: ${grievance.report?.grievors?.[0]?.lastName || 'Unknown'}`,
          start: new Date(grievance.filedAt),
          end: new Date(grievance.filedAt),
          type: 'filed',
          status: grievance.status === 'ACTIVE' ? 'active' : 'completed',
          grievorName: `${grievance.report?.grievors?.[0]?.firstName} ${grievance.report?.grievors?.[0]?.lastName}` || 'Unknown',
          allDay: true,
        });
      }

      // Add deadline events for active grievances with steps
      if (grievance.status === 'ACTIVE' && grievance.currentStep && stepInfo[grievance.id]) {
        const { timeLimitDays, isCalendarDays, createdAt, nextStepName, stepName } = stepInfo[grievance.id];

        // Skip 0-day timelines
        if (timeLimitDays > 0) {
          const dueDate = isCalendarDays
            ? addDays(new Date(createdAt), timeLimitDays)
            : addBusinessDays(new Date(createdAt), timeLimitDays);

          const today = new Date();
          today.setHours(0, 0, 0, 0);
          dueDate.setHours(0, 0, 0, 0);

          const isOverdue = dueDate < today;

          // Use nextStepName, stepName, or fallback to current step
          const stepDisplayName = nextStepName || stepName || grievance.currentStep?.replace('_', ' ') || 'Unknown Step';

          calendarEvents.push({
            id: `deadline-${grievance.id}`,
            grievanceId: grievance.id,
            title: `Due: ${grievance.report?.grievors?.[0]?.lastName || 'Unknown'} - ${stepDisplayName}`,
            start: dueDate,
            end: dueDate,
            type: 'deadline',
            status: isOverdue ? 'overdue' : 'active',
            grievorName: `${grievance.report?.grievors?.[0]?.firstName} ${grievance.report?.grievors?.[0]?.lastName}` || 'Unknown',
            allDay: true,
          });
        }
      }
    });

    return calendarEvents;
  }, [grievances, stepInfo]);

  // Custom event style based on type and status
  const eventStyleGetter = (event: GrievanceEvent) => {
    let backgroundColor = '#64748b'; // Default slate
    let borderColor = '#475569';

    if (event.type === 'filed') {
      backgroundColor = '#10b981'; // Green for filed
      borderColor = '#059669';
    } else if (event.type === 'deadline') {
      if (event.status === 'overdue') {
        backgroundColor = '#ef4444'; // Red for overdue
        borderColor = '#dc2626';
      } else {
        backgroundColor = '#f59e0b'; // Amber for upcoming
        borderColor = '#d97706';
      }
    }

    if (event.status === 'completed') {
      backgroundColor = '#9ca3af'; // Gray for completed
      borderColor = '#6b7280';
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        borderWidth: '1px',
        borderStyle: 'solid',
        color: 'white',
        borderRadius: '4px',
        fontSize: '12px',
        padding: '2px 4px',
      },
    };
  };

  // Handle event click - navigate to grievance details
  const handleSelectEvent = (event: GrievanceEvent) => {
    router.push(`/product/grievances/${event.grievanceId}`);
  };

  // Handle navigation
  const handleNavigate = (newDate: Date) => {
    setCurrentDate(newDate);
  };

  const handleViewChange = (newView: View) => {
    setCurrentView(newView);
  };

  // Custom toolbar component for cleaner UI
  const CustomToolbar = React.useCallback((props: any) => {
    const goToBack = (e: React.MouseEvent) => {
      e.preventDefault();
      props.onNavigate('PREV');
    };

    const goToNext = (e: React.MouseEvent) => {
      e.preventDefault();
      props.onNavigate('NEXT');
    };

    const goToToday = (e: React.MouseEvent) => {
      e.preventDefault();
      props.onNavigate('TODAY');
    };

    const label = () => {
      const date = props.date;
      if (props.view === 'month') {
        return format(date, 'MMMM yyyy');
      } else if (props.view === 'week') {
        const start = startOfWeek(date);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
      } else if (props.view === 'agenda') {
        return 'Agenda';
      }
      return '';
    };

    return (
      <div className="flex justify-between items-center mb-4 px-4 py-2 bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToToday}
            className="px-3 py-1 text-sm bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
          >
            Today
          </button>
          <button
            type="button"
            onClick={goToBack}
            className="p-1 hover:bg-slate-100 rounded transition-colors cursor-pointer"
            aria-label="Previous"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={goToNext}
            className="p-1 hover:bg-slate-100 rounded transition-colors cursor-pointer"
            aria-label="Next"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <h2 className="text-lg font-semibold text-gray-800">
          {label()}
        </h2>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              props.onView(Views.MONTH);
            }}
            className={`px-3 py-1 text-sm rounded transition-colors cursor-pointer ${
              props.view === Views.MONTH
                ? 'bg-slate-700 text-white'
                : 'bg-slate-100 hover:bg-slate-200'
            }`}
          >
            Month
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              props.onView(Views.WEEK);
            }}
            className={`px-3 py-1 text-sm rounded transition-colors cursor-pointer ${
              props.view === Views.WEEK
                ? 'bg-slate-700 text-white'
                : 'bg-slate-100 hover:bg-slate-200'
            }`}
          >
            Week
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              props.onView(Views.AGENDA);
            }}
            className={`px-3 py-1 text-sm rounded transition-colors cursor-pointer ${
              props.view === Views.AGENDA
                ? 'bg-slate-700 text-white'
                : 'bg-slate-100 hover:bg-slate-200'
            }`}
          >
            Agenda
          </button>
        </div>
      </div>
    );
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Grievance Calendar</h2>
        <div className="mt-2 flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-gray-600">Filed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-amber-500 rounded"></div>
            <span className="text-gray-600">Upcoming Deadline</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-gray-600">Overdue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-400 rounded"></div>
            <span className="text-gray-600">Completed</span>
          </div>
        </div>
      </div>

      <div style={{ height: 600 }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={currentView}
          date={currentDate}
          onNavigate={handleNavigate}
          onView={handleViewChange}
          views={[Views.MONTH, Views.WEEK, Views.AGENDA]}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
          components={{
            toolbar: CustomToolbar,
          }}
          popup
          showMultiDayTimes
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
        />
      </div>
    </div>
  );
}