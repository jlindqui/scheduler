import { NextResponse } from 'next/server';
import { parseScheduleCSV } from '@/app/lib/schedule-parser';

export async function GET() {
  try {
    const scheduleData = await parseScheduleCSV();
    return NextResponse.json(scheduleData);
  } catch (error) {
    console.error('Failed to parse schedule CSV:', error);
    return NextResponse.json(
      { error: 'Failed to load schedule data' },
      { status: 500 }
    );
  }
}
