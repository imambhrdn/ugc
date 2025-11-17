'use client';

import { useState } from 'react';
import { PromptForm } from '@/components/features/prompt-form';
import { ResultDisplay } from '@/components/features/result-display';
import { GenerationType } from '@/lib/types';

interface GenerateResponse {
  internal_job_id: string;
}

interface GenerateErrorResponse {
  error: string;
}

export default function DashboardPage() {
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async (prompt: string, type: GenerationType) => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, type }),
      });

      if (!response.ok) {
        const errorData: GenerateErrorResponse = await response.json();
        throw new Error(errorData.error || 'Failed to generate content');
      }

      const data: GenerateResponse = await response.json();
      setCurrentJobId(data.internal_job_id);
      setResult(null);
    } catch (error) {
      console.error('Generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while generating content';
      alert(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">AI Content Generator</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="lg:col-span-1">
            <PromptForm onGenerate={handleGenerate} isGenerating={isGenerating} />
          </div>
          
          <div className="lg:col-span-1">
            <ResultDisplay 
              jobId={currentJobId} 
              result={result} 
              setResult={setResult}
              isGenerating={isGenerating}
            />
          </div>
        </div>
      </div>
    </div>
  );
}