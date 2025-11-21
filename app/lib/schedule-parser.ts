import { promises as fs } from 'fs';
import path from 'path';

export type ScheduleRow = {
  id: string;
  staffNumber: number;
  skill: string;
  status: string;
  fte: number;
  name: string;
  shifts: (string | null)[];
};

export type ScheduleData = {
  employees: ScheduleRow[];
  totalDays: number;
};

export async function parseScheduleCSV(): Promise<ScheduleData> {
  const csvPath = path.join(process.cwd(), 'documents', 'example', 'Agent Scheduler - Sample Schedule Prep.xlsx - Master Schedule.csv');
  const csvContent = await fs.readFile(csvPath, 'utf-8');

  const lines = csvContent.split('\n');
  const headerLine = lines[0];
  const headers = headerLine.split(',');

  // Find the index where day columns start (after FTE column)
  const dayStartIndex = 5; // ID, Staff, Skill, Status, FTE, then days 1-42
  const totalDays = headers.length - dayStartIndex;

  const employees: ScheduleRow[] = [];

  // Employee name mapping
  const employeeNames: Record<string, string> = {
    'employee_1': 'Alex Thompson',
    'employee_2': 'Jordan Martinez',
    'employee_3': 'Sam Chen',
    'employee_4': 'Taylor Johnson',
    'employee_5': 'Casey Rodriguez',
    'employee_6': 'Morgan Davis',
    'employee_7': 'Riley Wilson',
    'employee_8': 'Jamie Anderson',
    'employee_9': 'Avery Brown',
    'employee_10': 'Quinn Miller',
    'employee_11': 'Parker Garcia',
    'employee_12': 'Reese Lee',
    'employee_13': 'Cameron White',
    'employee_14': 'Skyler Harris',
    'employee_15': 'Dakota Clark',
    'employee_16': 'Charlie Lewis',
    'employee_17': 'Finley Walker',
    'employee_18': 'Sage Hall',
    'employee_19': 'River Young',
    'employee_20': 'Phoenix King',
  };

  // Parse employee rows (lines 1-20, skipping header line 0)
  for (let i = 1; i <= 20; i++) {
    const line = lines[i];
    if (!line || line.trim() === '') continue;

    const columns = line.split(',');

    const id = columns[0];
    const staffNumber = parseInt(columns[1], 10);
    const skill = columns[2];
    const status = columns[3];
    const fte = parseFloat(columns[4]);

    // Extract shifts for days 1-42
    const shifts: (string | null)[] = [];
    for (let dayIndex = dayStartIndex; dayIndex < columns.length; dayIndex++) {
      const shift = columns[dayIndex]?.trim();
      shifts.push(shift && shift !== '' ? shift : null);
    }

    employees.push({
      id,
      staffNumber,
      skill,
      status,
      fte,
      name: employeeNames[id] || `Staff ${staffNumber}`,
      shifts,
    });
  }

  return {
    employees,
    totalDays,
  };
}

export function formatScheduleForClaude(scheduleData: ScheduleData): string {
  let output = 'Current Schedule (6-week period, 42 days):\n\n';
  output += 'Staff | Status | FTE | Day 1 | Day 2 | Day 3 | ... | Day 42\n';
  output += '------|--------|-----|-------|-------|-------|-----|-------\n';

  for (const emp of scheduleData.employees) {
    output += `${emp.staffNumber.toString().padStart(2)} - ${emp.name.padEnd(20)} | ${emp.status.padEnd(2)} | ${emp.fte} | `;
    output += emp.shifts.map(s => (s || '').padEnd(9)).join(' | ');
    output += '\n';
  }

  return output;
}
