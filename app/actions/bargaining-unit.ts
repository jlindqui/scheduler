'use server';

import { revalidatePath } from 'next/cache';
import { BargainingUnit } from '@/app/lib/definitions';
import {
  fetchBargainingUnitsPrisma,
  fetchBargainingUnitsWithAgreementsPrisma,
  fetchBargainingUnitsWithStatsPrisma,
  fetchBargainingUnitByIdPrisma,
  createBargainingUnitPrisma,
  updateBargainingUnitPrisma,
  deleteBargainingUnitPrisma,
  getBargainingUnitStatsPrisma,
  getLatestAgreementByBargainingUnitPrisma,
  getLatestAgreementIdByBargainingUnitPrisma,
  BargainingUnitWithStats
} from '@/app/actions/prisma/bargaining-unit-actions';
import { addUserToBargainingUnitPrisma } from '@/app/actions/prisma/bargaining-unit-member-actions';
import { MemberRole } from '@prisma/client';
import { getOrganizationId } from './organization';
import { withAuth, requireAuth } from './auth';
import {
  createBargainingUnitSchema,
  updateBargainingUnitSchema,
  deleteBargainingUnitSchema,
  idSchema,
  validateFormData,
  sanitizeString
} from '@/app/lib/validations';



// Internal implementations
async function fetchBargainingUnitsInternal(): Promise<BargainingUnit[]> {
  try {
    const organizationId = await getOrganizationId();

    // Get current user and their role to filter bargaining units
    const session = await requireAuth();
    const currentUserId = session.user.id;

    // Get user role in the organization
    const userRole = session.user.organization?.members?.find(
      (member: { role: string; userId: string }) => member.userId === currentUserId
    )?.role;

    const bargainingUnits = await fetchBargainingUnitsPrisma(organizationId, currentUserId, userRole);

    return bargainingUnits;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch bargaining units.');
  }
}

async function fetchBargainingUnitsWithAgreementsInternal(): Promise<BargainingUnit[]> {
  try {
    const organizationId = await getOrganizationId();

    // Get current user and their role to filter bargaining units
    const session = await requireAuth();
    const currentUserId = session.user.id;

    // Get user role in the organization
    const userRole = session.user.organization?.members?.find(
      (member: { role: string; userId: string }) => member.userId === currentUserId
    )?.role;

    const bargainingUnits = await fetchBargainingUnitsWithAgreementsPrisma(organizationId, currentUserId, userRole);

    return bargainingUnits;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch bargaining units with agreements.');
  }
}

async function fetchBargainingUnitsWithStatsInternal(): Promise<BargainingUnitWithStats[]> {
  try {
    const organizationId = await getOrganizationId();

    // Get current user and their role to filter bargaining units
    const session = await requireAuth();
    const currentUserId = session.user.id;

    // Get user role in the organization
    const userRole = session.user.organization?.members?.find(
      (member: { role: string; userId: string }) => member.userId === currentUserId
    )?.role;

    const bargainingUnits = await fetchBargainingUnitsWithStatsPrisma(organizationId, currentUserId, userRole);

    return bargainingUnits;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch bargaining units with statistics.');
  }
}

async function fetchBargainingUnitByIdInternal(id: string): Promise<BargainingUnit | null> {
  try {
    // Validate ID format
    const validatedId = idSchema.parse(id);

    const organizationId = await getOrganizationId();

    // Get current user and their role to filter bargaining units
    const session = await requireAuth();
    const currentUserId = session.user.id;

    // Get user role in the organization
    const userRole = session.user.organization?.members?.find(
      (member: { role: string; userId: string }) => member.userId === currentUserId
    )?.role;

    const bargainingUnit = await fetchBargainingUnitByIdPrisma(validatedId, organizationId, currentUserId, userRole);

    return bargainingUnit;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch bargaining unit.');
  }
}

async function createBargainingUnitInternal(formData: FormData): Promise<{ id: string }> {
  try {
    // Validate and sanitize input data
    const validatedData = validateFormData(createBargainingUnitSchema, formData);


    const sanitizedName = sanitizeString(validatedData.name);
    const sanitizedDescription = validatedData.description ? sanitizeString(validatedData.description) : undefined;


    // Sanitize union contact fields
    const sanitizedUnionContactName = validatedData.unionContactName ? sanitizeString(validatedData.unionContactName) : null;
    const sanitizedUnionContactEmail = validatedData.unionContactEmail ? sanitizeString(validatedData.unionContactEmail) : null;
    const sanitizedUnionContactPhone = validatedData.unionContactPhone ? sanitizeString(validatedData.unionContactPhone) : null;
    const logoFilename = validatedData.logoFilename ? sanitizeString(validatedData.logoFilename) : null;

    const organizationId = await getOrganizationId();


    // Get the current user
    const session = await requireAuth();
    const currentUserId = session.user.id;

    // Check if user is an Admin - only Admin users can create bargaining units
    const userRole = session.user.organization?.members?.find(
      (member: { role: string; userId: string }) => member.userId === currentUserId
    )?.role;

    if (userRole !== 'Admin') {
      throw new Error('Only Admin users can create bargaining units.');
    }
    

    // Create the bargaining unit
    const bargainingUnit = await createBargainingUnitPrisma(
      sanitizedName,
      sanitizedDescription,
      organizationId,
      currentUserId,
      sanitizedUnionContactName,
      sanitizedUnionContactEmail,
      sanitizedUnionContactPhone,
      logoFilename
    );

    // Note: Admin users automatically have access to all bargaining units,
    // so we don't need to explicitly add them as members

    revalidatePath('/product/settings/bargaining-units', 'page');

    // Return the created bargaining unit's ID
    return { id: bargainingUnit.id };
  } catch (error) {
    // Check if this is a redirect (not an actual error)
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error; // Re-throw to allow the redirect to happen
    }

    console.error('Database Error creating bargaining unit:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);

      if (error.message.includes('Validation failed')) {
        throw error; // Re-throw validation errors with original message
      }

      // Throw the actual error message for debugging
      throw new Error(`Failed to create bargaining unit: ${error.message}`);
    }
    throw new Error('Failed to create bargaining unit.');
  }
}

