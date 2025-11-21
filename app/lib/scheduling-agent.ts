// Scheduling Agent - LLM-powered conversational assistant for staff scheduling
import Anthropic from '@anthropic-ai/sdk';
import {
  staff,
  getStaffByNumber,
  getLeavesForStaff,
  getBanksForStaff,
  getExpiringBanks,
  getDaysUntilExpiry,
  getDateForDay,
  scheduleMetadata,
  cbaRules,
  type StaffMember,
  type TimeOffBank,
  type LeaveEntry,
} from './mock-schedule-data';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export type ConversationContext = {
  staffNumber: number;
  conversationType: 'availability_submission' | 'time_off_request' | 'shift_swap' | 'general_inquiry';
  scheduleId: string;
  currentStep?: string;
  collectedData?: Record<string, any>;
};

export type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export type AgentResponse = {
  message: string;
  context: ConversationContext;
  suggestedActions?: Array<{
    label: string;
    value: string;
  }>;
  metadata?: Record<string, any>;
};

/**
 * Build system prompt with staff context for availability submission
 */
function buildAvailabilitySubmissionPrompt(
  staffMember: StaffMember,
  leaves: LeaveEntry[],
  banks: TimeOffBank[]
): string {
  const expiringBanks = getExpiringBanks(staffMember.staffNumber, 60);
  const cbaReqs = staffMember.status === 'FT' ? cbaRules.availabilityMinimum.fullTime : cbaRules.availabilityMinimum.partTime;

  return `You are an AI scheduling assistant helping ${staffMember.name}, a ${staffMember.status} (${staffMember.fte} FTE) Registered Nurse, submit their availability for the upcoming schedule period.

## Schedule Information
- Period: ${scheduleMetadata.name}
- Dates: ${scheduleMetadata.startDate.toLocaleDateString()} to ${scheduleMetadata.endDate.toLocaleDateString()}
- Total days: ${scheduleMetadata.totalDays} days (6 weeks)

## Staff Profile
- Name: ${staffMember.name}
- Status: ${staffMember.status === 'FT' ? 'Full-Time' : 'Part-Time'} (${staffMember.fte} FTE)
- Seniority: ${staffMember.seniorityYears} years
- Can work day shifts: ${staffMember.canWorkDayShift ? 'Yes' : 'No'}
- Can work night shifts: ${staffMember.canWorkNightShift ? 'Yes' : 'No'}

## Approved Leaves
${leaves.length > 0 ? leaves.map(l => {
    const startDate = getDateForDay(l.startDay);
    const endDate = getDateForDay(l.endDay);
    return `- ${l.leaveType.toUpperCase()}: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()} (${l.hours} hours)`;
  }).join('\n') : '- No approved leaves for this period'}

## Time Off Banks
${banks.map(b => {
    const days = getDaysUntilExpiry(b);
    const expiryWarning = days !== null && days <= 60 ? ` ⚠️ EXPIRES IN ${days} DAYS` : '';
    return `- ${b.bankType}: ${b.balanceHours} hours${expiryWarning}`;
  }).join('\n')}

${expiringBanks.length > 0 ? `\n## ⚠️ IMPORTANT: Expiring Banks
You should proactively suggest that ${staffMember.name} use these banks before they expire:
${expiringBanks.map(b => `- ${b.bankType}: ${b.balanceHours} hours (expires in ${getDaysUntilExpiry(b)} days)`).join('\n')}
` : ''}

## CBA Requirements
- Minimum availability: ${cbaReqs.minHoursPerWeek} hours per week
- Minimum weekends: ${cbaReqs.minWeekends} weekends in the period
- Maximum consecutive shifts: ${cbaRules.maxConsecutiveShifts}
- Minimum rest between shifts: ${cbaRules.minRestBetweenShifts} hours
${cbaRules.vacationWeekendRule.requiresWeekendBefore ? `- Weekend before vacation: ${cbaRules.vacationWeekendRule.description}` : ''}

## Your Role
You are guiding ${staffMember.name} through the availability submission process. Follow these steps:

1. **Greeting & Context**: Welcome them and explain what needs to be done
2. **Show Current Info**: Present their approved leaves and current availability status
3. **CBA Validation**: Check if their current/proposed availability meets CBA minimums
4. **Strategic Suggestions**:
   - Suggest additional availability on days where the unit needs coverage
   - Recommend which time off banks to use for requests (prioritize expiring banks)
   - Remind about weekend-before-vacation rules if applicable
5. **Preference Collection**: Ask about:
   - Minimum and maximum shifts desired
   - Maximum consecutive shifts preference
   - Preferred days of week
   - Weekend preferences (knowing they can't work sequential weekends)
   - Any staff they prefer to work with or avoid
6. **Confirmation**: Summarize everything and get sign-off

## Communication Style
- Friendly and conversational but professional
- Proactive about CBA rules and bank optimization
- Ask one question at a time to avoid overwhelming
- Use specific examples and dates
- Highlight important warnings (like expiring banks) clearly
- Validate their choices against CBA rules in real-time

## Important Notes
- ALWAYS check CBA compliance before accepting availability
- ALWAYS suggest using expiring banks first for time off requests
- ALWAYS remind about weekend rules for vacation periods
- Keep responses concise (2-3 short paragraphs max)
- Focus on one topic per response`;
}

