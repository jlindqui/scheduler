import { z } from 'zod';

export const GrievorsSchema = z.object({
  lastName: z.string().min(1, "Last name is required"),
  firstName: z.string().min(1, "First name is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  email: z.string().email("Invalid email address"),
  memberNumber: z.string().min(1, "Member number is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
});

export const WorkInformationSchema = z.object({
  employer: z.string().min(1, "Employer is required"),
  supervisor: z.string().min(1, "Supervisor is required"),
  jobTitle: z.string().min(1, "Job title is required"),
  workLocation: z.string().min(1, "Work location is required"),
  employmentStatus: z.string().min(1, "Employment status is required"),
});

export const GrievanceFormSchema = z.object({
  grievors: z.array(GrievorsSchema),
  workInformation: WorkInformationSchema,
  statement: z.string().min(1, "Statement of grievance is required"),
  settlementDesired: z.string().min(1, "Settlement desired is required"),
  articlesViolated: z.string().optional(),
  type: z.enum(['INDIVIDUAL', 'GROUP', 'POLICY']).default('INDIVIDUAL'),
  fileSource: z.string().optional(),
  agreementId: z.string().min(1, "Collective agreement is required")
});

export const CaseFormSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['theft', 'absenteeism']),
  status: z.enum(['Missing Facts', 'Decision Available']),
  date: z.string(),
  agreement_id: z.string(),
  organization_id: z.string(),
});

export const CreateCase = CaseFormSchema.omit({ id: true, date: true, status: true });
export const UpdateCase = CaseFormSchema.omit({ id: true, date: true, type: true, name: true });

export const AgreementFormSchema = z.object({
  id: z.string(),
  name: z.string(),
  effectiveDate: z.string(),
  expiryDate: z.string(),
});

export const CreateAgreement = AgreementFormSchema.omit({ id: true });

export const GrievanceParserSchema = z.object({
  grievors: z.array(z.object({
    firstName: z.string(),
    lastName: z.string(),
    memberNumber: z.string(),
    local: z.string(),
    address: z.string(),
    city: z.string(),
    postalCode: z.string(),
    email: z.string(),
    phoneNumber: z.string()
  })),
  workInformation: z.object({
    employer: z.string(),
    supervisor: z.string(),
    jobTitle: z.string(),
    workLocation: z.string(),
    employmentStatus: z.string()
  }),
  statement: z.string(),
  articlesViolated: z.string(),
  settlementDesired: z.string(),
  category: z.string()
}); 