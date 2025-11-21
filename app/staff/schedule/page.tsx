'use client';

import { staff, leaves, getDateForDay, getLeavesForStaff, hasLeaveOnDay, scheduleMetadata } from '@/app/lib/mock-schedule-data';

const STAFF_NUMBER = 1; // Alex Thompson

export default function MySchedulePage() {
  const currentStaff = staff.find(s => s.staffNumber === STAFF_NUMBER)!;
  const myLeaves = getLeavesForStaff(STAFF_NUMBER);

  const renderMyCalendar = () => {
    const days = [];
    for (let day = 1; day <= scheduleMetadata.totalDays; day++) {
      const date = getDateForDay(day);
      days.push({ day, date });
    }

    const weeks: typeof days[] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return (
      <div className="space-y-2">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 gap-1">
            {week.map(({ day, date }) => {
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              const myLeave = hasLeaveOnDay(STAFF_NUMBER, day);
              const hasLeave = myLeave !== null;

              return (
                <div
                  key={day}
                  className={`p-3 rounded border text-center ${
                    hasLeave
                      ? 'bg-yellow-100 border-yellow-400 ring-2 ring-yellow-300'
                      : isWeekend
                      ? 'bg-gray-50 border-gray-200'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="text-xs font-semibold text-gray-600">
                    Day {day}
                  </div>
                  <div className="text-xs text-gray-500">
                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  {hasLeave && (
                    <div className="text-lg mt-1">🏖️</div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Schedule</h1>
        <p className="text-gray-600">
          {scheduleMetadata.name} • {scheduleMetadata.totalDays} days
        </p>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">6-Week Schedule</h2>
        {renderMyCalendar()}
        <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-100 border-2 border-yellow-400 rounded"></div>
            <span>My Approved Leave</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-50 border border-gray-200 rounded"></div>
            <span>Weekend</span>
          </div>
        </div>
      </div>

      {/* My Leaves */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">My Approved Time Off</h2>
        </div>
        {myLeaves.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {myLeaves.map((leave, idx) => {
              const startDate = getDateForDay(leave.startDay);
              const endDate = getDateForDay(leave.endDay);
              const days = leave.endDay - leave.startDay + 1;

              return (
                <div key={idx} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">
                        {startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} -{' '}
                        {endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Days {leave.startDay}-{leave.endDay} • {days} day{days > 1 ? 's' : ''} • {leave.hours} hours
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      leave.leaveType === 'vac' ? 'bg-blue-100 text-blue-800' :
                      leave.leaveType.startsWith('stat') ? 'bg-green-100 text-green-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {leave.leaveType === 'vac' ? '🏖️ Vacation' :
                       leave.leaveType.startsWith('stat') ? '📅 Stat Day' :
                       '🏥 Leave'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-8 text-center text-gray-500">
            No approved time off for this period
          </div>
        )}
      </div>
    </div>
  );
}
