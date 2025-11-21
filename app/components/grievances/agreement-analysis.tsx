'use client';

import { useState } from 'react';
import { analyzeGrievanceForAgreementArticles } from '@/app/actions/agreements';
import { AgreementSearchResult } from '@/app/lib/definitions';

interface AgreementAnalysisProps {
  statement: string;
  agreementId: string;
}

export default function AgreementAnalysis({ statement, agreementId }: AgreementAnalysisProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedArticles, setSuggestedArticles] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<AgreementSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await analyzeGrievanceForAgreementArticles(statement, agreementId);
      setSuggestedArticles(result.suggestedArticles);
      setSearchResults(result.searchResults);
    } catch (err) {
      setError('Failed to analyze agreement articles. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleAnalyze}
        disabled={isLoading}
        className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Analyzing...' : 'Find Relevant Agreement Articles'}
      </button>

      {error && (
        <div className="p-4 text-sm text-red-700 bg-red-100 rounded-md">
          {error}
        </div>
      )}

      {suggestedArticles.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-medium text-gray-900">Suggested Agreement Articles</h3>
          <ul className="mt-2 space-y-2">
            {suggestedArticles.map((article, index) => (
              <li key={index} className="text-sm text-gray-700">
                {article}
              </li>
            ))}
          </ul>
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-medium text-gray-900">Relevant Agreement Text</h3>
          <div className="mt-2 space-y-4">
            {searchResults.map((result, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-700">{result.text}</p>
                {result.metadata && (
                  <div className="mt-2 flex gap-2 text-xs text-gray-500">
                    {result.metadata.section && (
                      <span className="font-medium text-gray-600">
                        Section: {result.metadata.section}
                      </span>
                    )}
                    {result.metadata.page && (
                      <span>Page: {result.metadata.page}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 