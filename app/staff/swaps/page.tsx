'use client';

import { staff, scheduleMetadata, getDateForDay } from '@/app/lib/mock-schedule-data';
import { useState } from 'react';
import Link from 'next/link';

const STAFF_NUMBER = 1; // Alex Thompson

interface SwapRequest {
  id: number;
  staffNumber: number;
  targetStaffNumber: number | null;
  day: number;
  shiftType: 'day' | 'night';
  status: 'pending' | 'approved' | 'denied' | 'searching';
  createdDate: Date;
  reason?: string;
}

export default function StaffSwapsPage() {
  const currentStaff = staff.find(s => s.staffNumber === STAFF_NUMBER)!;

  // Mock swap requests - in real app would come from database
  const [swapRequests] = useState<SwapRequest[]>([
    {
      id: 1,
      staffNumber: STAFF_NUMBER,
      targetStaffNumber: 5,
      day: 15,
      shiftType: 'night',
      status: 'pending',
      createdDate: new Date(2025, 0, 20),
      reason: 'Family appointment',
    },
    {
      id: 2,
      staffNumber: STAFF_NUMBER,
      targetStaffNumber: null,
      day: 28,
      shiftType: 'day',
      status: 'searching',
      createdDate: new Date(2025, 0, 22),
      reason: 'Personal commitment',
    },
  ]);

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedShift, setSelectedShift] = useState<'day' | 'night'>('day');
  const [showNewRequestForm, setShowNewRequestForm] = useState(false);

  // Find compatible staff for swaps (same skill, can work the shift type)
  const compatibleStaff = staff.filter(s =>
    s.staffNumber !== STAFF_NUMBER &&
    s.skill === currentStaff.skill &&
    (selectedShift === 'day' ? s.canWorkDayShift : s.canWorkNightShift)
  );

  const pendingSwaps = swapRequests.filter(r => r.status === 'pending' || r.status === 'searching');
  const completedSwaps = swapRequests.filter(r => r.status === 'approved' || r.status === 'denied');

  const getStatusBadge = (status: SwapRequest['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'denied':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'searching':
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Shift Swaps</h1>
        <p className="text-gray-600">
          Request shift swaps with compatible co-workers
        </p>
      </div>

      {/* AI Assistant Suggestion */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-6 mb-6 rounded-lg">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-2xl">🤖</span>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              Need help finding a swap partner?
            </h3>
            <p className="text-sm text-blue-700 mb-3">
              The AI Assistant can help you find compatible co-workers for shift swaps and ensure CBA compliance.
            </p>
            <Link
              href="/staff/chat"
              className="inline-block text-sm font-semibold text-blue-800 hover:text-blue-900 underline"
            >
              Ask AI Assistant for help →
            </Link>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-1">Total Requests</div>
          <div className="text-3xl font-bold text-gray-900">{swapRequests.length}</div>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow p-6 border border-yellow-200">
          <div className="text-sm text-yellow-700 font-medium mb-1">Pending</div>
          <div className="text-3xl font-bold text-yellow-900">{pendingSwaps.length}</div>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-6 border border-green-200">
          <div className="text-sm text-green-700 font-medium mb-1">Completed</div>
          <div className="text-3xl font-bold text-green-900">{completedSwaps.length}</div>
        </div>
      </div>

      {/* New Request Button */}
      {!showNewRequestForm && (
        <div className="mb-6">
          <button
            onClick={() => setShowNewRequestForm(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            + Request New Shift Swap
          </button>
        </div>
      )}

      {/* New Request Form */}
      {showNewRequestForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6 border-2 border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Request Shift Swap</h2>
            <button
              onClick={() => setShowNewRequestForm(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Which day do you want to swap?
              </label>
              <select
                value={selectedDay || ''}
                onChange={(e) => setSelectedDay(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">Select a day...</option>
                {Array.from({ length: scheduleMetadata.totalDays }, (_, i) => i + 1).map(day => {
                  const date = getDateForDay(day);
                  return (
                    <option key={day} value={day}>
                      Day {day} - {date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        weekday: 'short'
                      })}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shift Type
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="day"
                    checked={selectedShift === 'day'}
                    onChange={(e) => setSelectedShift(e.target.value as 'day' | 'night')}
                    className="mr-2"
                  />
                  Day Shift (0700-1900)
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="night"
                    checked={selectedShift === 'night'}
                    onChange={(e) => setSelectedShift(e.target.value as 'day' | 'night')}
                    className="mr-2"
                  />
                  Night Shift (1900-0700)
                </label>
              </div>
            </div>

            {selectedDay && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Family appointment, personal commitment"
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Compatible Staff ({compatibleStaff.length} available)
                  </label>
                  <select className="w-full border border-gray-300 rounded px-3 py-2">
                    <option value="">Let manager find swap partner</option>
                    {compatibleStaff.map(s => (
                      <option key={s.staffNumber} value={s.staffNumber}>
                        #{s.staffNumber} {s.name} ({s.status}, {s.seniorityYears}y)
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Only showing staff with {currentStaff.skill} certification who can work {selectedShift} shifts
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      alert('Swap request would be submitted here');
                      setShowNewRequestForm(false);
                    }}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Submit Request
                  </button>
                  <button
                    onClick={() => setShowNewRequestForm(false)}
                    className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Pending Requests */}
      {pendingSwaps.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-xl font-semibold text-gray-900">Pending Requests</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {pendingSwaps.map((swap) => {
              const date = getDateForDay(swap.day);
              const targetStaff = swap.targetStaffNumber ? staff.find(s => s.staffNumber === swap.targetStaffNumber) : null;

              return (
                <div key={swap.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-gray-900">
                          Day {swap.day} - {swap.shiftType === 'day' ? 'Day Shift' : 'Night Shift'}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(swap.status)}`}>
                          {swap.status === 'searching' ? '🔍 Finding Partner' : '⏳ Pending Approval'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mb-1">
                        {date.toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                      {targetStaff && (
                        <div className="text-sm text-gray-700 mb-1">
                          Swap with: <strong>#{targetStaff.staffNumber} {targetStaff.name}</strong>
                        </div>
                      )}
                      {swap.reason && (
                        <div className="text-sm text-gray-600 italic">
                          Reason: {swap.reason}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-2">
                        Submitted: {swap.createdDate.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                    <button
                      className="px-4 py-2 bg-red-100 text-red-700 text-sm font-medium rounded hover:bg-red-200 transition-colors"
                      onClick={() => alert('Cancel request functionality would be implemented here')}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Requests */}
      {completedSwaps.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-xl font-semibold text-gray-900">Completed Requests</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {completedSwaps.map((swap) => {
              const date = getDateForDay(swap.day);
              const targetStaff = swap.targetStaffNumber ? staff.find(s => s.staffNumber === swap.targetStaffNumber) : null;

              return (
                <div key={swap.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-gray-900">
                          Day {swap.day} - {swap.shiftType === 'day' ? 'Day Shift' : 'Night Shift'}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(swap.status)}`}>
                          {swap.status === 'approved' ? '✅ Approved' : '❌ Denied'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mb-1">
                        {date.toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                      {targetStaff && (
                        <div className="text-sm text-gray-700">
                          Swap with: <strong>#{targetStaff.staffNumber} {targetStaff.name}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {swapRequests.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-4xl mb-3">🔄</div>
          <div className="text-gray-600 mb-4">No shift swap requests yet</div>
          <button
            onClick={() => setShowNewRequestForm(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Request Your First Swap
          </button>
        </div>
      )}
    </div>
  );
}
