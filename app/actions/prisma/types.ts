import {
  Agreement,
  Evidence,
  GrievanceFormData,
  GrievanceListItem,
  Grievor,
  WorkInformation,
  GrievanceFilingInfo,
  AgreementMetadata,
  ResolutionDetails
} from '@/app/lib/definitions';
import { Grievance, GrievanceEventType, Prisma, GrievanceStatus } from '@prisma/client';

// Minimal bargaining unit type for list queries
type MinimalBargainingUnit = {
  id: string;
  name: string;
  description: string | null;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
};


export type EvidenceWithRelations = Prisma.EvidenceGetPayload<{
  include: {
    grievance: true;
  };
}>;

export type GrievanceFormDataPartial = Partial<GrievanceFormData>;

// Optimized grievance list item with JSON fields preserved as-is from database
export type OptimizedGrievanceListItem = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  filedAt: Date;
  organizationId: string;
  bargainingUnitId: string;
  status: GrievanceStatus;
  currentStage: string | null;
  currentStep: string | null;
  agreementId: string | null;
  category: string | null;
  type: string | null;
  assignedToId: string | null;
  assignedTo: { id: string; name: string | null } | null;
  creator: { id: string; name: string | null } | null;
  lastUpdatedBy: { id: string; name: string | null; date: Date } | null;
  estimatedCost?: number | null;
  actualCost?: number | null;
  complaintNumber?: string | null;
  bargainingUnit: MinimalBargainingUnit;
  report: {
    id: string;
    grievors: Prisma.JsonValue;
    settlementDesired?: string;
    articlesViolated?: string | null;
    workInformation?: Prisma.JsonValue;
    statement?: string;
  } | null;
  resolutionDetails: Prisma.JsonValue | null;
};

export type GrievanceWithRelations = Grievance & {
  assignedTo: { 
    id: string; 
    name: string | null; 
    email: string | null; 
    image: string | null; 
  } | null;
  report: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    grievanceId: string;
    grievors: Prisma.JsonValue;
    workInformation: Prisma.JsonValue;
    statement: string;
    settlementDesired: string;
    articlesViolated: string | null;
  } | null;
  resolutionDetails: Prisma.JsonValue | null;
  creator: {
    id: string;
    name: string | null;
  } | null;
  lastUpdatedBy: {
    id: string;
    name: string | null;
    date: Date;
  } | null;
  events?: Array<{
    eventType: GrievanceEventType;
    user: {
      id: string;
      name: string | null;
    };
    createdAt: Date;
  }>;
};

// Re-export types from definitions for convenience
export type {
  Agreement,
  Evidence,
  GrievanceFormData,
  GrievanceListItem,
  Grievor,
  WorkInformation,
  GrievanceFilingInfo,
  AgreementMetadata,
  ResolutionDetails
}; 