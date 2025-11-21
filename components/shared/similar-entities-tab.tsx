'use client';

import { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { FileText, Calendar, User, Building2, Hash, AlertCircle, CheckCircle, Clock, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatSmartDateTime } from '@/lib/utils';
import { SimilarEntityResult } from '@/app/lib/definitions';

/**
 * Configuration for entity-specific rendering
 */
export interface EntityConfig<T extends SimilarEntityResult> {
  /** Singular entity name (e.g., "Grievance", "Complaint", "Incident") */
  entityName: string;

  /** Plural entity name (e.g., "Grievances", "Complaints", "Incidents") */
  entityNamePlural: string;

  /** Base URL path for entity detail pages (e.g., "/product/grievances") */
  basePath: string;

  /** Function to get status icon for an entity */
  getStatusIcon: (status: string) => ReactNode;

  /** Function to get human-readable status label */
  getStatusLabel: (status: string) => string;

  /** Function to get status badge color classes */
  getStatusColor: (status: string) => string;

  /** Function to render entity-specific content (primary text) */
  renderPrimaryContent: (entity: T) => ReactNode;

  /** Function to render entity-specific highlighted content (e.g., settlement for grievances) */
  renderHighlightedContent?: (entity: T) => ReactNode;

  /** Function to render entity-specific metadata (e.g., articles violated) */
  renderMetadata?: (entity: T) => ReactNode;
}

/**
 * Generic Similar Entities Tab Props
 */
interface SimilarEntitiesTabProps<T extends SimilarEntityResult> {
  /** ID of the current entity to find similar ones for */
  entityId: string;

  /** Configuration for entity-specific rendering */
  config: EntityConfig<T>;

  /** Function to fetch similar entities */
  fetchSimilarEntities: (entityId: string, limit: number) => Promise<T[]>;

  /** Number of similar entities to fetch (default: 10) */
  limit?: number;
}

/**
 * Generic Similar Entities Tab Component
 *
 * Displays a list of semantically similar entities based on vector similarity search.
 * Supports any entity type (Grievance, Complaint, Incident) through configuration.
 *
 * @example
 * // For Grievances
 * <SimilarEntitiesTab
 *   entityId={grievanceId}
 *   config={grievanceConfig}
 *   fetchSimilarEntities={findSimilarGrievances}
 * />
 *
 * // For Complaints
 * <SimilarEntitiesTab
 *   entityId={complaintId}
 *   config={complaintConfig}
 *   fetchSimilarEntities={findSimilarComplaints}
 * />
 */
export default function SimilarEntitiesTab<T extends SimilarEntityResult>({
  entityId,
  config,
  fetchSimilarEntities,
  limit = 10,
}: SimilarEntitiesTabProps<T>) {
  const [similarEntities, setSimilarEntities] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSimilarEntities() {
      setLoading(true);
      setError(null);
      try {
        const results = await fetchSimilarEntities(entityId, limit);
        setSimilarEntities(results);
      } catch (err) {
        console.error(`Error loading similar ${config.entityNamePlural.toLowerCase()}:`, err);
        setError(`Failed to load similar ${config.entityNamePlural.toLowerCase()}. Please try again.`);
      } finally {
        setLoading(false);
      }
    }

    loadSimilarEntities();
  }, [entityId, limit, fetchSimilarEntities, config.entityNamePlural]);

  return (
    <Card className="shadow-lg border border-gray-200 overflow-hidden">
      <CardHeader className="pb-4 bg-slate-50 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div>
              <CardTitle className="text-xl font-bold text-gray-900">
                Similar {config.entityNamePlural}
              </CardTitle>
              <CardDescription className="mt-1">
                Find similar {config.entityNamePlural.toLowerCase()} within your organization and see how they were resolved
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-red-900 mb-2">Error Loading Similar {config.entityNamePlural}</h3>
            <p className="text-red-700">{error}</p>
          </div>
        ) : similarEntities.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-12 text-center">
            <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Similar {config.entityNamePlural} Found</h3>
            <p className="text-gray-600">
              We couldn't find any similar {config.entityNamePlural.toLowerCase()} in the database. This may be because this {config.entityName.toLowerCase()} hasn't been indexed yet, or there are no similar cases.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {similarEntities.map((entity) => (
              <Link
                key={entity.id}
                href={`${config.basePath}/${entity.id}`}
                className="block bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md hover:border-slate-300 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${config.getStatusColor(entity.status)}`}>
                      {config.getStatusIcon(entity.status)}
                      <span className="text-xs font-medium">
                        {config.getStatusLabel(entity.status)}
                      </span>
                    </div>
                    {entity.type && (
                      <>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-sm text-gray-600">
                          {entity.type}
                        </span>
                      </>
                    )}
                    {entity.score && (
                      <>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {Math.round(entity.score * 100)}% match
                        </span>
                      </>
                    )}
                  </div>
                  {entity.filedAt && (
                    <span className="text-sm text-gray-500">
                      {formatSmartDateTime(entity.filedAt)}
                    </span>
                  )}
                </div>

                {/* AI Summary */}
                {entity.aiSummary && (
                  <p className="text-sm text-gray-700 mb-3 line-clamp-2 italic">
                    {entity.aiSummary}
                  </p>
                )}

                {/* Entity-specific primary content (fallback if no AI summary) */}
                {!entity.aiSummary && config.renderPrimaryContent(entity)}

                {/* Entity-specific highlighted content (e.g., settlement info) */}
                {config.renderHighlightedContent && config.renderHighlightedContent(entity)}

                {/* Entity-specific metadata (e.g., articles violated) */}
                {config.renderMetadata && config.renderMetadata(entity)}

                {/* Common metadata */}
                <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                  {entity.bargainingUnit && (
                    <div className="flex items-center gap-1">
                      <Building2 className="w-4 h-4" />
                      <span>{entity.bargainingUnit.name}</span>
                    </div>
                  )}
                  {entity.assignedTo && (
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span>{entity.assignedTo.name}</span>
                    </div>
                  )}
                  {entity.category && (
                    <div className="flex items-center gap-1">
                      <Hash className="w-4 h-4" />
                      <span>{entity.category}</span>
                    </div>
                  )}
                </div>
              </Link>
            ))}

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Tip:</strong> These results are based on semantic similarity analysis. {config.entityNamePlural} with similar facts, issues, or characteristics will appear higher in the list. Resolved {config.entityNamePlural.toLowerCase()} show their outcomes to help inform your strategy.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
