import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { ScheduleData } from '@/app/lib/schedule-parser';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

type ValidationIssue = {
  employeeName: string;
  employeeId: string;
  preferenceType: string;
  preference: string;
  issue: string;
  affectedDays: string[];
  affectedDayNumbers: number[];
  severity: string;
};

export async function POST(request: NextRequest) {
  try {
    const {
      currentSchedule,
      issuesToFix,
      generalPreferences,
      schedulePreferences,
      managerGeneralPreference,
      managerSchedulePreference
    } = await request.json();

    // Format the prompt for Claude
    const prompt = buildSchedulePrompt(
      currentSchedule,
      issuesToFix,
      generalPreferences,
      schedulePreferences,
      managerGeneralPreference,
      managerSchedulePreference
    );

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Parse Claude's response
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const result = parseClaudeScheduleResponse(responseText, currentSchedule);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to generate schedule:', error);
    return NextResponse.json(
      { error: 'Failed to generate schedule' },
      { status: 500 }
    );
  }
}

function buildSchedulePrompt(
  currentSchedule: ScheduleData,
  issuesToFix: ValidationIssue[],
  generalPreferences: any[],
  schedulePreferences: any[],
  managerGeneralPreference?: string,
  managerSchedulePreference?: string
): string {
  const startDate = new Date('2025-12-01');
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function getDayOfWeek(dayNumber: number): string {
    const date = new Date(startDate);
    date.setDate(date.getDate() + (dayNumber - 1));
    return dayNames[date.getDay()];
  }

  let prompt = `You are a scheduling assistant for a healthcare facility. Your task is to modify the current schedule to fix specific validation issues while maintaining required staffing levels.

**Schedule Information:**
- Period: 6-week schedule
- Start Date: December 1, 2025
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

  // Add issues to fix
  prompt += '\n**Issues to Fix:**\n\n';
  for (const issue of issuesToFix) {
    prompt += `- **${issue.employeeName}** (${issue.preferenceType}): ${issue.preference}\n`;
    prompt += `  Issue: ${issue.issue}\n`;
    prompt += `  Affected Days: ${issue.affectedDays.join(', ')}\n\n`;
  }

  // Add all preferences for context
  if (generalPreferences.length > 0) {
    prompt += '\n**All General Preferences (for context):**\n\n';
    for (const pref of generalPreferences) {
      prompt += `- **${pref.employeeName}**: ${pref.description}\n`;
    }
  }

  if (schedulePreferences.length > 0) {
    prompt += '\n**All Schedule-Specific Preferences (for context):**\n\n';
    for (const pref of schedulePreferences) {
      prompt += `- **${pref.employeeName}**: ${pref.description}\n`;
    }
  }

  if (managerGeneralPreference || managerSchedulePreference) {
    prompt += '\n**Manager Constraints (for context):**\n\n';
    if (managerGeneralPreference) {
      prompt += `**General:** ${managerGeneralPreference}\n\n`;
    }
    if (managerSchedulePreference) {
      prompt += `**Schedule-Specific:** ${managerSchedulePreference}\n\n`;
    }
  }

  prompt += `

**Your Task:**

1. Create a modified schedule that fixes the issues listed above while:
   - Making MINIMAL changes to the current schedule (only change what's necessary)
   - Maintaining staffing requirements (check daily staffing counts)
   - Respecting all other preferences and constraints
   - Balancing workload fairly

2. Provide an explanation of what you changed and why

**Output Format:**

Respond with the following format:

EXPLANATION:
[Provide a clear, bullet-pointed explanation of what shifts you changed and why]

SCHEDULE_CSV:
ID,Staff,Skill,Status,FTE,1,2,3,4,5,...,42
employee_1,1,RN,FT,1,0700-1900,0700-1900,,,0700-1900,...
[Include all 20 employees with their complete 42-day schedules]

**Important:**
- Use "0700-1900" for day shifts, "1900-0700" for night shifts, "" (empty) for days off
- Include ALL employees in the same order as the current schedule
- Maintain employee ID, Staff number, Skill, Status, and FTE values
- Only change shifts where necessary to fix the listed issues
`;

  return prompt;
}

function parseClaudeScheduleResponse(response: string, currentSchedule: ScheduleData): { schedule: ScheduleData; explanation: string } {
  // Extract explanation
  const explanationMatch = response.match(/EXPLANATION:\s*([\s\S]*?)(?=SCHEDULE_CSV:|$)/);
  const explanation = explanationMatch ? explanationMatch[1].trim() : 'No explanation provided';

  // Extract CSV data from response
  const csvMatch = response.match(/SCHEDULE_CSV:\s*([\s\S]+)/);
  if (!csvMatch) {
    throw new Error('Could not find CSV data in Claude response');
  }

  const csvData = csvMatch[1].trim();
  const lines = csvData.split('\n').filter(line => line.trim());

  // Skip header line
  const dataLines = lines.slice(1);

  const employees = dataLines.map(line => {
    const columns = line.split(',');

    const id = columns[0];
    const staffNumber = parseInt(columns[1], 10);
    const skill = columns[2];
    const status = columns[3];
    const fte = parseFloat(columns[4]);

    // Extract shifts for days 1-42
    const shifts: (string | null)[] = [];
    for (let i = 5; i < columns.length && i < 47; i++) {
      const shift = columns[i]?.trim();
      shifts.push(shift && shift !== '' && shift !== '-' ? shift : null);
    }

    // Find employee name from current schedule
    const currentEmp = currentSchedule.employees.find(e => e.id === id);
    const name = currentEmp?.name || `Staff ${staffNumber}`;

    return {
      id,
      staffNumber,
      skill,
      status,
      fte,
      name,
      shifts,
    };
  });

  const schedule: ScheduleData = {
    employees,
    totalDays: currentSchedule.totalDays,
  };

  return { schedule, explanation };
}
