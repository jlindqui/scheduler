'use client';

import Link from 'next/link';
import { staff, leaves, timeOffBanks, getDateForDay, getLeavesForStaff, getBanksForStaff, getExpiringBanks, getDaysUntilExpiry } from '@/app/lib/mock-schedule-data';

const STAFF_NUMBER = 1; // Alex Thompson

export default function StaffDashboard() {
  const currentStaff = staff.find(s => s.staffNumber === STAFF_NUMBER)!;
  const myLeaves = getLeavesForStaff(STAFF_NUMBER);
  const myBanks = getBanksForStaff(STAFF_NUMBER);
  const expiringBanks = getExpiringBanks(STAFF_NUMBER, 60);

  const totalBankHours = myBanks.reduce((sum, b) => sum + b.balanceHours, 0);
  const upcomingLeaves = myLeaves.filter(l => l.startDay >= 1);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {currentStaff.name}
        </h1>
        <p className="text-gray-600">
          {currentStaff.status === 'FT' ? 'Full-Time' : 'Part-Time'} RN • {currentStaff.seniorityYears} years seniority
        </p>
      </div>

      {/* Alerts */}
      {expiringBanks.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-6 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800 mb-2">
                Time Off Banks Expiring Soon
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
                {expiringBanks.map((bank, idx) => (
                  <li key={idx}>
                    <strong>{bank.bankType}:</strong> {bank.balanceHours} hours expiring in{' '}
                    {getDaysUntilExpiry(bank)} days
                  </li>
                ))}
              </ul>
              <Link
                href="/staff/chat"
                className="mt-3 inline-block text-sm font-semibold text-yellow-800 hover:text-yellow-900 underline"
              >
                Talk to AI Assistant about using these hours →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500 mb-1">Total Time Off</div>
              <div className="text-3xl font-bold text-gray-900">{totalBankHours}h</div>
              <div className="text-sm text-gray-600 mt-1">Across {myBanks.length} banks</div>
            </div>
            <div className="text-4xl">💰</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500 mb-1">Upcoming Leaves</div>
              <div className="text-3xl font-bold text-gray-900">{upcomingLeaves.length}</div>
              <div className="text-sm text-gray-600 mt-1">
                {upcomingLeaves.reduce((sum, l) => sum + l.hours, 0)} total hours
              </div>
            </div>
            <div className="text-4xl">🏖️</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500 mb-1">Employment Status</div>
              <div className="text-3xl font-bold text-gray-900">{currentStaff.status}</div>
              <div className="text-sm text-gray-600 mt-1">{currentStaff.fte} FTE</div>
            </div>
            <div className="text-4xl">👤</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/staff/chat"
            className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-lg p-6 hover:shadow-xl transition-all group"
          >
            <div className="text-3xl mb-3">🤖</div>
            <div className="text-lg font-semibold mb-1">AI Assistant</div>
            <div className="text-sm text-blue-100">
              Get help with availability, time off, and swaps
            </div>
            <div className="mt-3 text-xs bg-white/20 rounded px-2 py-1 inline-block">
              ⚡ Powered by Claude
            </div>
          </Link>

          <Link
            href="/staff/schedule"
            className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-md transition-all group"
          >
            <div className="text-3xl mb-3">📅</div>
            <div className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600">
              View My Schedule
            </div>
            <div className="text-sm text-gray-600">
              See your shifts and approved time off
            </div>
          </Link>

          <Link
            href="/staff/swaps"
            className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-md transition-all group"
          >
            <div className="text-3xl mb-3">🔄</div>
            <div className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600">
              Request Shift Swap
            </div>
            <div className="text-sm text-gray-600">
              Find co-workers to trade shifts with
            </div>
          </Link>
        </div>
      </div>

      {/* My Upcoming Leaves */}
      {upcomingLeaves.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">My Upcoming Time Off</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {upcomingLeaves.map((leave, idx) => {
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
                        {days} day{days > 1 ? 's' : ''} • {leave.hours} hours
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
        </div>
      )}
    </div>
  );
}
