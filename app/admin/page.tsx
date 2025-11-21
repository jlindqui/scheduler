'use client';

import Link from 'next/link';
import { staff, leaves, scheduleMetadata, getScheduleSummary } from '@/app/lib/mock-schedule-data';

export default function AdminDashboard() {
  const summary = getScheduleSummary();

  // Calculate staffing metrics
  const totalLeaveHours = leaves.reduce((sum, l) => sum + l.hours, 0);
  const criticalLeave = leaves.find(l => l.leaveType === 'leave1'); // Staff #12's long leave
  const pendingItems = 0; // In real app, would query pending requests

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Manager Dashboard
        </h1>
        <p className="text-gray-600">
          Emergency Department • {scheduleMetadata.name}
        </p>
      </div>

      {/* Critical Alerts */}
      {criticalLeave && (
        <div className="bg-red-50 border-l-4 border-red-400 p-6 mb-6 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-2xl">🚨</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 mb-2">
                Critical Staffing Alert
              </h3>
              <p className="text-sm text-red-700">
                <strong>Staff #12 (Logan Rivera)</strong> is on extended leave for 18 days (216 hours).
                This creates significant night shift coverage gaps.
              </p>
              <Link
                href="/admin/master-schedule"
                className="mt-3 inline-block text-sm font-semibold text-red-800 hover:text-red-900 underline"
              >
                View Master Schedule →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500 mb-1">Total Staff</div>
              <div className="text-3xl font-bold text-gray-900">{summary.totalStaff}</div>
              <div className="text-sm text-gray-600 mt-1">
                {summary.fullTimeStaff} FT, {summary.partTimeStaff} PT
              </div>
            </div>
            <div className="text-4xl">👥</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500 mb-1">Approved Leaves</div>
              <div className="text-3xl font-bold text-gray-900">{summary.totalLeaveRequests}</div>
              <div className="text-sm text-gray-600 mt-1">
                {totalLeaveHours} total hours
              </div>
            </div>
            <div className="text-4xl">🏖️</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500 mb-1">Pending Requests</div>
              <div className="text-3xl font-bold text-gray-900">{pendingItems}</div>
              <div className="text-sm text-gray-600 mt-1">
                Swaps & Time Off
              </div>
            </div>
            <div className="text-4xl">📋</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500 mb-1">Schedule Status</div>
              <div className="text-2xl font-bold text-green-600">Published</div>
              <div className="text-sm text-gray-600 mt-1">
                {summary.schedulePeriod}
              </div>
            </div>
            <div className="text-4xl">✅</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/master-schedule"
            className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-lg p-6 hover:shadow-xl transition-all group"
          >
            <div className="text-3xl mb-3">📅</div>
            <div className="text-lg font-semibold mb-1">View Master Schedule</div>
            <div className="text-sm text-blue-100">
              See all staff schedules and leave overlays
            </div>
          </Link>

          <Link
            href="/admin/requests"
            className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-indigo-500 hover:shadow-md transition-all group"
          >
            <div className="text-3xl mb-3">📋</div>
            <div className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-indigo-600">
              Review Requests
            </div>
            <div className="text-sm text-gray-600">
              Approve or deny time off and swap requests
            </div>
          </Link>

          <Link
            href="/admin/team"
            className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-indigo-500 hover:shadow-md transition-all group"
          >
            <div className="text-3xl mb-3">👥</div>
            <div className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-indigo-600">
              Team Overview
            </div>
            <div className="text-sm text-gray-600">
              View staff profiles, skills, and seniority
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Leave Requests */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Recent Approved Leaves</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {leaves.slice(0, 5).map((leave, idx) => {
            const staffMember = staff.find(s => s.staffNumber === leave.staffNumber);
            const days = leave.endDay - leave.startDay + 1;

            return (
              <div key={idx} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{staffMember?.name}</div>
                    <div className="text-sm text-gray-600 mt-1">
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
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      ✅ Approved
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <Link
            href="/admin/requests"
            className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold"
          >
            View all requests →
          </Link>
        </div>
      </div>

      {/* Staffing Overview */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Staffing Requirements</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-blue-600 font-medium mb-2">Day Shift (0700-1900)</div>
            <div className="text-2xl font-bold text-blue-900">4 RNs</div>
            <div className="text-sm text-blue-700 mt-1">per shift</div>
          </div>
          <div className="bg-indigo-50 rounded-lg p-4">
            <div className="text-sm text-indigo-600 font-medium mb-2">Night Shift (1900-0700)</div>
            <div className="text-2xl font-bold text-indigo-900">4 RNs</div>
            <div className="text-sm text-indigo-700 mt-1">per shift</div>
          </div>
        </div>
      </div>
    </div>
  );
}
