import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { ScheduleData } from '@/app/lib/schedule-parser';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export type ValidationIssue = {
  employeeName: string;
  employeeId: string;
  preferenceType: 'general' | 'schedule-specific' | 'manager-general' | 'manager-schedule';
  preference: string;
  issue: string;
  affectedDays: string[]; // Date strings like "Dec 2" or "Dec 15"
  affectedDayNumbers: number[]; // Day numbers for highlighting (1-42)
  severity: 'high' | 'medium' | 'low';
};

export type ValidationResult = {
  issues: ValidationIssue[];
  summary: {
    totalIssues: number;
    highSeverity: number;
    mediumSeverity: number;
    lowSeverity: number;
  };
};

export async function POST(request: NextRequest) {
  try {
    const {
      currentSchedule,
      generalPreferences,
      schedulePreferences,
      scheduleInfo,
      managerGeneralPreference,
      managerSchedulePreference
    } = await request.json();

    // Format the prompt for Claude
    const prompt = buildValidationPrompt(
      currentSchedule,
      generalPreferences,
      schedulePreferences,
      scheduleInfo,
      managerGeneralPreference,
      managerSchedulePreference
    );

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Parse Claude's response
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const validationResult = parseValidationResponse(responseText);

    return NextResponse.json(validationResult);
  } catch (error) {
    console.error('Failed to validate schedule:', error);
    return NextResponse.json(
      { error: 'Failed to validate schedule' },
      { status: 500 }
    );
  }
}

function buildValidationPrompt(
  currentSchedule: ScheduleData,
  generalPreferences: any[],
  schedulePreferences: any[],
  scheduleInfo: any,
  managerGeneralPreference?: string,
  managerSchedulePreference?: string
): string {
  // Calculate day of week for each day
  const startDate = new Date('2025-12-01');
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function getDayOfWeek(dayNumber: number): string {
    const date = new Date(startDate);
    date.setDate(date.getDate() + (dayNumber - 1));
    return dayNames[date.getDay()];
  }

  let prompt = `You are a scheduling assistant for a healthcare facility. Your task is to VALIDATE an existing 6-week schedule against employee preferences and identify any conflicts or issues.

**Schedule Information:**
- Period: ${scheduleInfo.name}
- Start Date: December 1, 2025 (Monday)
- Dates: ${new Date(scheduleInfo.startDate).toLocaleDateString()} to ${new Date(scheduleInfo.endDate).toLocaleDateString()}
- Duration: 42 days (6 weeks)

**Day Number to Day of Week Mapping:**
${Array.from({ length: 42 }, (_, i) => {
  const dayNum = i + 1;
  const dow = getDayOfWeek(dayNum);
  const date = new Date(startDate);
  date.setDate(date.getDate() + i);
  return `Day ${dayNum} = ${dow}, ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}).join('\n')}

**Current Schedule:**

`;

  // Add current schedule in table format
  prompt += 'Staff | Status | FTE | Days 1-42 (with day of week)\n';
  prompt += '------|--------|-----|----------\n';
  for (const emp of currentSchedule.employees) {
    const shiftsStr = emp.shifts.map((s, idx) => {
      const dayNum = idx + 1;
      const dow = getDayOfWeek(dayNum);
      return `D${dayNum}(${dow.substring(0, 3)}):${s || 'OFF'}`;
    }).join(' ');
    prompt += `${emp.staffNumber}. ${emp.name} (${emp.id}) | ${emp.status} | ${emp.fte} | ${shiftsStr}\n`;
  }

  // Calculate and add daily staffing summary
  prompt += '\n**Daily Staffing Summary:**\n\n';
  prompt += 'This shows how many staff are scheduled to work each day:\n\n';

  const dailyStaffing: { [key: number]: number } = {};
  for (let day = 1; day <= 42; day++) {
    dailyStaffing[day] = 0;
    for (const emp of currentSchedule.employees) {
      const shift = emp.shifts[day - 1];
      if (shift && shift.trim() !== '' && shift.toUpperCase() !== 'OFF') {
        dailyStaffing[day]++;
      }
    }
  }

  // Group by weeks for readability
  for (let week = 0; week < 6; week++) {
    const weekStart = week * 7 + 1;
    const weekEnd = Math.min(weekStart + 6, 42);
    prompt += `Week ${week + 1} (Days ${weekStart}-${weekEnd}):\n`;

    for (let day = weekStart; day <= weekEnd; day++) {
      const dow = getDayOfWeek(day);
      const date = new Date(startDate);
      date.setDate(date.getDate() + (day - 1));
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      prompt += `  Day ${day} (${dow}, ${dateStr}): ${dailyStaffing[day]} staff working\n`;
    }
    prompt += '\n';
  }

  // Add general preferences
  if (generalPreferences.length > 0) {
    prompt += '\n**General Preferences (apply to all schedules):**\n\n';
    for (const pref of generalPreferences) {
      prompt += `- **${pref.employeeName}** (${pref.employeeProfileId}): ${pref.description}\n`;
    }
  }

  // Add schedule-specific preferences
  if (schedulePreferences.length > 0) {
    prompt += '\n**Schedule-Specific Preferences:**\n\n';
    for (const pref of schedulePreferences) {
      prompt += `- **${pref.employeeName}** (${pref.employeeProfileId}): ${pref.description}\n`;
    }
  }

  // Add manager preferences
  if (managerGeneralPreference || managerSchedulePreference) {
    prompt += '\n**Manager Constraints:**\n\n';
    if (managerGeneralPreference) {
      prompt += `**General Constraints (apply to all schedules):**\n${managerGeneralPreference}\n\n`;
    }
    if (managerSchedulePreference) {
      prompt += `**Schedule-Specific Constraints:**\n${managerSchedulePreference}\n\n`;
    }
  }

  prompt += `

