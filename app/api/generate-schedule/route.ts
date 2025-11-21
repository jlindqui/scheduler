import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { ScheduleData } from '@/app/lib/schedule-parser';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    const { currentSchedule, generalPreferences, schedulePreferences, scheduleInfo } = await request.json();

    // Format the prompt for Claude
    const prompt = buildSchedulePrompt(currentSchedule, generalPreferences, schedulePreferences, scheduleInfo);

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
    const newSchedule = parseClaudeScheduleResponse(responseText, currentSchedule);

    return NextResponse.json({ newSchedule });
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
  generalPreferences: any[],
  schedulePreferences: any[],
  scheduleInfo: any
): string {
  let prompt = `You are a scheduling assistant for a healthcare facility. Your task is to create an optimized 6-week schedule based on employee preferences while maintaining required staffing levels.

**Schedule Information:**
- Period: ${scheduleInfo.name}
- Dates: ${new Date(scheduleInfo.startDate).toLocaleDateString()} to ${new Date(scheduleInfo.endDate).toLocaleDateString()}
- Duration: 42 days (6 weeks)

**Staffing Requirements:**
- Day shift (0700-1900): 4 RNs per shift
- Night shift (1900-0700): 4 RNs per shift

**Current Schedule:**

`;

  // Add current schedule in table format
  prompt += 'Staff | Status | FTE | Days 1-42\n';
  prompt += '------|--------|-----|----------\n';
  for (const emp of currentSchedule.employees) {
    const shiftsStr = emp.shifts.map(s => s || '-').join(' | ');
    prompt += `${emp.staffNumber}. ${emp.name} | ${emp.status} | ${emp.fte} | ${shiftsStr}\n`;
  }

  // Add general preferences
  if (generalPreferences.length > 0) {
    prompt += '\n**General Preferences (apply to all schedules):**\n\n';
    for (const pref of generalPreferences) {
      prompt += `- **${pref.employeeName}**: ${pref.description}\n`;
    }
  }

  // Add schedule-specific preferences
  if (schedulePreferences.length > 0) {
    prompt += '\n**Schedule-Specific Preferences:**\n\n';
    for (const pref of schedulePreferences) {
      prompt += `- **${pref.employeeName}**: ${pref.description}\n`;
    }
  }

  prompt += `

**Instructions:**
1. Create a new 42-day schedule that:
   - Maintains 4 RNs on day shift (0700-1900) and 4 RNs on night shift (1900-0700) every day
   - Respects employee preferences as much as possible
   - Balances workload fairly across all staff
   - Avoids excessive consecutive shifts
   - Respects FTE allocations (FT staff work more than PT staff)

2. Output format: Provide the new schedule in CSV format with the following structure:
   ID,Staff,Skill,Status,FTE,1,2,3,4,5,...,42

   For each employee, list their shifts for each of the 42 days. Use:
   - "0700-1900" for day shifts
   - "1900-0700" for night shifts
   - "" (empty) for days off

3. Include ALL 20 employees in your response, maintaining their original ID, Staff number, Skill, Status, and FTE values.

4. Start your response with "SCHEDULE_CSV:" followed by the CSV data on the next line.

**Example format:**
SCHEDULE_CSV:
ID,Staff,Skill,Status,FTE,1,2,3,4,5,...,42
employee_1,1,RN,FT,1,0700-1900,0700-1900,,,0700-1900,...
employee_2,2,RN,FT,1,1900-0700,1900-0700,,,1900-0700,...
(continue for all 20 employees)
`;

  return prompt;
}

function parseClaudeScheduleResponse(response: string, currentSchedule: ScheduleData): ScheduleData {
  // Extract CSV data from response
  const csvMatch = response.match(/SCHEDULE_CSV:\s*([\s\S]+)/);
  if (!csvMatch) {
    throw new Error('Could not find CSV data in Claude response');
  }

  const csvData = csvMatch[1].trim();
  const lines = csvData.split('\n');

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

  return {
    employees,
    totalDays: currentSchedule.totalDays,
  };
}