/**
 * Main function to handle agent conversations
 */
export async function chatWithSchedulingAgent(
  context: ConversationContext,
  messages: Message[]
): Promise<AgentResponse> {
  try {
    const staffMember = getStaffByNumber(context.staffNumber);
    if (!staffMember) {
      throw new Error(`Staff member ${context.staffNumber} not found`);
    }

    const leaves = getLeavesForStaff(context.staffNumber);
    const banks = getBanksForStaff(context.staffNumber);

    // Build system prompt based on conversation type
    let systemPrompt = '';

    if (context.conversationType === 'availability_submission') {
      systemPrompt = buildAvailabilitySubmissionPrompt(staffMember, leaves, banks);
    } else {
      // Default general prompt
      systemPrompt = `You are a helpful scheduling assistant for ${staffMember.name}, a ${staffMember.status} RN at City Hospital.`;
    }

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    });

    const assistantMessage = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    // Extract any action items or next steps from the response
    const suggestedActions = extractSuggestedActions(assistantMessage, context);

    return {
      message: assistantMessage,
      context: {
        ...context,
        currentStep: determineCurrentStep(messages.length, context),
      },
      suggestedActions,
      metadata: {
        model: response.model,
        usage: response.usage,
      },
    };
  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw new Error('Failed to get response from scheduling agent');
  }
}

/**
 * Extract suggested quick-reply actions from the agent's response
 */
function extractSuggestedActions(
  message: string,
  context: ConversationContext
): Array<{ label: string; value: string }> {
  const actions: Array<{ label: string; value: string }> = [];

  // Common quick replies based on context
  if (message.toLowerCase().includes('would you like')) {
    actions.push({ label: 'Yes', value: 'yes' });
    actions.push({ label: 'No', value: 'no' });
  }

  if (message.toLowerCase().includes('do you want')) {
    actions.push({ label: 'Yes, please', value: 'yes' });
    actions.push({ label: 'No, thanks', value: 'no' });
  }

  // Add context-specific actions
  if (context.conversationType === 'availability_submission') {
    if (message.toLowerCase().includes('submit') || message.toLowerCase().includes('confirm')) {
      actions.push({ label: 'Confirm and submit', value: 'confirm' });
      actions.push({ label: 'Make changes', value: 'edit' });
    }
  }

  return actions;
}

/**
 * Determine what step of the conversation we're in
 */
function determineCurrentStep(messageCount: number, context: ConversationContext): string {
  if (context.conversationType === 'availability_submission') {
    if (messageCount <= 2) return 'greeting';
    if (messageCount <= 4) return 'showing_context';
    if (messageCount <= 8) return 'collecting_availability';
    if (messageCount <= 12) return 'collecting_preferences';
    return 'finalizing';
  }

  return 'in_progress';
}

/**
 * Start a new availability submission conversation
 */
export async function startAvailabilitySubmissionConversation(
  staffNumber: number,
  scheduleId: string = 'schedule_2025_jan_feb'
): Promise<AgentResponse> {
  const context: ConversationContext = {
    staffNumber,
    conversationType: 'availability_submission',
    scheduleId,
    currentStep: 'greeting',
    collectedData: {},
  };

  // Initial greeting message
  const initialMessage: Message = {
    role: 'user',
    content: "Hi! I'm ready to submit my availability for next month's schedule.",
  };

  return await chatWithSchedulingAgent(context, [initialMessage]);
}
