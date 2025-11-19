'use client';

import { useState } from 'react';
import { PromptForm } from '@/components/features/prompt-form';
import { ResultDisplay } from '@/components/features/result-display';
import { GenerationType } from '@/lib/types';
import { PollinationsModel } from '@/lib/free-ai-api';
import { Sparkles, Palette, Zap } from 'lucide-react';

interface GenerateResponse {
  internal_job_id: string;
  external_job_id?: string;
  status?: string;
  result_url?: string;
  model_used?: string;
  prompt_used?: string;
}

interface GenerateErrorResponse {
  error: string;
}

export default function DashboardPage() {
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async (prompt: string, type: GenerationType, model?: PollinationsModel) => {
    setIsGenerating(true);
    try {
      // Use different API endpoint for free image generation
      const isFreeImage = type === 'image_free';
      const apiUrl = isFreeImage ? '/api/generate-free' : '/api/generate';

      const requestBody = isFreeImage
        ? { prompt, model, width: 1024, height: 1024, nologo: true }
        : { prompt, type };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData: GenerateErrorResponse = await response.json();
        throw new Error(errorData.error || 'Failed to generate content');
      }

      const data: GenerateResponse = await response.json();

      // For free image generation, we get immediate result
      if (isFreeImage && data.result_url) {
        setCurrentJobId(data.internal_job_id);
        setResult(data.result_url);
        console.log('Free image result URL:', data.result_url);
      } else {
        setCurrentJobId(data.internal_job_id);
        setResult(null);
      }
    } catch (error) {
      console.error('Generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while generating content';
      alert(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900/20">
      {/* Header */}
      <div className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto py-6 px-4">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              AI UGC Generator
            </h1>
            <p className="text-xl text-muted-foreground">
              Transform your ideas into stunning user-generated content with AI
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Quick Generation</p>
                  <p className="text-lg font-semibold">Instant Results</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                  <Palette className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Free Models</p>
                  <p className="text-lg font-semibold">3 Available</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Generation Speed</p>
                  <p className="text-lg font-semibold">Lightning Fast</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Input Form */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border">
                <PromptForm onGenerate={handleGenerate} isGenerating={isGenerating} />
              </div>

              {/* Quick Tips */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-6 border border-purple-200">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  Pro Tips
                </h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5"></div>
                    <span>Be specific with your prompts for better results</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5"></div>
                    <span>Try different models for various artistic styles</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5"></div>
                    <span>Free generation has unlimited usage</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Results */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border min-h-[600px]">
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
      </div>
    </div>
  );
}