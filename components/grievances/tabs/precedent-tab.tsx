'use client';

import React from 'react';
import { CheckCircle, Clock, X, AlertCircle, FileText } from 'lucide-react';
import SimilarEntitiesTab, { EntityConfig } from '@/components/shared/similar-entities-tab';
import { findSimilarGrievances, GrievanceSearchResult } from '@/app/actions/grievances/grievance-search';

interface SimilarGrievancesTabProps {
  grievanceId: string;
}

/**
 * Grievance-specific configuration for the similar entities tab
 */
const grievanceConfig: EntityConfig<GrievanceSearchResult> = {
  entityName: 'Grievance',
  entityNamePlural: 'Grievances',
  basePath: '/product/grievances',

  getStatusIcon: (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'WITHDRAWN':
        return <X className="w-4 h-4 text-gray-500" />;
      case 'SETTLED':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'RESOLVED_ARBITRATION':
        return <AlertCircle className="w-4 h-4 text-purple-500" />;
      default:
        return null;
    }
  },

  getStatusLabel: (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'Active';
      case 'WITHDRAWN':
        return 'Withdrawn';
      case 'SETTLED':
        return 'Settled';
      case 'RESOLVED_ARBITRATION':
        return 'Resolved (Arbitration)';
      default:
        return status;
    }
  },

  getStatusColor: (status: string) => {
    switch (status) {
      case 'SETTLED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'RESOLVED_ARBITRATION':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'WITHDRAWN':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  },

  renderPrimaryContent: (grievance: GrievanceSearchResult) => {
    // Prefer AI summary over statement
    if (grievance.aiSummary) {
      return (
        <p className="text-sm text-gray-700 mb-3 line-clamp-2 italic">
          {grievance.aiSummary}
        </p>
      );
    }

    // Fallback to statement if no AI summary
    if (grievance.statement) {
      return (
        <p className="text-sm text-gray-700 mb-3 line-clamp-2">
          {grievance.statement}
        </p>
      );
    }

    return null;
  },

  renderHighlightedContent: (grievance: GrievanceSearchResult) => {
    // Only show settlement/resolution info for resolved grievances
    if (grievance.status === 'SETTLED' || grievance.status === 'RESOLVED_ARBITRATION') {
      // Try to get resolution details from resolutionDetails field
      const resolutionText = grievance.resolutionDetails?.details ||
                            grievance.resolutionDetails?.outcomes;

      if (resolutionText) {
        return (
          <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-3">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-green-900 mb-1">
                  {grievance.status === 'SETTLED' ? 'Settlement:' : 'Resolution:'}
                </p>
                <p className="text-sm text-green-800 line-clamp-3">
                  {resolutionText}
                </p>
              </div>
            </div>
          </div>
        );
      }
    }
    return null;
  },

  renderMetadata: (grievance: GrievanceSearchResult) => {
    if (!grievance.articlesViolated) return null;
    return (
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-600">
          Articles: {grievance.articlesViolated}
        </span>
      </div>
    );
  },
};

/**
 * Grievance-specific Similar Entities Tab
 * Wraps the generic SimilarEntitiesTab with grievance-specific configuration
 */
export default function SimilarGrievancesTab({ grievanceId }: SimilarGrievancesTabProps) {
  return (
    <SimilarEntitiesTab
      entityId={grievanceId}
      config={grievanceConfig}
      fetchSimilarEntities={findSimilarGrievances}
      limit={10}
    />
  );
}