async function updateBargainingUnitInternal(formData: FormData): Promise<any> {
  try {
    // Validate and sanitize input data
    const validatedData = validateFormData(updateBargainingUnitSchema, formData);


    const sanitizedName = sanitizeString(validatedData.name);
    const sanitizedDescription = typeof validatedData.description === 'string' ? sanitizeString(validatedData.description) : null;


    // Sanitize union contact fields
    const sanitizedUnionContactName = validatedData.unionContactName ? sanitizeString(validatedData.unionContactName) : null;
    const sanitizedUnionContactEmail = validatedData.unionContactEmail ? sanitizeString(validatedData.unionContactEmail) : null;
    const sanitizedUnionContactPhone = validatedData.unionContactPhone ? sanitizeString(validatedData.unionContactPhone) : null;
    const logoFilename = validatedData.logoFilename ? sanitizeString(validatedData.logoFilename) : null;

    const organizationId = await getOrganizationId();


    // Get the current user
    const session = await requireAuth();
    const currentUserId = session.user.id;

    const updatedBargainingUnit = await updateBargainingUnitPrisma(
      validatedData.id,
      sanitizedName,
      sanitizedDescription,
      organizationId,
      currentUserId,
      sanitizedUnionContactName,
      sanitizedUnionContactEmail,
      sanitizedUnionContactPhone,
      logoFilename
    );

    revalidatePath('/product/settings/bargaining-units');
    revalidatePath(`/product/settings/bargaining-units/${validatedData.id}/view`);

    return updatedBargainingUnit;
  } catch (error) {
    console.error('Database Error:', error);
    if (error instanceof Error && error.message.includes('Validation failed')) {
      throw error; // Re-throw validation errors with original message
    }
    throw new Error('Failed to update bargaining unit.');
  }
}

async function deleteBargainingUnitInternal(formData: FormData): Promise<void> {
  try {
    // Validate input data
    const validatedData = validateFormData(deleteBargainingUnitSchema, formData);

    const organizationId = await getOrganizationId();

    // Get the current user and check permissions
    const session = await requireAuth();
    const currentUserId = session.user.id;

    // Check if user is an Admin - only Admin users can delete bargaining units
    const userRole = session.user.organization?.members?.find(
      (member: { role: string; userId: string }) => member.userId === currentUserId
    )?.role;

    if (userRole !== 'Admin') {
      throw new Error('Only Admin users can delete bargaining units.');
    }
    
    await deleteBargainingUnitPrisma(validatedData.id, organizationId);

    revalidatePath('/product/settings/bargaining-units', 'page');
  } catch (error) {
    // Check if this is a redirect (not an actual error)
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error; // Re-throw to allow the redirect to happen
    }
    
    console.error('Database Error:', error);
    if (error instanceof Error && error.message.includes('Validation failed')) {
      throw error; // Re-throw validation errors with original message
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to delete bargaining unit.');
  }
}

async function getBargainingUnitStatsInternal(id: string) {
  try {
    // Validate ID format
    const validatedId = idSchema.parse(id);
    
    const organizationId = await getOrganizationId();
    
    const stats = await getBargainingUnitStatsPrisma(validatedId, organizationId);

    return stats;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch bargaining unit statistics.');
  }
}

async function getLatestAgreementByBargainingUnitInternal(bargainingUnitId: string) {
  try {
    // Validate ID format with more flexible schema
    const validatedId = idSchema.parse(bargainingUnitId);
    
    const organizationId = await getOrganizationId();
    
    const latestAgreement = await getLatestAgreementByBargainingUnitPrisma(validatedId, organizationId);

    return latestAgreement;
  } catch (error) {
    console.error('🚨 Database Error in getLatestAgreementByBargainingUnitInternal:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch latest agreement for bargaining unit.');
  }
}

async function getLatestAgreementIdByBargainingUnitInternal(bargainingUnitId: string): Promise<string | null> {
  try {
    // Validate ID format
    const validatedId = idSchema.parse(bargainingUnitId);
    
    const organizationId = await getOrganizationId();
    
    const latestAgreementId = await getLatestAgreementIdByBargainingUnitPrisma(validatedId, organizationId);

    return latestAgreementId;
  } catch (error) {
    console.error('🚨 Database Error in getLatestAgreementIdByBargainingUnitInternal:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch latest agreement ID for bargaining unit.');
  }
}

// Exported wrapped versions
export const fetchBargainingUnits = withAuth(fetchBargainingUnitsInternal);
export const fetchBargainingUnitsWithAgreements = withAuth(fetchBargainingUnitsWithAgreementsInternal);
export const fetchBargainingUnitsWithStats = withAuth(fetchBargainingUnitsWithStatsInternal);
export const fetchBargainingUnitById = withAuth(fetchBargainingUnitByIdInternal);
export const createBargainingUnit = withAuth(createBargainingUnitInternal);
export const updateBargainingUnit = withAuth(updateBargainingUnitInternal);
export const deleteBargainingUnit = withAuth(deleteBargainingUnitInternal);
export const getBargainingUnitStats = withAuth(getBargainingUnitStatsInternal);
export const getLatestAgreementByBargainingUnit = withAuth(getLatestAgreementByBargainingUnitInternal);
export const getLatestAgreementIdByBargainingUnit = withAuth(getLatestAgreementIdByBargainingUnitInternal);