export type StorageEntityType =
  | "agreement"
  | "complaint"
  | "incident"
  | "grievance"
  | "evidence";

/**
 * Get bucket names from environment variables with fallbacks
 */
export const STORAGE_BUCKETS = {
  // REFERENCE_CASES: process.env.GCS_REFERENCE_CASES_BUCKET_NAME || "bb-reference-cases",
  // AGREEMENTS: process.env.GCS_AGREEMENTS_BUCKET_NAME || "bb-agreements",
  // EVIDENCE: process.env.GCS_EVIDENCE_BUCKET_NAME || "bb-case-evidence"
  FOR_ALL: process.env.GCS_FOR_ALL_BUCKET_NAME || "bb-for-all",
} as const;
