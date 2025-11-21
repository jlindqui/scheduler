'use server';

import { requireAuth } from '@/app/actions/auth';
import { prisma } from '@/app/lib/db';
import { AiChatType, AiFeedback } from '@prisma/client';

export interface CreateSessionParams {
  chatType: AiChatType;
  contextId?: string;
  contextType?: string;
}

export interface LogInteractionParams {
  sessionId: string;
  messageId: string;
  userMessage?: string;
  aiResponse?: string;
  promptUsed?: string;
  modelUsed?: string;
  responseTime?: number | bigint;
  tokensUsed?: number | bigint;
}

export interface UpdateFeedbackParams {
  sessionId: string;
  messageId: string;
  feedback: AiFeedback;
  feedbackNote?: string;
}

/**
 * Create a new AI chat session
 */
export async function createAiChatSession(params: CreateSessionParams) {
  try {
    const session = await requireAuth();
    
    if (!session.user?.id || !session.user?.organization?.id) {
      throw new Error('User or organization not found');
    }

    const chatSession = await prisma.aiChatSession.create({
      data: {
        userId: session.user.id,
        organizationId: session.user.organization.id,
        chatType: params.chatType,
        contextId: params.contextId,
        contextType: params.contextType,
      },
    });

    return { success: true, sessionId: chatSession.id };
  } catch (error) {
    console.error('Error creating AI chat session:', error);
    return { success: false, error: 'Failed to create chat session' };
  }
}

/**
 * Log an AI interaction (question + response)
 */
export async function logAiInteraction(params: LogInteractionParams) {
  try {
    await requireAuth();
    
    console.log('Creating AI interaction with params:', {
      ...params,
      responseTime: params.responseTime ? BigInt(params.responseTime) : null,
      tokensUsed: params.tokensUsed ? BigInt(params.tokensUsed) : null,
    });
    
    const interaction = await prisma.aiChatInteraction.create({
      data: {
        sessionId: params.sessionId,
        messageId: params.messageId,
        userMessage: params.userMessage,
        aiResponse: params.aiResponse,
        promptUsed: params.promptUsed,
        modelUsed: params.modelUsed,
        responseTime: params.responseTime ? BigInt(params.responseTime) : null,
        tokensUsed: params.tokensUsed ? BigInt(params.tokensUsed) : null,
      },
    });

    return { success: true, interactionId: interaction.id };
  } catch (error) {
    console.error('Error logging AI interaction:', error);
    return { success: false, error: 'Failed to log interaction' };
  }
}

/**
 * Update feedback for an AI interaction
 */
export async function updateAiInteractionFeedback(params: UpdateFeedbackParams) {
  try {
    await requireAuth();
    
    await prisma.aiChatInteraction.updateMany({
      where: {
        sessionId: params.sessionId,
        messageId: params.messageId,
      },
      data: {
        feedback: params.feedback,
        feedbackNote: params.feedbackNote,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating AI interaction feedback:', error);
    return { success: false, error: 'Failed to update feedback' };
  }
}

/**
 * End an AI chat session
 */
export async function endAiChatSession(sessionId: string) {
  try {
    await requireAuth();
    
    await prisma.aiChatSession.update({
      where: { id: sessionId },
      data: { endedAt: new Date() },
    });

    return { success: true };
  } catch (error) {
    console.error('Error ending AI chat session:', error);
    return { success: false, error: 'Failed to end session' };
  }
}

/**
 * Get AI chat sessions for admin review
 */
export async function getAiChatSessions({
  page = 1,
  limit = 50,
  chatType,
  userId,
  organizationId,
}: {
  page?: number;
  limit?: number;
  chatType?: AiChatType;
  userId?: string;
  organizationId?: string;
} = {}) {
  try {
    const session = await requireAuth();
    
    // Only super admins or organization admins can view sessions
    if (!session.user?.isSuperAdmin) {
      // Check if user is admin of their organization
      const isOrgAdmin = session.user?.organization?.members?.some(
        (member: { role: string; userId: string }) => 
          member.role === 'Admin' && member.userId === session.user.id
      );
      
      if (!isOrgAdmin) {
        throw new Error('Insufficient permissions');
      }
      
      // Non-super admins can only see their organization's data
      organizationId = session.user.organization?.id;
    }

    const where: any = {};
    if (chatType) where.chatType = chatType;
    if (userId) where.userId = userId;
    if (organizationId) where.organizationId = organizationId;

    const [sessions, total] = await Promise.all([
      prisma.aiChatSession.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
          interactions: {
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              messageId: true,
              userMessage: true,
              aiResponse: true,
              feedback: true,
              responseTime: true,
              tokensUsed: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.aiChatSession.count({ where }),
    ]);

    return {
      success: true,
      sessions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error('Error getting AI chat sessions:', error);
    return { success: false, error: 'Failed to get sessions' };
  }
}

/**
 * Get detailed AI chat session with all interactions
 */
export async function getAiChatSessionDetail(sessionId: string) {
  try {
    const session = await requireAuth();
    
    const chatSession = await prisma.aiChatSession.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        interactions: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!chatSession) {
      return { success: false, error: 'Session not found' };
    }

    // Check permissions
    if (!session.user?.isSuperAdmin) {
      const isOrgAdmin = session.user?.organization?.members?.some(
        (member: { role: string; userId: string }) => 
          member.role === 'Admin' && member.userId === session.user.id
      );
      
      if (!isOrgAdmin || chatSession.organizationId !== session.user.organization?.id) {
        throw new Error('Insufficient permissions');
      }
    }

    return { success: true, session: chatSession };
  } catch (error) {
    console.error('Error getting AI chat session detail:', error);
    return { success: false, error: 'Failed to get session detail' };
  }
}