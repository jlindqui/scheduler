"use client";

import GrievanceView from "./grievance-view";

// This wrapper component ensures GrievanceView is properly rendered as a client component
export function GrievanceViewWrapper(props: any) {
  return <GrievanceView {...props} />;
}