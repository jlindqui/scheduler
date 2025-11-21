'use client';

import { staff, leaves, timeOffBanks, scheduleMetadata } from '@/app/lib/mock-schedule-data';

export default function AdminReportsPage() {
  // Calculate staffing metrics
  const totalFT = staff.filter(s => s.status === 'FT').length;
  const totalPT = staff.filter(s => s.status === 'PT').length;
  const totalFTE = staff.reduce((sum, s) => sum + s.fte, 0);

  // Calculate leave metrics
  const totalLeaveHours = leaves.reduce((sum, l) => sum + l.hours, 0);
  const vacationLeaves = leaves.filter(l => l.leaveType === 'vac');
  const statLeaves = leaves.filter(l => l.leaveType.startsWith('stat'));
  const otherLeaves = leaves.filter(l => l.leaveType !== 'vac' && !l.leaveType.startsWith('stat'));

  const totalVacationHours = vacationLeaves.reduce((sum, l) => sum + l.hours, 0);
  const totalStatHours = statLeaves.reduce((sum, l) => sum + l.hours, 0);
  const totalOtherHours = otherLeaves.reduce((sum, l) => sum + l.hours, 0);

  // Calculate bank metrics
  const totalBankHours = timeOffBanks.reduce((sum, b) => sum + b.balanceHours, 0);
  const averageBankBalance = Math.round(totalBankHours / staff.length);

  // Seniority distribution
  const seniorityRanges = [
    { label: '0-2 years', count: staff.filter(s => s.seniorityYears <= 2).length },
    { label: '3-5 years', count: staff.filter(s => s.seniorityYears >= 3 && s.seniorityYears <= 5).length },
    { label: '6-10 years', count: staff.filter(s => s.seniorityYears >= 6 && s.seniorityYears <= 10).length },
    { label: '10+ years', count: staff.filter(s => s.seniorityYears > 10).length },
  ];

  // Staff with leave
  const staffWithLeave = new Set(leaves.map(l => l.staffNumber)).size;
  const staffWithoutLeave = staff.length - staffWithLeave;

  // Availability distribution
  const dayShiftOnly = staff.filter(s => s.canWorkDayShift && !s.canWorkNightShift).length;
  const nightShiftOnly = staff.filter(s => !s.canWorkDayShift && s.canWorkNightShift).length;
  const bothShifts = staff.filter(s => s.canWorkDayShift && s.canWorkNightShift).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
        <p className="text-gray-600">
          Staffing metrics and insights for {scheduleMetadata.name}
        </p>
      </div>

      {/* Staffing Overview */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <h2 className="text-xl font-semibold text-gray-900">Staffing Overview</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-gray-500 mb-1">Total Staff</div>
              <div className="text-3xl font-bold text-gray-900">{staff.length}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Full-Time</div>
              <div className="text-3xl font-bold text-blue-600">{totalFT}</div>
              <div className="text-xs text-gray-600">{Math.round(totalFT / staff.length * 100)}%</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Part-Time</div>
              <div className="text-3xl font-bold text-indigo-600">{totalPT}</div>
              <div className="text-xs text-gray-600">{Math.round(totalPT / staff.length * 100)}%</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Total FTE</div>
              <div className="text-3xl font-bold text-purple-600">{totalFTE}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Leave Summary */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-yellow-50 to-orange-50">
          <h2 className="text-xl font-semibold text-gray-900">Leave Summary</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div>
              <div className="text-sm text-gray-500 mb-1">Total Leave Hours</div>
              <div className="text-3xl font-bold text-gray-900">{totalLeaveHours}h</div>
              <div className="text-xs text-gray-600">{leaves.length} requests</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Vacation</div>
              <div className="text-3xl font-bold text-blue-600">{totalVacationHours}h</div>
              <div className="text-xs text-gray-600">{vacationLeaves.length} requests</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Stat Days</div>
              <div className="text-3xl font-bold text-green-600">{totalStatHours}h</div>
              <div className="text-xs text-gray-600">{statLeaves.length} requests</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Other Leave</div>
              <div className="text-3xl font-bold text-purple-600">{totalOtherHours}h</div>
              <div className="text-xs text-gray-600">{otherLeaves.length} requests</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-blue-700 font-medium mb-2">Staff With Approved Leave</div>
              <div className="text-2xl font-bold text-blue-900">{staffWithLeave}</div>
              <div className="text-xs text-blue-700">{Math.round(staffWithLeave / staff.length * 100)}% of staff</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-700 font-medium mb-2">Staff Without Leave</div>
              <div className="text-2xl font-bold text-gray-900">{staffWithoutLeave}</div>
              <div className="text-xs text-gray-700">{Math.round(staffWithoutLeave / staff.length * 100)}% of staff</div>
            </div>
          </div>
        </div>
      </div>

      {/* Time Off Banks */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <h2 className="text-xl font-semibold text-gray-900">Time Off Banks</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-gray-500 mb-1">Total Bank Hours</div>
              <div className="text-3xl font-bold text-gray-900">{totalBankHours}h</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Average Per Staff</div>
              <div className="text-3xl font-bold text-green-600">{averageBankBalance}h</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Total Banks</div>
              <div className="text-3xl font-bold text-emerald-600">{timeOffBanks.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Seniority Distribution */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
          <h2 className="text-xl font-semibold text-gray-900">Seniority Distribution</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {seniorityRanges.map((range, idx) => {
              const percentage = Math.round(range.count / staff.length * 100);
              return (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{range.label}</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {range.count} staff ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Shift Availability */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50">
          <h2 className="text-xl font-semibold text-gray-900">Shift Availability</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-blue-700 font-medium mb-2">Day Shift Only</div>
              <div className="text-3xl font-bold text-blue-900">{dayShiftOnly}</div>
              <div className="text-xs text-blue-700">{Math.round(dayShiftOnly / staff.length * 100)}% of staff</div>
            </div>
            <div className="bg-indigo-50 rounded-lg p-4">
              <div className="text-sm text-indigo-700 font-medium mb-2">Night Shift Only</div>
              <div className="text-3xl font-bold text-indigo-900">{nightShiftOnly}</div>
              <div className="text-xs text-indigo-700">{Math.round(nightShiftOnly / staff.length * 100)}% of staff</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-purple-700 font-medium mb-2">Both Shifts</div>
              <div className="text-3xl font-bold text-purple-900">{bothShifts}</div>
              <div className="text-xs text-purple-700">{Math.round(bothShifts / staff.length * 100)}% of staff</div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-700">
              <strong>Scheduling Coverage:</strong> With {bothShifts} staff able to work both shifts,
              {dayShiftOnly + bothShifts} available for day shifts, and {nightShiftOnly + bothShifts} available
              for night shifts.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
