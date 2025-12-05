'use server';

import { prisma } from '@/app/lib/db';
import { withAuth } from "./auth";
import { getServerSession } from "@/lib/auth/server-session";

// Get the current organization ID for the logged-in user
async function getOrganizationIdInternal(): Promise<string> {
  const session = await getServerSession();
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error('User not logged in');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currentOrganizationId: true },
  });

  if (!user?.currentOrganizationId) {
    throw new Error('No organization found for user');
  }

  return user.currentOrganizationId;
}

export const getOrganizationId = withAuth(getOrganizationIdInternal);
