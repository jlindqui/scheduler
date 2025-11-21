'use client';

import { useState } from 'react';
import { timeOffBanks } from '@/app/lib/mock-data';

export default function TimeOffPage() {
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedBank, setSelectedBank] = useState<string | null>(null);

  const totalBalance = timeOffBanks.reduce((acc, bank) => acc + bank.balanceHours, 0);

  const getDaysUntilExpiry = (expiryDate: Date | null) => {
    if (!expiryDate) return null;
    return Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Time Off Banks</h1>
        <p className="text-gray-600">
          Manage your time off balances and submit requests
        </p>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg p-6 text-white mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-blue-100 mb-1">Total Balance</div>
            <div className="text-4xl font-bold">{totalBalance} hours</div>
            <div className="text-sm text-blue-100 mt-2">
              Across {timeOffBanks.length} time off banks
            </div>
          </div>
          <button
            onClick={() => setShowRequestForm(true)}
            className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            Request Time Off
          </button>
        </div>
      </div>

      {/* Time Off Banks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {timeOffBanks.map((bank) => {
          const daysUntilExpiry = getDaysUntilExpiry(bank.expiryDate);
          const isExpiring = daysUntilExpiry !== null && daysUntilExpiry <= 60;

          return (
            <div
              key={bank.id}
              className={`bg-white rounded-lg shadow-lg overflow-hidden ${
                isExpiring ? 'ring-2 ring-yellow-400' : ''
              }`}
            >
              <div
                className={`px-6 py-4 ${
                  isExpiring
                    ? 'bg-yellow-50 border-b-2 border-yellow-400'
                    : 'bg-gray-50 border-b border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {bank.bankType.replace(/_/g, ' ')}
                  </h3>
                  {isExpiring && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-200 text-yellow-800">
                      ⚠️ Expiring Soon
                    </span>
                  )}
                </div>
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {bank.balanceHours}
                    <span className="text-lg text-gray-500 ml-1">hours</span>
                  </div>
                  {bank.accrualRate && (
                    <div className="text-sm text-gray-600">
                      Accruing {bank.accrualRate}h/month
                    </div>
                  )}
                </div>

                {bank.expiryDate && (
                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-700 mb-1">Expires:</div>
                    <div className={`text-sm ${isExpiring ? 'text-yellow-700 font-semibold' : 'text-gray-600'}`}>
                      {bank.expiryDate.toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                      {daysUntilExpiry !== null && (
                        <span className="ml-2">({daysUntilExpiry} days)</span>
                      )}
                    </div>
                  </div>
                )}

                {bank.yearGranted && (
                  <div className="text-sm text-gray-600 mb-4">
                    Year Granted: {bank.yearGranted}
                  </div>
                )}

                {bank.notes && (
                  <div className="text-sm text-gray-600 bg-gray-50 rounded p-3">
                    📝 {bank.notes}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Recommendations */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-lg mb-8">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-2xl">🤖</span>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800 mb-2">AI Recommendation</h3>
            <p className="text-sm text-blue-700 mb-3">
              Your <strong>Stat Day</strong> bank has 24 hours expiring in 30 days. Consider using
              these hours for upcoming time off requests to avoid losing them.
            </p>
            <p className="text-sm text-blue-700">
              You can save your <strong>Vacation</strong> hours (120 hours available) for later
              since they don't expire this year.
            </p>
          </div>
        </div>
      </div>

      {/* Request Form Modal */}
      {showRequestForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Request Time Off</h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Bank Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Time Off Bank
                </label>
                <div className="space-y-2">
                  {timeOffBanks.map((bank) => {
                    const daysUntilExpiry = getDaysUntilExpiry(bank.expiryDate);
                    const isExpiring = daysUntilExpiry !== null && daysUntilExpiry <= 60;

                    return (
                      <label
                        key={bank.id}
                        className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                          selectedBank === bank.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        } ${isExpiring ? 'ring-2 ring-yellow-400' : ''}`}
                      >
                        <div className="flex items-center flex-1">
                          <input
                            type="radio"
                            name="bank"
                            value={bank.id}
                            checked={selectedBank === bank.id}
                            onChange={(e) => setSelectedBank(e.target.value)}
                            className="mr-3"
                          />
                          <div>
                            <div className="font-semibold text-gray-900">
                              {bank.bankType.replace(/_/g, ' ')}
                            </div>
                            <div className="text-sm text-gray-600">
                              {bank.balanceHours} hours available
                            </div>
                          </div>
                        </div>
                        {isExpiring && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-200 text-yellow-800">
                            Expires in {daysUntilExpiry}d
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (Optional)
                </label>
                <textarea
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Family vacation, personal matters, etc."
                />
              </div>

              {/* CBA Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <span className="text-lg mr-2">ℹ️</span>
                  <div className="text-sm text-blue-800">
                    <strong>CBA Rule:</strong> Time off requests for vacation periods require the
                    weekend before to also be off. This will be automatically checked when you submit.
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRequestForm(false);
                  setSelectedBank(null);
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={!selectedBank}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Requests */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Recent Requests</h2>
        </div>
        <div className="p-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-semibold text-gray-900">Family Vacation</div>
                <div className="text-sm text-gray-600">
                  January 15-21, 2025 (56 hours from Vacation bank)
                </div>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                ✅ Approved
              </span>
            </div>
            <div className="text-sm text-gray-500">
              Approved by Sarah Johnson on November 1, 2024
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
