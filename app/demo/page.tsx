'use client';

import { upcomingShifts, timeOffBanks, currentStaffProfile } from '@/app/lib/mock-data';
import { formatSmartDateTime } from '@/app/lib/utils';

export default function DashboardPage() {
  const totalHoursThisWeek = upcomingShifts
    .filter((s) => {
      const shiftDate = new Date(s.shiftDate);
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      return shiftDate >= weekStart && shiftDate < weekEnd;
    })
    .reduce((acc, shift) => {
      const [startHour] = shift.startTime.split(':').map(Number);
      const [endHour] = shift.endTime.split(':').map(Number);
      return acc + (endHour - startHour);
    }, 0);

  const expiringBanks = timeOffBanks.filter((bank) => {
    if (!bank.expiryDate) return false;
    const daysUntilExpiry = Math.floor(
      (bank.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 60;
  });

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Dashboard</h1>
        <p className="text-gray-600">Welcome back, {currentStaffProfile.jobTitle}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-1">This Week</div>
          <div className="text-3xl font-bold text-gray-900 mb-2">{totalHoursThisWeek}h</div>
          <div className="text-sm text-gray-600">Scheduled hours</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-1">Upcoming Shifts</div>
          <div className="text-3xl font-bold text-gray-900 mb-2">{upcomingShifts.length}</div>
          <div className="text-sm text-gray-600">In next 14 days</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-1">Time Off Balance</div>
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {timeOffBanks.reduce((acc, bank) => acc + bank.balanceHours, 0)}h
          </div>
          <div className="text-sm text-yellow-600 font-medium">
            {expiringBanks.length} bank{expiringBanks.length !== 1 ? 's' : ''} expiring soon
          </div>
        </div>
      </div>

      {/* Alerts */}
      {expiringBanks.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Time Off Banks Expiring Soon
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc list-inside space-y-1">
                  {expiringBanks.map((bank) => {
                    const daysUntilExpiry = Math.floor(
                      (bank.expiryDate!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                    );
                    return (
                      <li key={bank.id}>
                        <strong>{bank.bankType}:</strong> {bank.balanceHours} hours expiring in{' '}
                        {daysUntilExpiry} days
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Shifts */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Upcoming Shifts</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {upcomingShifts.map((shift) => {
            const shiftDate = new Date(shift.shiftDate);
            const isToday = shiftDate.toDateString() === new Date().toDateString();
            const dayOfWeek = shiftDate.toLocaleDateString('en-US', { weekday: 'long' });
            const dateStr = shiftDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            });

            return (
              <div key={shift.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {isToday && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Today
                        </span>
                      )}
                      <span className="text-lg font-semibold text-gray-900">
                        {dayOfWeek}, {dateStr}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <span className="mr-1">⏰</span>
                        {shift.startTime} - {shift.endTime}
                      </div>
                      <div className="flex items-center">
                        <span className="mr-1">🏥</span>
                        {shift.location}
                      </div>
                      <div className="flex items-center">
                        <span className="mr-1">☀️</span>
                        {shift.shiftType}
                      </div>
                    </div>
                    {shift.notes && (
                      <div className="mt-2 text-sm text-gray-500">
                        <span className="mr-1">📝</span>
                        {shift.notes}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        shift.assignment.status === 'CONFIRMED'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {shift.assignment.status}
                    </span>
                    {shift.assignment.triggersPremium && (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                        💰 Premium Pay
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <a href="/demo/agent" className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-lg p-6 hover:shadow-xl transition-all text-left group">
          <div className="text-3xl mb-3">🤖</div>
          <div className="text-lg font-semibold mb-1">
            AI Agent (LIVE)
          </div>
          <div className="text-sm text-blue-100">
            Real LLM-powered scheduling assistant
          </div>
          <div className="mt-3 text-xs bg-white/20 rounded px-2 py-1 inline-block">
            ⚡ Uses Claude API
          </div>
        </a>

        <a href="/demo/schedule" className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-md transition-all text-left group">
          <div className="text-3xl mb-3">📅</div>
          <div className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600">
            Master Schedule
          </div>
          <div className="text-sm text-gray-600">
            View the 6-week schedule with all leaves
          </div>
        </a>

        <a href="/demo/swap" className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-md transition-all text-left group">
          <div className="text-3xl mb-3">🔄</div>
          <div className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600">
            Request Shift Swap
          </div>
          <div className="text-sm text-gray-600">
            Find compatible co-workers to swap shifts
          </div>
        </a>

        <a href="/demo/timeoff" className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-md transition-all text-left group">
          <div className="text-3xl mb-3">📋</div>
          <div className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600">
            Time Off Banks
          </div>
          <div className="text-sm text-gray-600">
            Manage your time off and requests
          </div>
        </a>
      </div>
    </div>
  );
}
