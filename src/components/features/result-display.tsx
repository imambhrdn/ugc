'use client';

import useSWR from 'swr';
import { useState, useEffect } from 'react';
import { JobStatus } from '@/lib/types';

interface StatusResponse {
  status: JobStatus;
  url?: string;
  error_message?: string;
}

interface ResultDisplayProps {
  jobId: string | null;
  result: string | null;
  setResult: (result: string | null) => void;
  isGenerating: boolean;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function ResultDisplay({ jobId, result, setResult, isGenerating }: ResultDisplayProps) {
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Reset when a new job starts
  useEffect(() => {
    if (isGenerating) {
      setStatus(null);
      setError(null);
      setResult(null);
    }
  }, [isGenerating, setResult]);

  // Poll for status updates when jobId is available
  const { data, mutate } = useSWR<StatusResponse>(
    jobId ? `/api/status/${jobId}` : null,
    fetcher,
    {
      refreshInterval: jobId && !['completed', 'failed'].includes(status as JobStatus) ? 3000 : 0,
      shouldRetryOnError: false,
      revalidateOnFocus: false,
      onSuccess: (data) => {
        setStatus(data.status);
        
        if (data.status === 'completed' && data.url) {
          setResult(data.url);
        }
        
        if (data.status === 'failed') {
          setError(data.error_message || 'Generation failed');
        }
      },
    }
  );

  // Handle manual refresh
  const handleRefresh = () => {
    if (jobId) {
      mutate();
    }
  };

  return (
    <div className="border rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Result</h2>
      
      {!jobId && !isGenerating && (
        <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
          <p>Your generated content will appear here</p>
          <p className="text-sm mt-2">Submit a prompt to get started</p>
        </div>
      )}
      
      {isGenerating && !jobId && (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Preparing your request...</p>
        </div>
      )}
      
      {jobId && status === 'pending' && (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Queued for processing...</p>
        </div>
      )}
      
      {jobId && status === 'processing' && (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Generating your content...</p>
          <button 
            onClick={handleRefresh}
            className="mt-4 text-sm text-primary hover:underline"
          >
            Refresh status
          </button>
        </div>
      )}
      
      {jobId && status === 'completed' && result && (
        <div className="flex flex-col items-center">
          <div className="mb-4 w-full">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
              <span className="h-2 w-2 bg-green-500 rounded-full"></span>
              Completed
            </div>
          </div>
          
          {result && (
            <div className="w-full">
              {typeof result === 'string' && (result.startsWith('http') || result.startsWith('/')) ? (
                <>
                  {result.includes('.mp4') || result.includes('.mov') || result.includes('.webm') ? (
                    <video 
                      src={result} 
                      controls 
                      className="w-full rounded-md"
                    />
                  ) : result.startsWith('http') || result.startsWith('/') ? (
                    <img 
                      src={result} 
                      alt="Generated content" 
                      className="w-full rounded-md"
                    />
                  ) : (
                    <div className="bg-muted p-4 rounded-md whitespace-pre-wrap">
                      {result}
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-muted p-4 rounded-md whitespace-pre-wrap">
                  {JSON.stringify(result, null, 2)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {jobId && status === 'failed' && (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-red-500 font-medium">Generation Failed</p>
          {error && <p className="text-sm text-muted-foreground mt-2 text-center">{error}</p>}
          <button 
            onClick={handleRefresh}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}