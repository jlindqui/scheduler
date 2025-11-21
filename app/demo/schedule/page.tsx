'use client';

import { useState } from 'react';
import { staff, leaves, timeOffBanks, scheduleMetadata, getDateForDay, hasLeaveOnDay } from '@/app/lib/mock-schedule-data';

export default function MasterSchedulePage() {
  const [selectedStaff, setSelectedStaff] = useState<number | null>(null);

  // Get master schedule data from CSV (we'll need to parse it)
  // For now, let's show a calendar view with leaves highlighted

  const renderCalendar = () => {
    const days = [];
    for (let day = 1; day <= scheduleMetadata.totalDays; day++) {
      const date = getDateForDay(day);
      days.push({ day, date });
    }

    // Group by weeks
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

              // Check if any staff has leave this day
              const staffOnLeave = selectedStaff
                ? hasLeaveOnDay(selectedStaff, day)
                : leaves.filter(l => day >= l.startDay && day <= l.endDay);

              const hasLeave = staffOnLeave && (selectedStaff ? staffOnLeave !== null : staffOnLeave.length > 0);

              return (
                <div
                  key={day}
                  className={`p-2 rounded border text-center ${
                    hasLeave
                      ? 'bg-yellow-100 border-yellow-300'
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
                    <div className="text-xs text-yellow-700 mt-1">
                      {selectedStaff ? '🏖️' : `${staffOnLeave.length} off`}
                    </div>
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
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Master Schedule & Leaves</h1>
        <p className="text-gray-600">
          View the 6-week schedule period with approved time off
        </p>
      </div>

      {/* Schedule Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <strong className="text-blue-900">Period:</strong>
            <div className="text-blue-700">{scheduleMetadata.totalDays} days (6 weeks)</div>
          </div>
          <div>
            <strong className="text-blue-900">Start:</strong>
            <div className="text-blue-700">{scheduleMetadata.startDate.toLocaleDateString()}</div>
          </div>
          <div>
            <strong className="text-blue-900">End:</strong>
            <div className="text-blue-700">{scheduleMetadata.endDate.toLocaleDateString()}</div>
          </div>
          <div>
            <strong className="text-blue-900">Total Staff:</strong>
            <div className="text-blue-700">{staff.length} RNs</div>
          </div>
        </div>
      </div>

      {/* Staff Filter */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Filter by Staff</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
          <button
            onClick={() => setSelectedStaff(null)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedStaff === null
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Staff
          </button>
          {staff.map((s) => {
            const staffLeaves = leaves.filter(l => l.staffNumber === s.staffNumber);
            return (
              <button
                key={s.staffNumber}
                onClick={() => setSelectedStaff(s.staffNumber)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                  selectedStaff === s.staffNumber
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div className="truncate">{s.name}</div>
                {staffLeaves.length > 0 && (
                  <div className="text-xs opacity-75">
                    {staffLeaves.length} leave{staffLeaves.length > 1 ? 's' : ''}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Calendar View */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {selectedStaff ? `${staff.find(s => s.staffNumber === selectedStaff)?.name}'s Schedule` : 'All Staff Leaves'}
        </h2>
        {renderCalendar()}
        <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
            <span>Approved Leave</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-50 border border-gray-200 rounded"></div>
            <span>Weekend</span>
          </div>
        </div>
      </div>

      {/* Leave Details */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Approved Leave Requests</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {(selectedStaff ? leaves.filter(l => l.staffNumber === selectedStaff) : leaves).map((leave, idx) => {
            const staffMember = staff.find(s => s.staffNumber === leave.staffNumber);
            const startDate = getDateForDay(leave.startDay);
            const endDate = getDateForDay(leave.endDay);
            const days = leave.endDay - leave.startDay + 1;

            return (
              <div key={idx} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{staffMember?.name}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} -{' '}
                      {endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Days {leave.startDay}-{leave.endDay} • {days} day{days > 1 ? 's' : ''} • {leave.hours} hours
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
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
              </div>
            );
          })}
        </div>
      </div>

      {/* Staffing Summary */}
      <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Leave Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-blue-600 font-medium">Total Leaves</div>
            <div className="text-2xl font-bold text-blue-900">{leaves.length}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-sm text-green-600 font-medium">Vacation Days</div>
            <div className="text-2xl font-bold text-green-900">
              {leaves.filter(l => l.leaveType === 'vac').length}
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-sm text-purple-600 font-medium">Stat Days</div>
            <div className="text-2xl font-bold text-purple-900">
              {leaves.filter(l => l.leaveType.startsWith('stat')).length}
            </div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="text-sm text-orange-600 font-medium">Total Hours</div>
            <div className="text-2xl font-bold text-orange-900">
              {leaves.reduce((sum, l) => sum + l.hours, 0)}
            </div>
          </div>
        </div>

        {/* Critical Gaps Warning */}
        {leaves.some(l => l.leaveType === 'leave1') && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="text-xl">⚠️</span>
              <div className="text-sm text-yellow-800">
                <strong>Critical Staffing Alert:</strong> Staff #12 (Logan Rivera) is on extended leave for 18 days (216 hours).
                This creates significant gaps in night shift coverage that need to be filled through availability collection.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
