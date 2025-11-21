'use server';

import {
  chatWithSchedulingAgent,
  startAvailabilitySubmissionConversation,
  type Message,
  type ConversationContext,
  type AgentResponse,
} from '@/app/lib/scheduling-agent';

/**
 * Server action to send a message to the scheduling agent
 */
export async function sendMessageToAgent(
  context: ConversationContext,
  messages: Message[]
): Promise<AgentResponse> {
  try {
    return await chatWithSchedulingAgent(context, messages);
  } catch (error) {
    console.error('Error in sendMessageToAgent:', error);
    throw new Error('Failed to communicate with scheduling agent');
  }
}

/**
 * Server action to start a new availability submission conversation
 */
export async function startAvailabilityConversation(
  staffNumber: number
): Promise<AgentResponse> {
  try {
    return await startAvailabilitySubmissionConversation(staffNumber);
  } catch (error) {
    console.error('Error starting conversation:', error);
    throw new Error('Failed to start availability conversation');
  }
}
