'use client';

import { staff, leaves, getDateForDay } from '@/app/lib/mock-schedule-data';
import { useState } from 'react';

type RequestStatus = 'pending' | 'approved' | 'denied';
type RequestType = 'timeoff' | 'swap';

interface Request {
  id: number;
  staffNumber: number;
  type: RequestType;
  status: RequestStatus;
  submittedDate: Date;
  details: string;
  startDay?: number;
  endDay?: number;
  hours?: number;
  bankType?: string;
}

export default function AdminRequestsPage() {
  // Mock requests - in real app would come from database
  const [requests] = useState<Request[]>([
    // All existing leaves are already approved
    ...leaves.map((leave, idx) => ({
      id: idx + 1,
      staffNumber: leave.staffNumber,
      type: 'timeoff' as RequestType,
      status: 'approved' as RequestStatus,
      submittedDate: new Date(2025, 0, Math.floor(Math.random() * 15) + 1),
      details: `${leave.leaveType === 'vac' ? 'Vacation' : leave.leaveType.startsWith('stat') ? 'Stat Day' : 'Personal Leave'}`,
      startDay: leave.startDay,
      endDay: leave.endDay,
      hours: leave.hours,
      bankType: leave.leaveType,
    })),
    // Add some pending requests for demo
    {
      id: 100,
      staffNumber: 5,
      type: 'swap' as RequestType,
      status: 'pending' as RequestStatus,
      submittedDate: new Date(2025, 0, 20),
      details: 'Requesting to swap Day 15 night shift with Staff #8',
    },
    {
      id: 101,
      staffNumber: 11,
      type: 'timeoff' as RequestType,
      status: 'pending' as RequestStatus,
      submittedDate: new Date(2025, 0, 22),
      details: 'Vacation request',
      startDay: 30,
      endDay: 35,
      hours: 72,
      bankType: 'vac',
    },
  ]);

  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('pending');
  const [typeFilter, setTypeFilter] = useState<RequestType | 'all'>('all');

  const filteredRequests = requests.filter((req) => {
    if (statusFilter !== 'all' && req.status !== statusFilter) return false;
    if (typeFilter !== 'all' && req.type !== typeFilter) return false;
    return true;
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const deniedCount = requests.filter(r => r.status === 'denied').length;

  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'denied':
        return 'bg-red-100 text-red-800 border-red-300';
    }
  };

  const getTypeBadge = (type: RequestType) => {
    return type === 'timeoff'
      ? 'bg-blue-100 text-blue-800'
      : 'bg-purple-100 text-purple-800';
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Staff Requests</h1>
        <p className="text-gray-600">
          Manage time off and shift swap requests
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500 mb-1">Total Requests</div>
          <div className="text-2xl font-bold text-gray-900">{requests.length}</div>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow p-4 border border-yellow-200">
          <div className="text-sm text-yellow-700 font-medium mb-1">Pending</div>
          <div className="text-2xl font-bold text-yellow-900">{pendingCount}</div>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4 border border-green-200">
          <div className="text-sm text-green-700 font-medium mb-1">Approved</div>
          <div className="text-2xl font-bold text-green-900">{approvedCount}</div>
        </div>
        <div className="bg-red-50 rounded-lg shadow p-4 border border-red-200">
          <div className="text-sm text-red-700 font-medium mb-1">Denied</div>
          <div className="text-2xl font-bold text-red-900">{deniedCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as RequestStatus | 'all')}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm"
            >
              <option value="all">All</option>
              <option value="pending">Pending ({pendingCount})</option>
              <option value="approved">Approved ({approvedCount})</option>
              <option value="denied">Denied ({deniedCount})</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Type:</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as RequestType | 'all')}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm"
            >
              <option value="all">All Types</option>
              <option value="timeoff">Time Off</option>
              <option value="swap">Shift Swaps</option>
            </select>
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">
            {filteredRequests.length} Request{filteredRequests.length !== 1 ? 's' : ''}
          </h2>
        </div>
        {filteredRequests.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {filteredRequests
              .sort((a, b) => b.submittedDate.getTime() - a.submittedDate.getTime())
              .map((request) => {
                const staffMember = staff.find(s => s.staffNumber === request.staffNumber);

                return (
                  <div key={request.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold text-gray-900">
                            #{request.staffNumber} {staffMember?.name}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeBadge(request.type)}`}>
                            {request.type === 'timeoff' ? '🏖️ Time Off' : '🔄 Shift Swap'}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(request.status)}`}>
                            {request.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-sm text-gray-700 mb-2">
                          {request.details}
                        </div>
                        {request.startDay && request.endDay && (
                          <div className="text-sm text-gray-600">
                            Days {request.startDay}-{request.endDay} •{' '}
                            {request.endDay - request.startDay + 1} day(s) • {request.hours} hours
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          Submitted: {request.submittedDate.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                      {request.status === 'pending' && (
                        <div className="flex gap-2 ml-4">
                          <button
                            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition-colors"
                            onClick={() => alert('Approve functionality would be implemented here')}
                          >
                            Approve
                          </button>
                          <button
                            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-colors"
                            onClick={() => alert('Deny functionality would be implemented here')}
                          >
                            Deny
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="px-6 py-12 text-center text-gray-500">
            No requests found matching the selected filters
          </div>
        )}
      </div>
    </div>
  );
}
