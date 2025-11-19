// Free AI API integrations (no API keys required)

// ====================
// Pollinations AI Configuration
// ====================

export type PollinationsModel = 'flux' | 'stability-ai' | 'turbo';

export interface FreeImageGenerationParams {
  prompt: string;
  model?: PollinationsModel;
  width?: number;
  height?: number;
  seed?: number;
  nologo?: boolean; // Remove watermark
}

export interface FreeImageResponse {
  imageUrl: string;
  model: string;
  prompt: string;
}

// ====================
// Pollinations AI Functions
// ====================

/**
 * Generate image using Pollinations AI (completely free, no API key required)
 */
export async function generateFreeImage(params: FreeImageGenerationParams): Promise<FreeImageResponse> {
  const {
    prompt,
    model = 'flux', // Default model - best quality
    width = 1024,
    height = 1024,
    seed = Date.now(),
    nologo = true
  } = params;

  // Use the most reliable Pollinations AI format - no testing, instant generation
  const encodedPrompt = encodeURIComponent(prompt);

  // Working format based on Pollinations documentation
  const imageUrl = `https://pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&model=${model}`;

  console.log('Generated Pollinations URL:', imageUrl);

  return {
    imageUrl,
    model,
    prompt
  };
}

/**
 * Get available models information
 */
export const AVAILABLE_MODELS = {
  flux: {
    name: 'Flux',
    description: 'Ultra-high quality realistic images with incredible detail',
    style: 'Photorealistic, hyper-detailed, professional'
  },
  'stability-ai': {
    name: 'Stability AI',
    description: 'Artistic and creative images with unique stylized results',
    style: 'Artistic, creative, stylized, nanobanana-like'
  },
  turbo: {
    name: 'Turbo',
    description: 'Lightning-fast generation with good quality output',
    style: 'Fast, efficient, quality-optimized'
  }
} as const;

/**
 * Generate multiple images with different models
 */
export async function generateMultipleImages(
  prompt: string,
  models: PollinationsModel[] = ['flux', 'stability-ai']
): Promise<FreeImageResponse[]> {
  const promises = models.map(model =>
    generateFreeImage({ prompt, model })
  );

  return Promise.all(promises);
}

/**
 * Validate image generation parameters
 */
export function validateImageParams(params: FreeImageGenerationParams): string[] {
  const errors: string[] = [];

  if (!params.prompt || params.prompt.trim().length === 0) {
    errors.push('Prompt is required');
  }

  if (params.prompt && params.prompt.length > 1000) {
    errors.push('Prompt must be less than 1000 characters');
  }

  if (params.width && (params.width < 64 || params.width > 2048)) {
    errors.push('Width must be between 64 and 2048 pixels');
  }

  if (params.height && (params.height < 64 || params.height > 2048)) {
    errors.push('Height must be between 64 and 2048 pixels');
  }

  return errors;
}