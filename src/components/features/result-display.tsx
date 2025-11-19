'use client';

import useSWR from 'swr';
import { useState, useEffect } from 'react';
import { JobStatus } from '@/lib/types';
import { Sparkles, CheckCircle2, XCircle, Clock, RefreshCw, Download, ExternalLink } from 'lucide-react';

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
        console.log('Status check response:', data);
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
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-full flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Ready to Create</h3>
          <p className="text-muted-foreground max-w-xs">
            Your AI-generated content will appear here. Submit a prompt to begin your creative journey!
          </p>
          <div className="mt-6 flex gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      )}

      {isGenerating && !jobId && (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mb-4 animate-pulse">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div className="absolute inset-0 w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full animate-ping opacity-20"></div>
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">Creating Magic...</h3>
            <p className="text-muted-foreground">Transforming your ideas into reality</p>
            <div className="flex gap-1 justify-center mt-3">
              <div className="w-1 h-1 bg-primary rounded-full animate-bounce"></div>
              <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Display immediate result for free image generation */}
      {result && !jobId && !isGenerating && (
        <div className="flex flex-col items-center animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
          <div className="mb-6 w-full">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 text-green-700 dark:text-green-300 rounded-full text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" />
              ✨ Generation Complete!
            </div>
          </div>

          <div className="w-full space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Your AI-generated content is ready
              </p>
            </div>
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
                    onError={(e) => {
                      console.error('Image failed to load:', result);
                      // Show error with manual testing option
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        parent.innerHTML = `
                          <div style="background-color: rgb(254, 242, 242); border: 1px solid rgb(252, 165, 165); padding: 1rem; border-radius: 0.375rem;">
                            <p style="color: rgb(185, 28, 28); font-size: 0.875rem; margin-bottom: 0.5rem;">Failed to load image from URL:</p>
                            <p style="color: rgb(220, 38, 38); font-size: 0.75rem; word-break: break-all;">${result}</p>
                            <a href="${result}" target="_blank" style="color: rgb(59, 130, 246); font-size: 0.75rem; text-decoration: underline;">Try opening in new tab</a>
                          </div>
                        `;
                      }
                    }}
                    onLoad={() => {
                      console.log('Image loaded successfully:', result);
                    }}
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
                      onError={(e) => {
                        console.error('Image failed to load:', result);
                        console.log('Image element error:', e);
                        // Try to fallback or show error
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="bg-red-50 border border-red-200 rounded-md p-4">
                              <p class="text-red-700 text-sm">Failed to load image from URL:</p>
                              <p class="text-red-600 text-xs break-all">${result}</p>
                              <a href="${result}" target="_blank" class="text-blue-500 text-xs hover:underline">Open image in new tab</a>
                            </div>
                          `;
                        }
                      }}
                      onLoad={() => {
                        console.log('Image loaded successfully:', result);
                      }}
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