import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { token, email } = await request.json();

    if (!token || !email) {
      return NextResponse.json(
        { error: 'Invalid invitation data' },
        { status: 400 }
      );
    }

    // Verify the token (simple verification using email and timestamp)
    // In production, you might want to use a more secure token system
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        pendingOrganizationId: true,
        pendingRole: true,
        pendingBargainingUnitIds: true,
        invitedAt: true,
        invitationAcceptedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid invitation - user not found' },
        { status: 404 }
      );
    }

    if (!user.pendingOrganizationId || !user.pendingRole) {
      return NextResponse.json(
        { error: 'No pending invitation found for this user' },
        { status: 404 }
      );
    }

    if (user.invitationAcceptedAt) {
      return NextResponse.json(
        { error: 'This invitation has already been accepted' },
        { status: 400 }
      );
    }

    // Verify token matches (simple hash of email + invitedAt timestamp)
    if (user.invitedAt) {
      const expectedToken = crypto
        .createHash('sha256')
        .update(`${email.toLowerCase()}-${user.invitedAt.getTime()}`)
        .digest('hex')
        .substring(0, 32);

      if (token !== expectedToken) {
        return NextResponse.json(
          { error: 'Invalid or expired invitation token' },
          { status: 400 }
        );
      }
    }

    // Get organization details
    const organization = await prisma.organization.findUnique({
      where: { id: user.pendingOrganizationId },
      select: { name: true },
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Accept the invitation - add user to organization
    await prisma.$transaction(async (tx) => {
      // Add user to organization
      await tx.organizationMember.create({
        data: {
          userId: user.id,
          organizationId: user.pendingOrganizationId!,
          role: user.pendingRole!,
        },
      });

      // Add user to bargaining units if specified
      if (user.pendingBargainingUnitIds && user.pendingBargainingUnitIds.length > 0) {
        // Check which bargaining units the user is not already a member of
        const existingMemberships = await tx.bargainingUnitMember.findMany({
          where: {
            userId: user.id,
            bargainingUnitId: { in: user.pendingBargainingUnitIds },
          },
          select: { bargainingUnitId: true },
        });

        const existingBargainingUnitIds = existingMemberships.map(m => m.bargainingUnitId);
        const newBargainingUnitIds = user.pendingBargainingUnitIds.filter(
          id => !existingBargainingUnitIds.includes(id)
        );

        // Only create memberships for bargaining units they're not already in
        if (newBargainingUnitIds.length > 0) {
          await tx.bargainingUnitMember.createMany({
            data: newBargainingUnitIds.map((bargainingUnitId) => ({
              userId: user.id,
              bargainingUnitId,
              role: 'Member',
            })),
          });
        }
      }

      // Update user to mark invitation as accepted
      await tx.user.update({
        where: { id: user.id },
        data: {
          invitationAcceptedAt: new Date(),
          currentOrganizationId: user.pendingOrganizationId,
          emailVerified: true, // Auto-verify email since they clicked the link
          // Clear pending fields
          pendingOrganizationId: null,
          pendingRole: null,
          pendingBargainingUnitIds: [],
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Successfully joined ${organization.name}!`,
      organizationName: organization.name,
    });

  } catch (error) {
    console.error('Error accepting invitation:', error);
    
    // Check for unique constraint violation (user already in org)
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'You are already a member of this organization' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}