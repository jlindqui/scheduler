'use client';

import { useState, useEffect } from 'react';
import { parseScheduleCSV, ScheduleData, ScheduleRow } from '@/app/lib/schedule-parser';
import { getAllGeneralPreferences, getAllSchedulePreferences } from '@/app/actions/preferences';
import {
  getManagerGeneralPreferences,
  getManagerSchedulePreferences,
  createManagerGeneralPreference,
  createManagerSchedulePreference,
  updateManagerGeneralPreference,
  deleteManagerGeneralPreference,
} from '@/app/actions/manager-preferences';
import { getUpcomingSchedules } from '@/app/actions/schedules';
import { Schedule } from '@/app/lib/definitions';
import { useToast } from '@/hooks/use-toast';

const MOCK_ORGANIZATION_ID = 'org_1';

type PreferenceWithEmployee = {
  id: string;
  employeeProfileId: string;
  employeeName: string;
  description: string;
};

type ValidationIssue = {
  employeeName: string;
  employeeId: string;
  preferenceType: 'general' | 'schedule-specific' | 'manager-general' | 'manager-schedule';
  preference: string;
  issue: string;
  affectedDays: string[]; // Date strings like "Dec 2"
  affectedDayNumbers: number[]; // Day numbers for highlighting (1-42)
  severity: 'high' | 'medium' | 'low';
};

type ValidationResult = {
  issues: ValidationIssue[];
  summary: {
    totalIssues: number;
    highSeverity: number;
    mediumSeverity: number;
    lowSeverity: number;
  };
};

