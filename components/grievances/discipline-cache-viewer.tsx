'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Database, Calendar, Tag } from 'lucide-react';
import { getCachedDisciplineContext } from '@/app/actions/grievance-discipline-cache';

interface DisciplineCacheViewerProps {
  grievanceId: string;
}

interface CachedDisciplineContext {
  grievanceId: string;
  relevantSections: string;
  topics: string[];
  extractedAt: Date;
  expiresAt: Date;
}

export default function DisciplineCacheViewer({ grievanceId }: DisciplineCacheViewerProps) {
  const [cacheData, setCacheData] = useState<CachedDisciplineContext | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadCacheData = async () => {
    setIsLoading(true);
    try {
      const data = await getCachedDisciplineContext(grievanceId);
      setCacheData(data);
    } catch (error) {
      console.error('Error loading cache data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCacheData();
  }, [grievanceId]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  if (isLoading) {
    return (
      <Card className="mb-6 border-amber-200">
        <CardHeader>
          <CardTitle className="text-sm text-amber-700 flex items-center gap-2">
            <Database className="h-4 w-4" />
            Discipline Cache Data (Super Admin)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Loading cache data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 border-amber-200">
      <CardHeader 
        className="pb-3 cursor-pointer" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-amber-700 flex items-center gap-2">
            <Database className="h-4 w-4" />
            Discipline Cache Data (Super Admin Only)
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              loadCacheData();
            }}
            disabled={isLoading}
            className="text-xs"
          >
            Refresh
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          {!cacheData ? (
            <div className="text-sm text-gray-600">
              <p>No cached discipline data found for this grievance.</p>
              <p className="text-xs mt-1">Cache is generated when AI chat uses discipline guidance.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-green-600" />
                  <div>
                    <span className="font-medium">Extracted:</span>
                    <div className="text-xs text-gray-600">{formatDate(cacheData.extractedAt)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-red-600" />
                  <div>
                    <span className="font-medium">Expires:</span>
                    <div className="text-xs text-gray-600">{formatDate(cacheData.expiresAt)}</div>
                  </div>
                </div>
              </div>

              {/* Topics */}
              {cacheData.topics.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-sm">Topics ({cacheData.topics.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {cacheData.topics.map((topic, index) => (
                      <span
                        key={index}
                        className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Cached Sections */}
              <div>
                <span className="font-medium text-sm mb-2 block">
                  Cached Discipline Sections ({cacheData.relevantSections.length} characters)
                </span>
                <div className="bg-gray-50 p-3 rounded text-xs font-mono max-h-96 overflow-y-auto border">
                  <pre className="whitespace-pre-wrap">{cacheData.relevantSections}</pre>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}