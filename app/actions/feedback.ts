'use server';

import { prisma } from '@/app/lib/db';
import { getServerSession } from '@/lib/auth/server-session';
import { revalidatePath } from 'next/cache';

export interface CreateFeedbackParams {
  feedback: string;
  category?: 'SERIOUS_ERROR' | 'MINOR_ERROR' | 'SUGGESTED_IMPROVEMENT' | 'SOMETHING_ELSE';
  organizationId?: string;
}

export interface UpdateFeedbackParams {
  id: string;
  category?: 'SERIOUS_ERROR' | 'MINOR_ERROR' | 'SUGGESTED_IMPROVEMENT' | 'SOMETHING_ELSE';
}

export interface ToggleFeedbackStatusParams {
  id: string;
}

export interface SetFeedbackStatusParams {
  id: string;
  status: 'OPEN' | 'CLOSED';
}

export async function createFeedback(params: CreateFeedbackParams) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      throw new Error('Not authenticated');
    }

    // Use the provided organizationId or fall back to user's current organization
    const organizationId = params.organizationId || session.user.organization?.id;

    if (!organizationId) {
      throw new Error('User must be associated with an organization to submit feedback');
    }

    const feedback = await prisma.feedback.create({
      data: {
        userId: session.user.id,
        organizationId: organizationId,
        feedback: params.feedback,
        category: params.category || null,
      },
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
      },
    });

    revalidatePath('/product/admin/feedback');

    return { success: true, feedback };
  } catch (error) {
    console.error('Failed to create feedback:', error);
    throw new Error('Failed to create feedback');
  }
}

export async function updateFeedback(params: UpdateFeedbackParams) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      throw new Error('Not authenticated');
    }

    // Check if user is admin or super admin
    const userRole = session?.user?.organization?.members?.find(
      (member) => member.userId === session.user.id
    )?.role;
    const isAdmin = userRole === 'Admin' || session?.user?.isSuperAdmin;

    if (!isAdmin) {
      throw new Error('Not authorized');
    }

    // Check if regular admin is trying to update feedback from another organization
    if (!session?.user?.isSuperAdmin) {
      const existingFeedback = await prisma.feedback.findUnique({
        where: { id: params.id },
        select: { organizationId: true },
      });

      if (!existingFeedback) {
        throw new Error('Feedback not found');
      }

      if (existingFeedback.organizationId !== session.user.organization?.id) {
        throw new Error('Not authorized to modify feedback from another organization');
      }
    }

    const feedback = await prisma.feedback.update({
      where: { id: params.id },
      data: {
        category: params.category,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    revalidatePath('/product/admin/feedback');

    return { success: true, feedback };
  } catch (error) {
    console.error('Failed to update feedback:', error);
    throw new Error('Failed to update feedback');
  }
}

export async function getFeedback() {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      throw new Error('Not authenticated');
    }

    // Check if user is admin or super admin
    const userRole = session?.user?.organization?.members?.find(
      (member) => member.userId === session.user.id
    )?.role;
    const isAdmin = userRole === 'Admin' || session?.user?.isSuperAdmin;

    if (!isAdmin) {
      throw new Error('Not authorized');
    }

    // SuperAdmins can see all feedback, regular admins only see their organization's feedback
    const whereClause = session?.user?.isSuperAdmin
      ? {}
      : { organizationId: session.user.organization?.id };

    const feedback = await prisma.feedback.findMany({
      where: whereClause,
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
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return { success: true, feedback };
  } catch (error) {
    console.error('Failed to get feedback:', error);
    throw new Error('Failed to get feedback');
  }
}

export async function deleteFeedback(id: string) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      throw new Error('Not authenticated');
    }

    // Check if user is super admin
    if (!session?.user?.isSuperAdmin) {
      throw new Error('Not authorized');
    }

    await prisma.feedback.delete({
      where: { id },
    });

    revalidatePath('/product/admin/feedback');

    return { success: true };
  } catch (error) {
    console.error('Failed to delete feedback:', error);
    throw new Error('Failed to delete feedback');
  }
}

export async function toggleFeedbackStatus(params: ToggleFeedbackStatusParams) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      throw new Error('Not authenticated');
    }

    // Check if user is admin or super admin
    const userRole = session?.user?.organization?.members?.find(
      (member) => member.userId === session.user.id
    )?.role;
    const isAdmin = userRole === 'Admin' || session?.user?.isSuperAdmin;

    if (!isAdmin) {
      throw new Error('Not authorized');
    }

    // Get current feedback to toggle status
    const currentFeedback = await prisma.feedback.findUnique({
      where: { id: params.id },
      select: { status: true, organizationId: true },
    });

    if (!currentFeedback) {
      throw new Error('Feedback not found');
    }

    // Regular admins can only modify feedback from their own organization
    if (!session?.user?.isSuperAdmin && currentFeedback.organizationId !== session.user.organization?.id) {
      throw new Error('Not authorized to modify feedback from another organization');
    }

    // Toggle status
    const newStatus = currentFeedback.status === 'OPEN' ? 'CLOSED' : 'OPEN';

    const feedback = await prisma.feedback.update({
      where: { id: params.id },
      data: {
        status: newStatus,
      },
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
      },
    });

    revalidatePath('/product/admin/feedback');

    return { success: true, feedback, newStatus };
  } catch (error) {
    console.error('Failed to toggle feedback status:', error);
    throw new Error('Failed to toggle feedback status');
  }
}

export async function setFeedbackStatus(params: SetFeedbackStatusParams) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      throw new Error('Not authenticated');
    }

    // Check if user is super admin (only super admins can explicitly set status)
    if (!session?.user?.isSuperAdmin) {
      throw new Error('Not authorized - Super admin access required');
    }

    const feedback = await prisma.feedback.update({
      where: { id: params.id },
      data: {
        status: params.status,
      },
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
      },
    });

    revalidatePath('/product/admin/feedback');

    return { success: true, feedback, newStatus: params.status };
  } catch (error) {
    console.error('Failed to set feedback status:', error);
    throw new Error('Failed to set feedback status');
  }
}