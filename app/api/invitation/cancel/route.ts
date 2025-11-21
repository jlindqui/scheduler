import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { getServerSession } from '@/lib/auth/server-session';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get the user to verify they have a pending invitation
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        pendingOrganizationId: true,
        invitationAcceptedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.pendingOrganizationId || user.invitationAcceptedAt) {
      return NextResponse.json(
        { error: 'No pending invitation found for this user' },
        { status: 400 }
      );
    }

    // Verify the current user has permission to cancel this invitation
    // (they should be an admin of the pending organization)
    const currentUserOrgMembership = await prisma.organizationMember.findFirst({
      where: {
        userId: session.user.id,
        organizationId: user.pendingOrganizationId,
        role: 'Admin',
      },
    });

    if (!currentUserOrgMembership) {
      return NextResponse.json(
        { error: 'Unauthorized to cancel this invitation' },
        { status: 403 }
      );
    }

    // Cancel the invitation by clearing pending fields
    await prisma.user.update({
      where: { id: userId },
      data: {
        pendingOrganizationId: null,
        pendingRole: null,
        pendingBargainingUnitIds: [],
        invitedAt: null,
        invitedBy: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Invitation cancelled successfully',
    });

  } catch (error) {
    console.error('Error cancelling invitation:', error);
    return NextResponse.json(
      { error: 'Failed to cancel invitation' },
      { status: 500 }
    );
  }
}