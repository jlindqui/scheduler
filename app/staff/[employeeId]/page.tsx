'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Schedule, ConstraintType } from '@/app/lib/definitions';
import { getUpcomingSchedules } from '@/app/actions/schedules';
import {
  getGeneralPreferences,
  getSchedulePreferences,
  createGeneralPreference,
  createSchedulePreference,
  updateGeneralPreference,
  deleteGeneralPreference,
} from '@/app/actions/preferences';
import { useToast } from '@/hooks/use-toast';

const MOCK_ORGANIZATION_ID = 'org_1';

// Mock employees for testing (matching example schedule)
const MOCK_EMPLOYEES = [
  { id: 'employee_1', staffNumber: 1, name: 'Alex Thompson', fte: 1.0 },
  { id: 'employee_2', staffNumber: 2, name: 'Jordan Martinez', fte: 1.0 },
  { id: 'employee_3', staffNumber: 3, name: 'Sam Chen', fte: 1.0 },
  { id: 'employee_4', staffNumber: 4, name: 'Taylor Johnson', fte: 1.0 },
  { id: 'employee_5', staffNumber: 5, name: 'Casey Rodriguez', fte: 1.0 },
  { id: 'employee_6', staffNumber: 6, name: 'Morgan Davis', fte: 1.0 },
  { id: 'employee_7', staffNumber: 7, name: 'Riley Wilson', fte: 1.0 },
  { id: 'employee_8', staffNumber: 8, name: 'Jamie Anderson', fte: 1.0 },
  { id: 'employee_9', staffNumber: 9, name: 'Avery Brown', fte: 1.0 },
  { id: 'employee_10', staffNumber: 10, name: 'Quinn Miller', fte: 1.0 },
  { id: 'employee_11', staffNumber: 11, name: 'Parker Garcia', fte: 1.0 },
  { id: 'employee_12', staffNumber: 12, name: 'Reese Lee', fte: 1.0 },
  { id: 'employee_13', staffNumber: 13, name: 'Cameron White', fte: 0.6 },
  { id: 'employee_14', staffNumber: 14, name: 'Skyler Harris', fte: 0.6 },
  { id: 'employee_15', staffNumber: 15, name: 'Dakota Clark', fte: 0.6 },
  { id: 'employee_16', staffNumber: 16, name: 'Charlie Lewis', fte: 0.6 },
  { id: 'employee_17', staffNumber: 17, name: 'Finley Walker', fte: 0.6 },
  { id: 'employee_18', staffNumber: 18, name: 'Sage Hall', fte: 0.6 },
  { id: 'employee_19', staffNumber: 19, name: 'River Young', fte: 0.6 },
  { id: 'employee_20', staffNumber: 20, name: 'Phoenix King', fte: 0.6 },
];

export default function StaffPage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.employeeId as string;
  const { toast } = useToast();

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [generalPreference, setGeneralPreference] = useState('');
  const [generalPreferenceId, setGeneralPreferenceId] = useState<string | null>(null);
  const [schedulePreferences, setSchedulePreferences] = useState<Record<string, { text: string; id?: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const currentEmployee = MOCK_EMPLOYEES.find(e => e.id === employeeId);

  useEffect(() => {
    if (employeeId) {
      loadData();
    }
  }, [employeeId]);

  async function loadData() {
    setLoading(true);
    try {
      const schedData = await getUpcomingSchedules(MOCK_ORGANIZATION_ID, 6);
      setSchedules(schedData);

      // Load existing general preference
      const generalPrefs = await getGeneralPreferences(employeeId);
      if (generalPrefs.length > 0) {
        setGeneralPreference(generalPrefs[0].description);
        setGeneralPreferenceId(generalPrefs[0].id);
      } else {
        setGeneralPreference('');
        setGeneralPreferenceId(null);
      }

      // Load schedule preferences
      const schedPrefs: Record<string, { text: string; id?: string }> = {};
      for (const schedule of schedData) {
        const prefs = await getSchedulePreferences(employeeId, schedule.id);
        if (prefs.length > 0) {
          schedPrefs[schedule.id] = { text: prefs[0].description, id: prefs[0].id };
        }
      }
      setSchedulePreferences(schedPrefs);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function saveAll() {
    setSaving(true);
    try {
      // Save general preference
      if (generalPreference.trim()) {
        if (generalPreferenceId) {
          await updateGeneralPreference(generalPreferenceId, {
            description: generalPreference,
          });
        } else {
          const created = await createGeneralPreference({
            employeeProfileId: employeeId,
            constraintType: ConstraintType.DAY_RESTRICTION,
            description: generalPreference,
            parameters: {},
          });
          setGeneralPreferenceId(created.id);
        }
      } else if (generalPreferenceId) {
        await deleteGeneralPreference(generalPreferenceId);
        setGeneralPreferenceId(null);
      }

      // Save schedule preferences
      for (const schedule of schedules) {
        const pref = schedulePreferences[schedule.id];
        if (pref?.text?.trim()) {
          if (!pref.id) {
            const created = await createSchedulePreference({
              employeeProfileId: employeeId,
              scheduleId: schedule.id,
              constraintType: ConstraintType.DAY_RESTRICTION,
              description: pref.text,
              parameters: {},
            });
            setSchedulePreferences({
              ...schedulePreferences,
              [schedule.id]: { text: pref.text, id: created.id },
            });
          }
        }
      }

      toast({
        title: "Success",
        description: "All preferences saved successfully!",
      });
    } catch (error) {
      console.error('Failed to save:', error);
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  function handleEmployeeChange(newEmployeeId: string) {
    router.push(`/staff/${newEmployeeId}`);
  }

  function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

  function getWeeks(schedule: Schedule): number {
    const start = new Date(schedule.startDate);
    const end = new Date(schedule.endDate);
    const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.round(days / 7);
  }

  if (!currentEmployee) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Employee not found</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-8">
      {/* Upcoming Schedules */}
      <div className="mb-12">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Upcoming Schedules</h2>

        {schedules.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            No upcoming schedules
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {schedules.map((schedule) => (
              <div key={schedule.id} className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="mb-4">
                  <h3 className="font-bold text-gray-900 mb-2">{schedule.name}</h3>
                  <div className="text-sm text-gray-600">
                    {formatDate(schedule.startDate)} - {formatDate(schedule.endDate)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {getWeeks(schedule)} weeks
                  </div>
                </div>

                <textarea
                  value={schedulePreferences[schedule.id]?.text || ''}
                  onChange={(e) => setSchedulePreferences({
                    ...schedulePreferences,
                    [schedule.id]: {
                      text: e.target.value,
                      id: schedulePreferences[schedule.id]?.id
                    }
                  })}
                  placeholder="Example: Can work one of Christmas or New Year's but not both"
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* General Preferences */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-3">General Preferences</h2>
        <p className="text-sm text-gray-600 mb-4">
          These apply to all schedules
        </p>
        <textarea
          value={generalPreference}
          onChange={(e) => setGeneralPreference(e.target.value)}
          placeholder="Example: I can only work 1 of Tuesday or Wednesday each week"
          className="w-full border border-gray-300 rounded-lg p-4 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={3}
        />
      </div>

      {/* Single Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveAll}
          disabled={saving}
          className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold text-lg"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
