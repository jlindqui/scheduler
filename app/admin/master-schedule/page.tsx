'use client';

import { staff, leaves, getDateForDay, hasLeaveOnDay, scheduleMetadata } from '@/app/lib/mock-schedule-data';
import { useState } from 'react';

export default function AdminMasterSchedulePage() {
  const [selectedStaff, setSelectedStaff] = useState<number | null>(null);

  const renderCalendar = () => {
    const days = [];
    for (let day = 1; day <= scheduleMetadata.totalDays; day++) {
      const date = getDateForDay(day);
      days.push({ day, date });
    }

    const weeks: typeof days[] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    const displayStaff = selectedStaff ? staff.filter(s => s.staffNumber === selectedStaff) : staff;

    return (
      <div className="space-y-3">
        {displayStaff.map((staffMember) => {
          const staffLeaves = leaves.filter(l => l.staffNumber === staffMember.staffNumber);

          return (
            <div key={staffMember.staffNumber} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-gray-900">
                      #{staffMember.staffNumber} {staffMember.name}
                    </span>
                    <span className="ml-3 text-sm text-gray-600">
                      {staffMember.status} • {staffMember.seniorityYears}y seniority
                    </span>
                  </div>
                  {staffLeaves.length > 0 && (
                    <span className="text-xs text-gray-600">
                      {staffLeaves.reduce((sum, l) => sum + l.hours, 0)}h approved leave
                    </span>
                  )}
                </div>
              </div>
              <div className="p-3">
                {weeks.map((week, weekIdx) => (
                  <div key={weekIdx} className="grid grid-cols-7 gap-1 mb-1">
                    {week.map(({ day, date }) => {
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                      const leave = hasLeaveOnDay(staffMember.staffNumber, day);
                      const hasLeave = leave !== null;

                      return (
                        <div
                          key={day}
                          className={`p-2 rounded text-center text-xs ${
                            hasLeave
                              ? leave.leaveType === 'vac'
                                ? 'bg-blue-100 border border-blue-300'
                                : leave.leaveType.startsWith('stat')
                                ? 'bg-green-100 border border-green-300'
                                : 'bg-purple-100 border border-purple-300'
                              : isWeekend
                              ? 'bg-gray-50 border border-gray-200'
                              : 'bg-white border border-gray-200'
                          }`}
                        >
                          <div className="font-semibold text-gray-700">D{day}</div>
                          {hasLeave && (
                            <div className="text-xs mt-1">
                              {leave.leaveType === 'vac' ? '🏖️' :
                               leave.leaveType.startsWith('stat') ? '📅' : '🏥'}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const totalLeaveHours = leaves.reduce((sum, l) => sum + l.hours, 0);
  const staffWithLeave = new Set(leaves.map(l => l.staffNumber)).size;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Master Schedule</h1>
        <p className="text-gray-600">
          {scheduleMetadata.name} • {scheduleMetadata.totalDays} days
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500 mb-1">Total Staff</div>
          <div className="text-2xl font-bold text-gray-900">{staff.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500 mb-1">Staff with Leave</div>
          <div className="text-2xl font-bold text-gray-900">{staffWithLeave}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500 mb-1">Total Leave Hours</div>
          <div className="text-2xl font-bold text-gray-900">{totalLeaveHours}h</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500 mb-1">Schedule Period</div>
          <div className="text-2xl font-bold text-gray-900">{scheduleMetadata.totalDays} days</div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Filter by Staff:</label>
          <select
            value={selectedStaff || ''}
            onChange={(e) => setSelectedStaff(e.target.value ? parseInt(e.target.value) : null)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm"
          >
            <option value="">All Staff ({staff.length})</option>
            {staff.map((s) => (
              <option key={s.staffNumber} value={s.staffNumber}>
                #{s.staffNumber} {s.name}
              </option>
            ))}
          </select>
          {selectedStaff && (
            <button
              onClick={() => setSelectedStaff(null)}
              className="text-sm text-indigo-600 hover:text-indigo-700 underline"
            >
              Clear filter
            </button>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="text-sm font-medium text-gray-700 mb-2">Leave Types:</div>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-100 border border-blue-300 rounded"></div>
            <span>🏖️ Vacation</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-green-100 border border-green-300 rounded"></div>
            <span>📅 Stat Day</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-purple-100 border border-purple-300 rounded"></div>
            <span>🏥 Other Leave</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gray-50 border border-gray-200 rounded"></div>
            <span>Weekend</span>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div>
        {renderCalendar()}
      </div>
    </div>
  );
}
