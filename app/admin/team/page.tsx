'use client';

import { staff, leaves, timeOffBanks, getLeavesForStaff, getBanksForStaff } from '@/app/lib/mock-schedule-data';
import { useState } from 'react';

export default function AdminTeamPage() {
  const [selectedStaff, setSelectedStaff] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'number' | 'name' | 'seniority'>('number');

  const sortedStaff = [...staff].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'seniority':
        return b.seniorityYears - a.seniorityYears;
      case 'number':
      default:
        return a.staffNumber - b.staffNumber;
    }
  });

  const totalFT = staff.filter(s => s.status === 'FT').length;
  const totalPT = staff.filter(s => s.status === 'PT').length;
  const avgSeniority = Math.round(staff.reduce((sum, s) => sum + s.seniorityYears, 0) / staff.length * 10) / 10;
  const totalFTE = staff.reduce((sum, s) => sum + s.fte, 0);

  const selectedStaffMember = selectedStaff ? staff.find(s => s.staffNumber === selectedStaff) : null;
  const selectedStaffLeaves = selectedStaffMember ? getLeavesForStaff(selectedStaffMember.staffNumber) : [];
  const selectedStaffBanks = selectedStaffMember ? getBanksForStaff(selectedStaffMember.staffNumber) : [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Team Overview</h1>
        <p className="text-gray-600">
          View staff profiles, skills, and seniority
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500 mb-1">Total Staff</div>
          <div className="text-2xl font-bold text-gray-900">{staff.length}</div>
          <div className="text-xs text-gray-600 mt-1">{totalFTE} FTE</div>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-4 border border-blue-200">
          <div className="text-sm text-blue-700 font-medium mb-1">Full-Time</div>
          <div className="text-2xl font-bold text-blue-900">{totalFT}</div>
          <div className="text-xs text-blue-700 mt-1">{Math.round(totalFT / staff.length * 100)}%</div>
        </div>
        <div className="bg-indigo-50 rounded-lg shadow p-4 border border-indigo-200">
          <div className="text-sm text-indigo-700 font-medium mb-1">Part-Time</div>
          <div className="text-2xl font-bold text-indigo-900">{totalPT}</div>
          <div className="text-xs text-indigo-700 mt-1">{Math.round(totalPT / staff.length * 100)}%</div>
        </div>
        <div className="bg-purple-50 rounded-lg shadow p-4 border border-purple-200">
          <div className="text-sm text-purple-700 font-medium mb-1">Avg Seniority</div>
          <div className="text-2xl font-bold text-purple-900">{avgSeniority}y</div>
          <div className="text-xs text-purple-700 mt-1">Years of service</div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'number' | 'name' | 'seniority')}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm"
          >
            <option value="number">Staff Number</option>
            <option value="name">Name (A-Z)</option>
            <option value="seniority">Seniority (High to Low)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Staff List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Staff Roster</h2>
          </div>
          <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
            {sortedStaff.map((staffMember) => {
              const staffLeaves = getLeavesForStaff(staffMember.staffNumber);
              const totalLeaveHours = staffLeaves.reduce((sum, l) => sum + l.hours, 0);

              return (
                <div
                  key={staffMember.staffNumber}
                  className={`px-6 py-4 cursor-pointer transition-colors ${
                    selectedStaff === staffMember.staffNumber
                      ? 'bg-indigo-50 border-l-4 border-indigo-600'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedStaff(staffMember.staffNumber)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">
                          #{staffMember.staffNumber} {staffMember.name}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          staffMember.status === 'FT'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {staffMember.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {staffMember.skill} • {staffMember.seniorityYears}y seniority • {staffMember.fte} FTE
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {staffMember.canWorkDayShift && staffMember.canWorkNightShift && 'Day & Night shifts'}
                        {staffMember.canWorkDayShift && !staffMember.canWorkNightShift && 'Day shift only'}
                        {!staffMember.canWorkDayShift && staffMember.canWorkNightShift && 'Night shift only'}
                      </div>
                    </div>
                    {totalLeaveHours > 0 && (
                      <div className="text-sm text-gray-600">
                        {totalLeaveHours}h leave
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Staff Detail Panel */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Staff Details</h2>
          </div>
          {selectedStaffMember ? (
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {selectedStaffMember.name}
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Staff Number</div>
                    <div className="font-semibold text-gray-900">#{selectedStaffMember.staffNumber}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Employment Status</div>
                    <div className="font-semibold text-gray-900">{selectedStaffMember.status}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">FTE</div>
                    <div className="font-semibold text-gray-900">{selectedStaffMember.fte}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Seniority</div>
                    <div className="font-semibold text-gray-900">{selectedStaffMember.seniorityYears} years</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Skill/License</div>
                    <div className="font-semibold text-gray-900">{selectedStaffMember.skill}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Shift Availability</div>
                    <div className="font-semibold text-gray-900">
                      {selectedStaffMember.canWorkDayShift && selectedStaffMember.canWorkNightShift && 'Both'}
                      {selectedStaffMember.canWorkDayShift && !selectedStaffMember.canWorkNightShift && 'Day only'}
                      {!selectedStaffMember.canWorkDayShift && selectedStaffMember.canWorkNightShift && 'Night only'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Time Off Banks */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Time Off Banks</h4>
                {selectedStaffBanks.length > 0 ? (
                  <div className="space-y-2">
                    {selectedStaffBanks.map((bank, idx) => (
                      <div key={idx} className="bg-gray-50 rounded p-3 border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{bank.bankType}</div>
                            <div className="text-xs text-gray-500">
                              Expires: {bank.expiryDate.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
                          </div>
                          <div className="text-lg font-bold text-indigo-600">
                            {bank.balanceHours}h
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No time off banks</div>
                )}
              </div>

              {/* Approved Leaves */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Approved Leaves</h4>
                {selectedStaffLeaves.length > 0 ? (
                  <div className="space-y-2">
                    {selectedStaffLeaves.map((leave, idx) => {
                      const days = leave.endDay - leave.startDay + 1;
                      return (
                        <div key={idx} className="bg-blue-50 rounded p-3 border border-blue-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900">
                                Days {leave.startDay}-{leave.endDay}
                              </div>
                              <div className="text-xs text-gray-600">
                                {days} day{days > 1 ? 's' : ''} • {leave.leaveType}
                              </div>
                            </div>
                            <div className="text-lg font-bold text-blue-600">
                              {leave.hours}h
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No approved leaves</div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <div className="text-4xl mb-3">👤</div>
              <div>Select a staff member to view details</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