**Your Task:**

Carefully analyze the current schedule and compare it against EACH employee preference (both general and schedule-specific) AND manager constraints. For each preference or constraint that is NOT satisfied by the schedule, create an issue report.

**Output Format:**

Respond with a JSON object in the following format:

\`\`\`json
{
  "issues": [
    {
      "employeeName": "Alex Thompson",
      "employeeId": "employee_1",
      "preferenceType": "general",
      "preference": "I can only work 1 of Tuesday or Wednesday each week",
      "issue": "Works both Tuesday and Wednesday in weeks 1, 3, and 5",
      "affectedDays": ["Dec 2", "Dec 3", "Dec 16", "Dec 17", "Dec 30", "Dec 31"],
      "affectedDayNumbers": [2, 3, 16, 17, 30, 31],
      "severity": "high"
    },
    {
      "employeeName": "Manager Constraint",
      "employeeId": "MANAGER",
      "preferenceType": "manager-general",
      "preference": "No more than 3 employees can have the same day off",
      "issue": "On days 5 and 12, 4 employees are off",
      "affectedDays": ["Dec 5", "Dec 12"],
      "affectedDayNumbers": [5, 12],
      "severity": "medium"
    }
  ]
}
\`\`\`

**Important:**
- Only include issues where a preference or constraint is NOT being honored
- For affectedDays: Use the actual date in "MMM D" format (e.g., "Dec 2", "Jan 5")
- For affectedDayNumbers: List the day numbers (1-42) for internal use
- For manager constraints, use:
  - employeeName: "Manager Constraint"
  - employeeId: "MANAGER"
  - preferenceType: "manager-general" or "manager-schedule"
- Severity levels:
  - "high": Preference completely ignored or violated multiple times
  - "medium": Preference partially violated
  - "low": Minor violation that might be acceptable
- If there are NO issues (all preferences and constraints are satisfied), return an empty issues array: {"issues": []}
- Start your response with "VALIDATION_JSON:" followed by the JSON on the next line

**Example Response:**

VALIDATION_JSON:
{
  "issues": [
    {
      "employeeName": "Jordan Martinez",
      "employeeId": "employee_2",
      "preferenceType": "schedule-specific",
      "preference": "Can work one of Christmas or New Year's but not both",
      "issue": "Scheduled to work both December 25th (day 25) and January 1st (day 32)",
      "affectedDays": [25, 32],
      "severity": "high"
    }
  ]
}
`;

  return prompt;
}

function parseValidationResponse(response: string): ValidationResult {
  // Extract JSON data from response
  const jsonMatch = response.match(/VALIDATION_JSON:\s*([\s\S]+)/);
  if (!jsonMatch) {
    throw new Error('Could not find JSON data in validation response');
  }

  const jsonData = jsonMatch[1].trim();

  // Remove markdown code blocks if present
  const cleanJson = jsonData.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  const parsed = JSON.parse(cleanJson);

  const issues: ValidationIssue[] = parsed.issues || [];

  // Calculate summary
  const summary = {
    totalIssues: issues.length,
    highSeverity: issues.filter(i => i.severity === 'high').length,
    mediumSeverity: issues.filter(i => i.severity === 'medium').length,
    lowSeverity: issues.filter(i => i.severity === 'low').length,
  };

  return {
    issues,
    summary,
  };
}
