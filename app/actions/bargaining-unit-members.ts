'use server';

import { revalidatePath } from 'next/cache';
import { MemberRole } from '@prisma/client';
import {
  fetchBargainingUnitMembersPrisma,
  fetchAvailableUsersForBargainingUnitPrisma,
  addUserToBargainingUnitPrisma,
  removeUserFromBargainingUnitPrisma,
  updateBargainingUnitMemberRolePrisma,
  BargainingUnitMemberWithUser
} from '@/app/actions/prisma/bargaining-unit-member-actions';
import { getOrganizationId } from './organization';
import { withAuth } from './auth';

// Internal implementations
async function fetchBargainingUnitMembersInternal(
  bargainingUnitId: string
): Promise<BargainingUnitMemberWithUser[]> {
  try {
    const organizationId = await getOrganizationId();
    
    const members = await fetchBargainingUnitMembersPrisma(bargainingUnitId, organizationId);
    
    return members;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch bargaining unit members.');
  }
}

async function fetchAvailableUsersForBargainingUnitInternal(
  bargainingUnitId: string
): Promise<Array<{ id: string; name: string | null; email: string | null }>> {
  try {
    const organizationId = await getOrganizationId();
    
    const users = await fetchAvailableUsersForBargainingUnitPrisma(bargainingUnitId, organizationId);
    
    return users;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch available users.');
  }
}

async function addUserToBargainingUnitInternal(
  userId: string,
  bargainingUnitId: string,
  role: MemberRole = MemberRole.Member
): Promise<void> {
  try {
    const organizationId = await getOrganizationId();
    
    await addUserToBargainingUnitPrisma(userId, bargainingUnitId, organizationId, role);
    
    revalidatePath(`/product/settings/bargaining-units/${bargainingUnitId}/view`, 'page');
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to add user to bargaining unit.');
  }
}

async function removeUserFromBargainingUnitInternal(
  userId: string,
  bargainingUnitId: string
): Promise<void> {
  try {
    const organizationId = await getOrganizationId();
    
    await removeUserFromBargainingUnitPrisma(userId, bargainingUnitId, organizationId);
    
    revalidatePath(`/product/settings/bargaining-units/${bargainingUnitId}/view`, 'page');
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to remove user from bargaining unit.');
  }
}

async function updateBargainingUnitMemberRoleInternal(
  userId: string,
  bargainingUnitId: string,
  role: MemberRole
): Promise<void> {
  try {
    const organizationId = await getOrganizationId();
    
    await updateBargainingUnitMemberRolePrisma(userId, bargainingUnitId, organizationId, role);
    
    revalidatePath(`/product/settings/bargaining-units/${bargainingUnitId}/view`, 'page');
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to update member role.');
  }
}

// Exported wrapped versions
export const fetchBargainingUnitMembers = withAuth(fetchBargainingUnitMembersInternal);
export const fetchAvailableUsersForBargainingUnit = withAuth(fetchAvailableUsersForBargainingUnitInternal);
export const addUserToBargainingUnit = withAuth(addUserToBargainingUnitInternal);
export const removeUserFromBargainingUnit = withAuth(removeUserFromBargainingUnitInternal);
export const updateBargainingUnitMemberRole = withAuth(updateBargainingUnitMemberRoleInternal);