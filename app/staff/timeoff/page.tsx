'use client';

import { getLeavesForStaff, getBanksForStaff, getDateForDay, getExpiringBanks, getDaysUntilExpiry } from '@/app/lib/mock-schedule-data';
import Link from 'next/link';

const STAFF_NUMBER = 1; // Alex Thompson

export default function StaffTimeOffPage() {
  const myLeaves = getLeavesForStaff(STAFF_NUMBER);
  const myBanks = getBanksForStaff(STAFF_NUMBER);
  const expiringBanks = getExpiringBanks(STAFF_NUMBER, 60);

  const totalBankHours = myBanks.reduce((sum, b) => sum + b.balanceHours, 0);
  const totalLeaveHours = myLeaves.reduce((sum, l) => sum + l.hours, 0);
  const remainingHours = totalBankHours - totalLeaveHours;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Time Off</h1>
        <p className="text-gray-600">
          Manage your time off banks and requests
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
                Ask AI Assistant for recommendations →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-1">Total Available</div>
          <div className="text-3xl font-bold text-gray-900">{totalBankHours}h</div>
          <div className="text-xs text-gray-600 mt-1">Across {myBanks.length} banks</div>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-6 border border-blue-200">
          <div className="text-sm text-blue-700 font-medium mb-1">Already Scheduled</div>
          <div className="text-3xl font-bold text-blue-900">{totalLeaveHours}h</div>
          <div className="text-xs text-blue-700 mt-1">{myLeaves.length} approved requests</div>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-6 border border-green-200">
          <div className="text-sm text-green-700 font-medium mb-1">Remaining Balance</div>
          <div className="text-3xl font-bold text-green-900">{remainingHours}h</div>
          <div className="text-xs text-green-700 mt-1">Available to request</div>
        </div>
      </div>

      {/* Time Off Banks */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">My Time Off Banks</h2>
          <Link
            href="/staff/chat"
            className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
          >
            Ask AI which bank to use →
          </Link>
        </div>
        <div className="divide-y divide-gray-200">
          {myBanks.map((bank, idx) => {
            const daysUntilExpiry = getDaysUntilExpiry(bank);
            const isExpiringSoon = daysUntilExpiry <= 60;

            return (
              <div key={idx} className={`px-6 py-4 ${isExpiringSoon ? 'bg-yellow-50' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-semibold text-gray-900 text-lg">{bank.bankType}</span>
                      {isExpiringSoon && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-200 text-yellow-900">
                          ⚠️ Expiring Soon
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      Expires: {bank.expiryDate.toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })} ({daysUntilExpiry} days)
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-blue-600">{bank.balanceHours}h</div>
                    <div className="text-xs text-gray-500 mt-1">Available</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Approved Leaves */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
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
                      <div className="font-semibold text-gray-900 mb-1">
                        {startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} -{' '}
                        {endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div className="text-sm text-gray-600">
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
                      <span className="text-lg font-bold text-gray-900">{leave.hours}h</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-12 text-center text-gray-500">
            <div className="text-4xl mb-3">🏖️</div>
            <div className="mb-2">No approved time off scheduled yet</div>
            <Link
              href="/staff/chat"
              className="text-sm text-blue-600 hover:text-blue-700 font-semibold underline"
            >
              Request time off with AI Assistant →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
