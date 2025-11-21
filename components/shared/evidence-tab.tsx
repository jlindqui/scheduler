'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { formatSmartDate } from '@/lib/utils';
import { Evidence, WithEvidence } from '@/app/lib/definitions';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * Generic Evidence Tab Props
 * Works with any entity type that has evidence (Grievance, Complaint, Incident)
 */
interface EvidenceTabProps<T extends { id: string }> {
  /** The entity with evidence (must have id and evidence[]) */
  entity: WithEvidence<T>;

  /** Type of entity for routing and actions */
  entityType: 'grievance' | 'complaint' | 'incident';

  /** Callback when notification should be shown */
  onShowNotification: (message: string) => void;

  /** Optional: Custom delete action */
  onDeleteEvidence?: (entityId: string, evidenceId: string) => Promise<void>;

  /** Optional: Custom upload component */
  uploadComponent?: React.ReactNode;

  /** Optional: Custom download button component */
  downloadComponent?: React.ReactNode;

  /** Optional: Custom analysis section */
  analysisComponent?: React.ReactNode;
}

/**
 * Generic Evidence Tab Component
 *
 * @example
 * // For Grievances
 * <EvidenceTab
 *   entity={grievance}
 *   entityType="grievance"
 *   onShowNotification={showNotification}
 * />
 *
 * // For Complaints
 * <EvidenceTab
 *   entity={complaint}
 *   entityType="complaint"
 *   onShowNotification={showNotification}
 * />
 */
export default function EvidenceTab<T extends { id: string }>({
  entity,
  entityType,
  onShowNotification,
  onDeleteEvidence,
  uploadComponent,
  downloadComponent,
  analysisComponent,
}: EvidenceTabProps<T>) {
  // Local state
  const [expandedSummaries, setExpandedSummaries] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [evidenceToDelete, setEvidenceToDelete] = useState<string | null>(null);

  // Sort evidence by date
  const sortedEvidence = [...entity.evidence].sort((a, b) => {
    const dateA = a.eventDate ? parseISO(a.eventDate) : parseISO(a.date);
    const dateB = b.eventDate ? parseISO(b.eventDate) : parseISO(b.date);
    return dateA.getTime() - dateB.getTime();
  });

  const handleDeleteEvidenceClick = useCallback((evidenceId: string) => {
    setEvidenceToDelete(evidenceId);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteEvidenceConfirm = useCallback(async () => {
    if (!evidenceToDelete || isDeleting || !onDeleteEvidence) return;

    setIsDeleting(true);
    try {
      await onDeleteEvidence(entity.id, evidenceToDelete);
      onShowNotification("Evidence deleted successfully");
    } catch (error) {
      console.error("Error deleting evidence:", error);
      onShowNotification("Failed to delete evidence");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setEvidenceToDelete(null);
    }
  }, [entity.id, evidenceToDelete, isDeleting, onShowNotification, onDeleteEvidence]);

  const handleDeleteEvidenceCancel = useCallback(() => {
    setDeleteDialogOpen(false);
    setEvidenceToDelete(null);
  }, []);

  const toggleSummary = useCallback(
    (evidenceId: string, e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      setExpandedSummaries((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(evidenceId)) {
          newSet.delete(evidenceId);
        } else {
          newSet.add(evidenceId);
        }
        return newSet;
      });
    },
    []
  );

  // Build evidence detail URL based on entity type
  const getEvidenceDetailUrl = (evidenceId: string) => {
    return `/product/${entityType}s/${entity.id}/evidence/${evidenceId}`;
  };

  return (
    <>
      {/* Optional Analysis Section */}
      {analysisComponent && (
        <Card className="shadow-lg border border-gray-200 overflow-hidden mb-6">
          {analysisComponent}
        </Card>
      )}

      {/* Evidence Section Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-semibold text-gray-900">
                Evidence
              </h2>
            </div>
            {downloadComponent && (
              <div className="flex gap-4">
                {downloadComponent}
              </div>
            )}
          </div>
        </div>
        <div className="p-6">
          {/* Evidence Timeline */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-4">Evidence Timeline</h3>

            {entity.evidence.length > 0 ? (
              <div className="relative mb-6">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                {/* Simple list of evidence items */}
                <div className="space-y-8">
                  {sortedEvidence.map((ev) => (
                    <div key={ev.id} className="relative pl-12">
                      {/* Timeline dot */}
                      <div className="absolute left-0 w-8 h-8 rounded-full bg-white border-2 border-blue-500 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      </div>

                      {/* Content */}
                      <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                                  ${ev.type === "File" ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-600"}`}
                                >
                                  {ev.type}
                                </span>
                                <Link
                                  href={getEvidenceDetailUrl(ev.id)}
                                  className="text-lg font-medium text-gray-900 hover:text-blue-600 transition-colors"
                                >
                                  {ev.name}
                                </Link>
                              </div>
                              <div className="mt-1 text-sm text-gray-500">
                                {ev.eventDate ? (
                                  <>
                                    <span className="font-medium">
                                      {format(
                                        parseISO(ev.eventDate),
                                        "MMM d, yyyy"
                                      )}
                                    </span>
                                    <span className="ml-2 text-gray-400">
                                      (Added:{" "}
                                      {format(
                                        parseISO(ev.date),
                                        "MMM d, yyyy"
                                      )}
                                      )
                                    </span>
                                  </>
                                ) : (
                                  formatSmartDate(parseISO(ev.date))
                                )}
                              </div>
                            </div>
                            {onDeleteEvidence && (
                              <div className="flex items-center gap-3">
                                <button
                                  title="delete evidence"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleDeleteEvidenceClick(ev.id);
                                  }}
                                  className="text-gray-400 hover:text-red-500 transition-colors"
                                  disabled={isDeleting}
                                >
                                  <Trash2 className="h-5 w-5" />
                                </button>
                              </div>
                            )}
                          </div>

                          {ev.summary && (
                            <div
                              onClick={(e) => toggleSummary(ev.id, e)}
                              className={`mt-2 text-sm text-gray-600 ${!expandedSummaries.has(ev.id) ? "line-clamp-3" : ""} cursor-pointer hover:text-gray-900 prose prose-sm max-w-none`}
                            >
                              <div className="whitespace-pre-wrap">
                                {ev.summary
                                  .split("\n")
                                  .map((line: string, index: number) => {
                                    if (line.trim().startsWith("- ")) {
                                      return (
                                        <div
                                          key={index}
                                          className="flex items-start gap-2"
                                        >
                                          <span className="text-gray-400">
                                            •
                                          </span>
                                          <span>
                                            {line.trim().substring(2)}
                                          </span>
                                        </div>
                                      );
                                    }
                                    return <p key={index}>{line}</p>;
                                  })}
                              </div>
                            </div>
                          )}

                          {ev.facts.size > 0 && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5">
                                {
                                  Array.from(
                                    ev.facts.keys() as Iterable<string>
                                  ).filter(
                                    (key) => !key.endsWith("_context")
                                  ).length
                                }{" "}
                                facts extracted
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 mb-6 bg-gray-50 rounded-xl">
                <svg
                  className="mx-auto h-16 w-16 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  No evidence yet
                </h3>
                <p className="mt-2 text-gray-500">
                  Add evidence using the form below to start building your case timeline.
                </p>
              </div>
            )}

            {/* Add Evidence Section - Only show if upload component provided */}
            {uploadComponent && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-3">Add New Evidence</h4>
                {uploadComponent}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Evidence Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Evidence</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this evidence? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleDeleteEvidenceCancel}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteEvidenceConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Evidence"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