export default function MasterSchedulePage() {
  const { toast } = useToast();
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [generalPreferences, setGeneralPreferences] = useState<PreferenceWithEmployee[]>([]);
  const [schedulePreferences, setSchedulePreferences] = useState<PreferenceWithEmployee[]>([]);
  const [managerGeneralPreference, setManagerGeneralPreference] = useState('');
  const [managerGeneralPreferenceId, setManagerGeneralPreferenceId] = useState<string | null>(null);
  const [managerSchedulePreference, setManagerSchedulePreference] = useState('');
  const [managerSchedulePreferenceId, setManagerSchedulePreferenceId] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [hoveredIssueDays, setHoveredIssueDays] = useState<number[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedSchedule) {
      loadSchedulePreferences(selectedSchedule.id);
      setValidationResult(null); // Clear validation when schedule changes
    }
  }, [selectedSchedule]);

  async function loadData() {
    setLoading(true);
    try {
      const [csvData, generalPrefs, managerGeneralPrefs, schedulesData] = await Promise.all([
        fetch('/api/schedule-data').then(res => res.json()),
        getAllGeneralPreferences(MOCK_ORGANIZATION_ID),
        getManagerGeneralPreferences(MOCK_ORGANIZATION_ID),
        getUpcomingSchedules(MOCK_ORGANIZATION_ID, 6),
      ]);

      setScheduleData(csvData);
      setGeneralPreferences(generalPrefs);
      setSchedules(schedulesData);

      // Load manager general preference
      if (managerGeneralPrefs.length > 0) {
        setManagerGeneralPreference(managerGeneralPrefs[0].description);
        setManagerGeneralPreferenceId(managerGeneralPrefs[0].id);
      }

      if (schedulesData.length > 0) {
        setSelectedSchedule(schedulesData[0]);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadSchedulePreferences(scheduleId: string) {
    try {
      const [prefs, managerPrefs] = await Promise.all([
        getAllSchedulePreferences(MOCK_ORGANIZATION_ID, scheduleId),
        getManagerSchedulePreferences(MOCK_ORGANIZATION_ID, scheduleId),
      ]);

      setSchedulePreferences(prefs);

      // Load manager schedule preference
      if (managerPrefs.length > 0) {
        setManagerSchedulePreference(managerPrefs[0].description);
        setManagerSchedulePreferenceId(managerPrefs[0].id);
      } else {
        setManagerSchedulePreference('');
        setManagerSchedulePreferenceId(null);
      }
    } catch (error) {
      console.error('Failed to load schedule preferences:', error);
    }
  }

  async function saveManagerPreferences() {
    setSaving(true);
    try {
      // Save manager general preference
      if (managerGeneralPreference.trim()) {
        if (managerGeneralPreferenceId) {
          await updateManagerGeneralPreference(managerGeneralPreferenceId, {
            description: managerGeneralPreference,
          });
        } else {
          const created = await createManagerGeneralPreference({
            organizationId: MOCK_ORGANIZATION_ID,
            constraintType: 'DAY_RESTRICTION',
            description: managerGeneralPreference,
            parameters: {},
          });
          setManagerGeneralPreferenceId(created.id);
        }
      } else if (managerGeneralPreferenceId) {
        await deleteManagerGeneralPreference(managerGeneralPreferenceId);
        setManagerGeneralPreferenceId(null);
      }

      // Save manager schedule preference
      if (selectedSchedule) {
        if (managerSchedulePreference.trim()) {
          if (managerSchedulePreferenceId) {
            await updateManagerGeneralPreference(managerSchedulePreferenceId, {
              description: managerSchedulePreference,
            });
          } else {
            const created = await createManagerSchedulePreference({
              organizationId: MOCK_ORGANIZATION_ID,
              scheduleId: selectedSchedule.id,
              constraintType: 'DAY_RESTRICTION',
              description: managerSchedulePreference,
              parameters: {},
            });
            setManagerSchedulePreferenceId(created.id);
          }
        } else if (managerSchedulePreferenceId) {
          await deleteManagerGeneralPreference(managerSchedulePreferenceId);
          setManagerSchedulePreferenceId(null);
        }
      }

      toast({
        title: "Success",
        description: "Manager preferences saved successfully!",
      });
    } catch (error) {
      console.error('Failed to save manager preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save manager preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function validateSchedule() {
    if (!scheduleData || !selectedSchedule) return;

    setValidating(true);
    try {
      const response = await fetch('/api/validate-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentSchedule: scheduleData,
          generalPreferences,
          schedulePreferences,
          scheduleInfo: selectedSchedule,
          managerGeneralPreference: managerGeneralPreference || undefined,
          managerSchedulePreference: managerSchedulePreference || undefined,
        }),
      });

      const result = await response.json();
      setValidationResult(result);
    } catch (error) {
      console.error('Failed to validate schedule:', error);
      alert('Failed to validate schedule');
    } finally {
      setValidating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading schedule...</div>
      </div>
    );
  }

  return (
    <div className="max-w-[95vw] mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Master Schedule</h1>

      {/* Schedule Selector */}
      {schedules.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Schedule Period
          </label>
          <select
            value={selectedSchedule?.id || ''}
            onChange={(e) => {
              const schedule = schedules.find(s => s.id === e.target.value);
              setSelectedSchedule(schedule || null);
            }}
            className="block w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {schedules.map(schedule => (
              <option key={schedule.id} value={schedule.id}>
                {schedule.name} ({new Date(schedule.startDate).toLocaleDateString()} - {new Date(schedule.endDate).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Employee Preferences Cards */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Employee Preferences</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* General Preferences */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">General Preferences</h3>
              <p className="text-sm text-gray-600 mt-1">Apply to all schedules</p>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto">
              {generalPreferences.length === 0 ? (
                <p className="text-gray-500 text-sm">No general preferences submitted</p>
              ) : (
                <div className="space-y-4">
                  {generalPreferences.map(pref => (
                    <div key={pref.id} className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className="font-semibold text-gray-900">{pref.employeeName}</div>
                      <div className="text-sm text-gray-700 mt-1">{pref.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Schedule-Specific Preferences */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Schedule-Specific Preferences</h3>
              <p className="text-sm text-gray-600 mt-1">
                For {selectedSchedule?.name || 'selected period'}
              </p>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto">
              {schedulePreferences.length === 0 ? (
                <p className="text-gray-500 text-sm">No schedule-specific preferences submitted</p>
              ) : (
                <div className="space-y-4">
                  {schedulePreferences.map(pref => (
                    <div key={pref.id} className="border-l-4 border-green-500 pl-4 py-2">
                      <div className="font-semibold text-gray-900">{pref.employeeName}</div>
                      <div className="text-sm text-gray-700 mt-1">{pref.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Manager Preferences Cards - Editable */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Manager Preferences</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Manager General Preferences */}
          <div className="bg-white border border-purple-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-purple-200 bg-purple-50">
              <h3 className="text-xl font-semibold text-gray-900">General Constraints</h3>
              <p className="text-sm text-gray-600 mt-1">Apply to all schedules</p>
            </div>
            <div className="p-6">
              <textarea
                value={managerGeneralPreference}
                onChange={(e) => setManagerGeneralPreference(e.target.value)}
                placeholder="Example: Never more than 3 consecutive night shifts for any employee"
                className="w-full border border-gray-300 rounded-lg p-4 text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={4}
              />
            </div>
          </div>

          {/* Manager Schedule-Specific Preferences */}
          <div className="bg-white border border-purple-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-purple-200 bg-purple-50">
              <h3 className="text-xl font-semibold text-gray-900">Schedule Constraints</h3>
              <p className="text-sm text-gray-600 mt-1">
                For {selectedSchedule?.name || 'selected period'}
              </p>
            </div>
            <div className="p-6">
              <textarea
                value={managerSchedulePreference}
                onChange={(e) => setManagerSchedulePreference(e.target.value)}
                placeholder="Example: Need extra coverage on Christmas week (Days 23-29)"
                className="w-full border border-gray-300 rounded-lg p-4 text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={4}
              />
            </div>
          </div>
        </div>

        {/* Save Manager Preferences Button */}
        <div className="flex justify-end mt-4">
          <button
            onClick={saveManagerPreferences}
            disabled={saving}
            className="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold text-lg"
          >
            {saving ? 'Saving...' : 'Save Manager Preferences'}
          </button>
        </div>
      </div>

      {/* Validate Button */}
      <div className="mb-6 flex justify-center">
        <button
          onClick={validateSchedule}
          disabled={validating}
          className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold text-lg shadow-lg"
        >
          {validating ? 'Validating with Claude...' : 'Validate Schedule Against Preferences'}
        </button>
      </div>

      {/* Validation Results */}
      {validationResult && (
        <div className="mb-6">
          <div className={`border-l-4 p-4 mb-4 rounded ${
            validationResult.summary.totalIssues === 0
              ? 'bg-green-50 border-green-400'
              : 'bg-yellow-50 border-yellow-400'
          }`}>
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-2xl">
                  {validationResult.summary.totalIssues === 0 ? '✅' : '⚠️'}
                </span>
              </div>
              <div className="ml-3">
                <h3 className={`text-sm font-medium ${
                  validationResult.summary.totalIssues === 0
                    ? 'text-green-800'
                    : 'text-yellow-800'
                }`}>
                  {validationResult.summary.totalIssues === 0
                    ? 'All preferences satisfied!'
                    : `Found ${validationResult.summary.totalIssues} issue${validationResult.summary.totalIssues > 1 ? 's' : ''}`
                  }
                </h3>
                {validationResult.summary.totalIssues > 0 && (
                  <p className="text-sm text-yellow-700 mt-1">
                    {validationResult.summary.highSeverity} high, {validationResult.summary.mediumSeverity} medium, {validationResult.summary.lowSeverity} low severity
                  </p>
                )}
              </div>
            </div>
          </div>

          {validationResult.issues.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Validation Issues</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {validationResult.issues.map((issue, idx) => (
                  <div
                    key={idx}
                    className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                    onMouseEnter={() => setHoveredIssueDays(issue.affectedDayNumbers)}
                    onMouseLeave={() => setHoveredIssueDays([])}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            issue.severity === 'high' ? 'bg-red-100 text-red-800' :
                            issue.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {issue.severity.toUpperCase()}
                          </span>
                          <span className="font-semibold text-gray-900">{issue.employeeName}</span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            issue.preferenceType === 'general'
                              ? 'bg-blue-100 text-blue-700'
                              : issue.preferenceType === 'schedule-specific'
                              ? 'bg-green-100 text-green-700'
                              : issue.preferenceType === 'manager-general'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {issue.preferenceType === 'general'
                              ? 'General'
                              : issue.preferenceType === 'schedule-specific'
                              ? 'Schedule-Specific'
                              : issue.preferenceType === 'manager-general'
                              ? 'Manager General'
                              : 'Manager Schedule'}
                          </span>
                        </div>
                        <div className="mb-2">
                          <span className="text-sm font-medium text-gray-700">Preference: </span>
                          <span className="text-sm text-gray-600">{issue.preference}</span>
                        </div>
                        <div className="mb-2">
                          <span className="text-sm font-medium text-gray-700">Issue: </span>
                          <span className="text-sm text-gray-900">{issue.issue}</span>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700">Affected Days: </span>
                          <span className="text-sm text-gray-600">
                            {issue.affectedDays.join(', ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Current Schedule */}
      {scheduleData && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Current Schedule</h2>
          </div>
          <div className="p-4 overflow-x-auto">
            <ScheduleGrid
              data={scheduleData}
              highlightDays={hoveredIssueDays.length > 0 ? hoveredIssueDays : (validationResult?.issues.flatMap(i => i.affectedDayNumbers) || [])}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ScheduleGrid({ data, highlightDays }: { data: ScheduleData; highlightDays: number[] }) {
  // Calculate dates starting from Dec 1, 2025
  const startDate = new Date('2025-12-01');
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function getDayInfo(dayNumber: number) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + (dayNumber - 1));
    const dayName = dayNames[date.getDay()];
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return { dayName, month, day, date };
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-2 py-1 text-left font-semibold sticky left-0 bg-gray-100 z-10">Staff</th>
            <th className="border border-gray-300 px-2 py-1 text-left font-semibold">Status</th>
            <th className="border border-gray-300 px-2 py-1 text-left font-semibold">FTE</th>
            {Array.from({ length: data.totalDays }, (_, i) => {
              const dayNumber = i + 1;
              const { dayName, month, day } = getDayInfo(dayNumber);
              const isWeekend = dayName === 'Sat' || dayName === 'Sun';
              return (
                <th
                  key={i}
                  className={`border border-gray-300 px-2 py-1 text-center font-semibold whitespace-nowrap ${
                    highlightDays.includes(dayNumber) ? 'bg-yellow-200' :
                    isWeekend ? 'bg-gray-200' : ''
                  }`}
                >
                  <div className="text-[10px] leading-tight">
                    <div className={isWeekend ? 'font-bold' : ''}>{dayName}</div>
                    <div className="text-gray-600">{month}/{day}</div>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.employees.map(emp => (
            <tr key={emp.id} className="hover:bg-gray-50">
              <td className="border border-gray-300 px-2 py-1 font-medium sticky left-0 bg-white whitespace-nowrap">
                {emp.staffNumber} - {emp.name}
              </td>
              <td className="border border-gray-300 px-2 py-1">{emp.status}</td>
              <td className="border border-gray-300 px-2 py-1">{emp.fte}</td>
              {emp.shifts.map((shift, idx) => (
                <td
                  key={idx}
                  className={`border border-gray-300 px-2 py-1 text-center whitespace-nowrap ${
                    highlightDays.includes(idx + 1) ? 'bg-yellow-100' :
                    shift === '0700-1900' ? 'bg-blue-50' :
                    shift === '1900-0700' ? 'bg-purple-50' :
                    'bg-white'
                  }`}
                >
                  {shift || '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
