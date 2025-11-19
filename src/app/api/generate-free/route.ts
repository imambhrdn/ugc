import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createServiceClient } from '@/lib/supabase-server';
import { v4 as uuidv4 } from 'uuid';
import { logActivity } from '@/lib/utils';
import {
  generateFreeImage,
  FreeImageGenerationParams,
  PollinationsModel,
  validateImageParams,
  AVAILABLE_MODELS
} from '@/lib/free-ai-api';

interface GenerateFreeRequestBody {
  prompt: string;
  model?: PollinationsModel;
  width?: number;
  height?: number;
  seed?: number;
  nologo?: boolean;
}

// Get available models endpoint
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      models: AVAILABLE_MODELS,
      defaultModel: 'flux'
    });
  } catch (error) {
    console.error('Error getting available models:', error);
    return NextResponse.json(
      { error: 'Failed to get available models' },
      { status: 500 }
    );
  }
}

// Generate free image endpoint
export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // Parse request body
    const body: GenerateFreeRequestBody = await req.json();
    const {
      prompt,
      model = 'flux',
      width = 1024,
      height = 1024,
      seed = Date.now(),
      nologo = true
    } = body;

    // Validate inputs
    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Validate parameters
    const validationErrors = validateImageParams({
      prompt,
      model,
      width,
      height,
      seed,
      nologo
    });

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      );
    }

    // Check user credits (still deduct 1 credit for usage tracking)
    const supabase = createServiceClient();

    const profileResult = await supabase
      .from('profiles')
      .select('credits')
      .eq('clerk_id', userId)
      .single();

    let profile = profileResult.data;
    const profileError = profileResult.error;

    if (profileError || !profile) {
      console.error('Error fetching user profile:', profileError);
      // If no profile exists, create one with initial credits
      if (profileError?.code === 'PGRST116' || !profile) {
        console.log('Creating new user profile for:', userId);
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([{
            clerk_id: userId,
            credits: 10 // Give new users 10 free credits
          }]);

        if (insertError) {
          console.error('Error creating user profile:', insertError);
          return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 });
        }

        // Now fetch the newly created profile
        const { data: newProfile, error: newProfileError } = await supabase
          .from('profiles')
          .select('credits')
          .eq('clerk_id', userId)
          .single();

        if (newProfileError || !newProfile) {
          console.error('Error fetching newly created profile:', newProfileError);
          return NextResponse.json({ error: 'User profile not found after creation' }, { status: 404 });
        }

        profile = newProfile;

        if (profile.credits <= 0) {
          return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 });
        }
      } else {
        return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
      }
    } else {
      if (profile.credits <= 0) {
        return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 });
      }
    }

    // Log the generation request
    await logActivity({
      userId: userId,
      action: 'generate_free_request',
      type: 'image_free',
      metadata: {
        prompt_length: prompt.length,
        model: model,
        width: width,
        height: height
      },
    });

    // Generate image using Pollinations AI
    let result;
    let responseTime: number = 0;

    try {
      const startTime = Date.now();

      result = await generateFreeImage({
        prompt,
        model,
        width,
        height,
        seed,
        nologo
      });

      responseTime = Date.now() - startTime;

      console.log('Pollinations AI response:', result);

      // Log successful API call
      await logActivity({
        userId: userId,
        action: 'free_api_success',
        type: 'image_free',
        responseTime: responseTime,
        metadata: {
          model: model,
          imageUrl: result.imageUrl
        },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Pollinations AI API error:', error);

      await logActivity({
        userId: userId,
        action: 'free_api_error',
        type: 'image_free',
        error: errorMessage || 'Unknown error',
        responseTime: responseTime,
        metadata: {
          error_stack: error instanceof Error ? error.stack : undefined,
        },
      });

      return NextResponse.json({ error: `Image generation error: ${errorMessage || 'Unknown error'}` }, { status: 500 });
    }

    // Create a new generation record in the database
    const generationId = uuidv4();

    const { error: insertError } = await supabase
      .from('generations')
      .insert([
        {
          id: generationId,
          user_id: userId,
          prompt: prompt,
          type: 'image', // Use existing enum value, we can distinguish by job_id_external prefix
          status: 'completed', // Pollinations AI returns immediate result
          job_id_external: `free_${model}_${seed}`, // Use free_ prefix to distinguish
          result_url: result.imageUrl, // Use the tested working URL
        }
      ]);

    if (insertError) {
      console.error('Error inserting generation record:', insertError);
      return NextResponse.json({ error: `Failed to create generation record: ${insertError.message}` }, { status: 500 });
    }

    // Log successful job creation
    await logActivity({
      userId: userId,
      jobId: generationId,
      externalJobId: `free_${model}_${seed}`,
      action: 'free_job_created',
      type: 'image_free',
      status: 'completed',
    });

    // Deduct credit from user profile (for usage tracking)
    const currentCredits = profile.credits;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ credits: currentCredits - 1 })
      .eq('clerk_id', userId);

    if (updateError) {
      console.error('Error deducting credit:', updateError);
      // In case of error, try to rollback the generation record
      await supabase
        .from('generations')
        .delete()
        .eq('id', generationId);

      return NextResponse.json({ error: 'Failed to deduct credit' }, { status: 500 });
    }

    // Log successful credit deduction
    await logActivity({
      userId: userId,
      jobId: generationId,
      action: 'credit_deducted',
      type: 'image_free',
      metadata: {
        credits_before: currentCredits,
        credits_after: currentCredits - 1,
        model: model
      },
    });

    // Return the result immediately since Pollinations AI returns direct image URL
    return NextResponse.json({
      internal_job_id: generationId,
      external_job_id: `free_${model}_${seed}`,
      status: 'completed',
      result_url: result.imageUrl,
      model_used: result.model,
      prompt_used: result.prompt
    });
  } catch (error) {
    console.error('Error in generate-free API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}