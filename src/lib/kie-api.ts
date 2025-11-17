// Configuration and helper functions for Kie.ai API integration

// ====================
// Type Definitions
// ====================

export interface KieApiConfig {
  apiKey: string;
  baseUrl: string;
}

export interface ImageGenerationParams {
  prompt: string;
  size: '1:1' | '3:2' | '2:3'; // Required aspect ratio
  nVariants?: 1 | 2 | 4; // Optional: number of variations
  callBackUrl?: string; // Optional: callback URL for task updates
  isEnhance?: boolean; // Optional: enable prompt enhancement
  uploadCn?: boolean; // Optional: use China servers for upload
  enableFallback?: boolean; // Optional: use fallback models
  fallbackModel?: 'GPT_IMAGE_1' | 'FLUX_MAX'; // Optional: fallback model to use
  filesUrl?: string[]; // Optional: reference images
  maskUrl?: string; // Optional: mask for image editing
  fileUrl?: string; // Deprecated: use filesUrl instead
}

export interface VideoGenerationParams {
  prompt: string;
  aspect_ratio: string; // e.g., "16:9"
  duration?: number; // Optional: video duration in seconds
  // Add more parameters as needed based on the API documentation
}

export interface TextGenerationParams {
  prompt: string;
  // Add more parameters as needed based on the API documentation
}

export interface KieApiResponse {
  code: number;
  msg?: string;
  data?: {
    taskId: string;
    successFlag?: number; // 0: processing, 1: success, 2: failed
    response?: {
      result_urls?: string[];
      resultUrls?: string[]; // Also support the camelCase version
    };
    status?: string;
    result_url?: string;
    result?: string;
    url?: string;
    resultUrl?: string;
    output_url?: string;
    outputUrl?: string;
    content?: string;
  };
  // Additional fields may be present depending on the endpoint
  // These are for handling responses that don't use the nested data structure
  status?: string;
  url?: string;
  result_url?: string;
  result?: string;
  resultUrl?: string;
  outputUrl?: string;
  output_url?: string;
  success?: boolean;
  response?: {
    result_urls?: string[];
    resultUrls?: string[]; // Also support the camelCase version
  };
}

// ====================
// Configuration
// ====================

// Get Kie.ai API configuration from environment variables
export function getKieApiConfig(): KieApiConfig {
  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) {
    throw new Error('KIE_API_KEY environment variable is not set');
  }

  return {
    apiKey,
    baseUrl: 'https://api.kie.ai',
  };
}

// ====================
// HTTP Request Helper
// ====================

type RequestBody = {
  [key: string]: unknown;
} | ImageGenerationParams | VideoGenerationParams | TextGenerationParams;

async function makeKieApiRequest(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: RequestBody
): Promise<KieApiResponse> {
  const config = getKieApiConfig();

  const url = `${config.baseUrl}${endpoint}`;
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${config.apiKey}`,
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (method === 'POST' && body) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Kie.ai API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// ====================
// Image API Endpoints
// ====================

// Generate image using Kie.ai API
export async function generateImage(params: ImageGenerationParams): Promise<KieApiResponse> {
  return makeKieApiRequest('/api/v1/gpt4o-image/generate', 'POST', params);
}

// Get image generation status (alternative endpoint, older format)
export async function getImageStatus(taskId: string): Promise<KieApiResponse> {
  return makeKieApiRequest(`/api/v1/gpt4o-image/record-detail?taskId=${taskId}`, 'GET');
}

// Get image generation status (official endpoint from documentation)
export async function getImageStatusAlt(taskId: string): Promise<KieApiResponse> {
  return makeKieApiRequest(`/api/v1/gpt4o-image/record-info?taskId=${taskId}`, 'GET');
}

// Get image download URL
export async function getImageDownloadUrl(imageUrl: string): Promise<KieApiResponse> {
  return makeKieApiRequest('/api/v1/gpt4o-image/download-url', 'POST', { imageUrl });
}

// ====================
// Video API Endpoints
// ====================

// Generate video using Kie.ai API
export async function generateVideo(params: VideoGenerationParams): Promise<KieApiResponse> {
  return makeKieApiRequest('/api/v1/runway/generate', 'POST', params);
}

// Get video generation status
export async function getVideoStatus(taskId: string): Promise<KieApiResponse> {
  return makeKieApiRequest(`/api/v1/runway/record-detail?taskId=${taskId}`, 'GET');
}

// ====================
// Text API Endpoints
// ====================

// Generate text using Kie.ai API
export async function generateText(params: TextGenerationParams): Promise<KieApiResponse> {
  return makeKieApiRequest('/api/v1/generate/lyrics', 'POST', params);
}

// Get text generation status
export async function getTextStatus(taskId: string): Promise<KieApiResponse> {
  return makeKieApiRequest(`/api/v1/generate/record-info?taskId=${taskId}`, 'GET');
}