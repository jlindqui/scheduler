'use client';

import { useState } from 'react';
import { activeShiftSwapRequest, upcomingShifts } from '@/app/lib/mock-data';

export default function ShiftSwapPage() {
  const [selectedShift, setSelectedShift] = useState(upcomingShifts[3]); // The shift we want to swap
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const swapSuggestions = activeShiftSwapRequest.aiSuggestions?.suggestions || [];

  const handleSubmit = () => {
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="max-w-4xl">
        <div className="bg-green-50 border-l-4 border-green-400 p-6 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-4xl">✅</span>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-green-800 mb-2">
                Shift Swap Request Submitted!
              </h3>
              <p className="text-green-700">
                Your swap request has been sent to{' '}
                <strong>
                  {swapSuggestions.find((s) => s.staffId === selectedPartner)?.staffName}
                </strong>{' '}
                and your manager for approval.
              </p>
              <p className="text-green-700 mt-2">
                You'll receive a notification once your request is reviewed. The request will appear
                in your dashboard with status updates.
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setSelectedPartner(null);
                }}
                className="mt-4 bg-white border border-green-500 text-green-700 px-4 py-2 rounded-lg font-semibold hover:bg-green-50 transition-colors"
              >
                Request Another Swap
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Request Shift Swap</h1>
        <p className="text-gray-600">
          Find compatible co-workers to swap shifts while maintaining CBA compliance
        </p>
      </div>

      {/* Step 1: Select Shift */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Step 1: Shift to Swap
        </h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-gray-900 mb-2">
                {selectedShift.shiftDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div>
                  <span className="mr-1">⏰</span>
                  {selectedShift.startTime} - {selectedShift.endTime}
                </div>
                <div>
                  <span className="mr-1">🏥</span>
                  {selectedShift.location}
                </div>
                <div>
                  <span className="mr-1">☀️</span>
                  {selectedShift.shiftType}
                </div>
              </div>
            </div>
            {selectedShift.assignment.triggersPremium && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                💰 Premium Pay
              </span>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-3">
          Reason: {activeShiftSwapRequest.requestReason}
        </p>
      </div>

      {/* Step 2: AI Suggestions */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Step 2: Select Swap Partner
          </h2>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            🤖 AI Suggested
          </span>
        </div>

        <p className="text-gray-600 mb-6">
          Based on skills, availability, and CBA rules, here are your best swap options:
        </p>

        <div className="space-y-4">
          {swapSuggestions.map((suggestion) => (
            <div
              key={suggestion.staffId}
              className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                selectedPartner === suggestion.staffId
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedPartner(suggestion.staffId)}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {suggestion.staffName}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {suggestion.employeeNumber} • {suggestion.seniority} years seniority
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {suggestion.score}
                  </div>
                  <div className="text-xs text-gray-500">Compatibility</div>
                </div>
              </div>

              {/* Compatibility Checks */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div
                  className={`flex items-center text-sm ${
                    suggestion.compatibility.skillsMatch
                      ? 'text-green-700'
                      : 'text-red-700'
                  }`}
                >
                  <span className="mr-2">
                    {suggestion.compatibility.skillsMatch ? '✅' : '❌'}
                  </span>
                  Skills Match
                </div>
                <div
                  className={`flex items-center text-sm ${
                    suggestion.compatibility.availabilityMatch
                      ? 'text-green-700'
                      : 'text-red-700'
                  }`}
                >
                  <span className="mr-2">
                    {suggestion.compatibility.availabilityMatch ? '✅' : '❌'}
                  </span>
                  Has Availability
                </div>
                <div
                  className={`flex items-center text-sm ${
                    suggestion.compatibility.noViolations
                      ? 'text-green-700'
                      : 'text-red-700'
                  }`}
                >
                  <span className="mr-2">
                    {suggestion.compatibility.noViolations ? '✅' : '❌'}
                  </span>
                  No CBA Violations
                </div>
                <div
                  className={`flex items-center text-sm ${
                    suggestion.compatibility.swapLimitOk
                      ? 'text-green-700'
                      : 'text-red-700'
                  }`}
                >
                  <span className="mr-2">
                    {suggestion.compatibility.swapLimitOk ? '✅' : '❌'}
                  </span>
                  Within Swap Limit
                </div>
              </div>

              {/* Details */}
              <div className="border-t border-gray-200 pt-4 text-sm text-gray-600">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>Skills:</strong> {suggestion.details.skills.join(', ')}
                  </div>
                  <div>
                    <strong>Swaps Used:</strong> {suggestion.details.currentSwaps}/
                    {suggestion.details.maxSwaps}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={!selectedPartner}
          className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Submit Swap Request →
        </button>
      </div>

      {/* CBA Compliance Note */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex">
          <span className="text-xl mr-3">⚖️</span>
          <div className="text-sm text-gray-700">
            <strong className="text-gray-900">CBA Compliance:</strong> This swap has been analyzed
            against all collective bargaining agreement rules. No overtime triggers, premium pay
            conflicts, or rest period violations detected. Skills and certifications verified.
          </div>
        </div>
      </div>
    </div>
  );
}
