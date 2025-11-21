'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface CanLIIResult {
  title: string;
  citation?: string;
  court?: string;
  date?: string;
  summary: string;
  relevance?: string;
  url?: string;
}

interface QueryGroup {
  query: string;
  results: CanLIIResult[];
}

interface DecisionsTabProps {
  initialEstablishedFacts?: { facts: string } | null;
  statement: string;
  category: string;
  articlesViolated: string;
  onShowNotification: (message: string) => void;
}

export default function DecisionsTab({
  initialEstablishedFacts,
  statement,
  category,
  articlesViolated,
  onShowNotification,
}: DecisionsTabProps) {
  // Internal state management
  const [isSearchingCanlii, setIsSearchingCanlii] = useState(false);
  const [isGeneratingQueries, setIsGeneratingQueries] = useState(false);
  const [canliiResultsByQuery, setCanliiResultsByQuery] = useState<QueryGroup[]>([]);
  const [showQueryReview, setShowQueryReview] = useState(false);
  const [searchQueries, setSearchQueries] = useState<string[]>([]);
  const [canliiSearchContext, setCanliiSearchContext] = useState({
    facts: '',
    statement: '',
    category: '',
    articlesViolated: '',
  });

  // Handler to generate CanLII search queries
  const handleGenerateQueries = async () => {
    setIsGeneratingQueries(true);
    try {
      const searchContext = {
        facts: initialEstablishedFacts?.facts || '',
        statement: statement || '',
        category: category || '',
        articlesViolated: articlesViolated || '',
      };

      const response = await fetch('/api/grievances/generate-search-queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchContext),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      setCanliiSearchContext(searchContext);
      setSearchQueries(data.queries);
      setShowQueryReview(true);
    } catch (error) {
      console.error('Error generating queries:', error);
      onShowNotification(`Failed to generate search queries: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingQueries(false);
    }
  };

  // Handler to execute CanLII search
  const handleExecuteSearch = async () => {
    setIsSearchingCanlii(true);
    setShowQueryReview(false);
    setCanliiResultsByQuery([]);
    try {
      const response = await fetch('/api/grievances/search-canlii', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...canliiSearchContext,
          queries: searchQueries,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.resultsByQuery && data.resultsByQuery.length > 0) {
        setCanliiResultsByQuery(data.resultsByQuery);
        const totalResults = data.resultsByQuery.reduce((sum: number, q: any) => sum + q.results.length, 0);
        onShowNotification(`Found ${totalResults} similar cases across ${data.resultsByQuery.length} search queries`);
      } else {
        onShowNotification('No similar cases found. Try modifying your search queries.');
      }
    } catch (error) {
      console.error('Error searching CanLII:', error);
      onShowNotification(`Failed to search CanLII: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSearchingCanlii(false);
    }
  };

  return (
    <Card className="shadow-lg border border-gray-200 overflow-hidden">
      <CardHeader className="pb-4 bg-gray-50 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
            <CardTitle className="text-xl font-bold text-gray-900">
              Similar Decisions
            </CardTitle>
          </div>
          <Button
            onClick={handleGenerateQueries}
            disabled={isSearchingCanlii || isGeneratingQueries}
            className="bg-slate-600 hover:bg-slate-700 text-white"
          >
            {isGeneratingQueries ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Queries...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search CanLII
              </>
            )}
          </Button>
        </div>
        <CardDescription>
          Search Ontario Labour Arbitration Awards for similar decisions based on your established facts
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        {showQueryReview ? (
          <div className="space-y-4">
            <div className="bg-green-50 border-l-4 border-green-400 p-4">
              <p className="text-sm text-green-900">
                <span className="font-semibold">Review & Edit Search Queries</span><br/>
                These search queries were generated based on your grievance facts. You can edit them before searching CanLII.
              </p>
            </div>

            <div className="space-y-3">
              {searchQueries.map((query, index) => (
                <div key={index}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search Query {index + 1}
                  </label>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                      const newQueries = [...searchQueries];
                      newQueries[index] = e.target.value;
                      setSearchQueries(newQueries);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="CanLII search query..."
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowQueryReview(false)}
              >
                Back
              </Button>
              <Button
                onClick={handleExecuteSearch}
                disabled={isSearchingCanlii || searchQueries.some(q => !q.trim())}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isSearchingCanlii ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Searching CanLII...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search CanLII with These Queries
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : canliiResultsByQuery.length > 0 ? (
          <div className="space-y-8">
            {canliiResultsByQuery.map((queryGroup, queryIndex) => (
              <div key={queryIndex} className="space-y-4">
                {/* Query Header */}
                <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-r-lg">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <div>
                      <h3 className="text-sm font-semibold text-blue-900 mb-1">
                        Search Query {queryIndex + 1}
                      </h3>
                      <p className="text-sm text-blue-800 italic">
                        &quot;{queryGroup.query}&quot;
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        {queryGroup.results.length} {queryGroup.results.length === 1 ? 'result' : 'results'} found
                      </p>
                    </div>
                  </div>
                </div>

                {/* Results for this query */}
                <div className="space-y-4 ml-4">
                  {queryGroup.results.map((result, resultIndex) => (
                    <div key={resultIndex} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-lg font-semibold text-gray-900">
                          {result.title}
                        </h4>
                        {result.citation && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {result.citation}
                          </span>
                        )}
                      </div>

                      {result.court && (
                        <div className="text-sm text-gray-600 mb-2">
                          {result.court} {result.date && `• ${result.date}`}
                        </div>
                      )}

                      <div className="text-sm text-gray-700 mb-3 leading-relaxed">
                        {result.summary}
                      </div>

                      {result.relevance && (
                        <div className="bg-green-50 border-l-4 border-green-400 p-3 mb-3">
                          <p className="text-sm text-green-900">
                            <span className="font-semibold">Why it&apos;s relevant: </span>
                            {result.relevance}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
                        {result.url && (
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
                          >
                            View on CanLII
                            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // TODO: Implement "Not relevant" functionality
                              console.log('Not relevant clicked for:', result.title);
                            }}
                            className="text-gray-600 hover:text-gray-800 border-gray-300"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Not relevant
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              // TODO: Implement "Attach to case" functionality
                              console.log('Attach to case clicked for:', result.title);
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            Attach to case
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : isSearchingCanlii ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <svg className="animate-spin mx-auto h-12 w-12 text-blue-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <h3 className="mt-4 text-sm font-medium text-gray-900">
              Searching CanLII...
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              This may take a minute as we search for similar cases
            </p>
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No cases found yet
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Click &quot;Search CanLII&quot; to find similar cases based on your grievance facts
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
