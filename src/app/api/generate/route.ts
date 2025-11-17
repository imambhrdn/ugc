import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createServiceClient } from '@/lib/supabase-server';
import { v4 as uuidv4 } from 'uuid';
import { GenerationType } from '@/lib/types';
import { logActivity } from '@/lib/utils';
import {
  generateImage,
  generateVideo,
  generateText,
  getImageStatusAlt as getImageStatus,
  getTextStatus,
  getVideoStatus,
  ImageGenerationParams,
  VideoGenerationParams,
  TextGenerationParams,
  KieApiResponse
} from '@/lib/kie-api';

interface GenerateRequestBody {
  prompt: string;
  type: GenerationType;
}


// Define the API endpoint for creating new generation jobs
export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // Parse request body
    const { prompt, type }: GenerateRequestBody = await req.json();

    // Validate inputs
    if (!prompt || !type) {
      return NextResponse.json({ error: 'Prompt and type are required' }, { status: 400 });
    }

    // Validate generation type
    const validTypes: GenerationType[] = ['text_to_prompt', 'image', 'video'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid generation type' }, { status: 400 });
    }

    // Check user credits
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
      if (profileError?.code === 'PGRST116' || !profile) { // PGRST116 is the error code for no rows returned
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
      action: 'generate_request',
      type: type,
      metadata: { prompt_length: prompt.length },
    });

    // Call Kie.ai API to create a new job using helper functions
    let kieResult;
    let responseTime: number = 0; // Initialize with 0 to avoid undefined issues in catch block

    try {
      const startTime = Date.now();

      switch (type) {
        case 'image':
          const imageParams: ImageGenerationParams = {
            prompt: prompt,
            size: "1:1", // Required: aspect ratio of the generated image - following API spec
            // Optional parameters can be added here based on user preferences or configuration
            // nVariants: 1, // Number of variations (1, 2, or 4)
            // callBackUrl: "", // URL to receive task completion updates
            // isEnhance: false, // Enable prompt enhancement
            // uploadCn: false, // Choose upload region
            // enableFallback: false, // Activate fallback to backup models
          };
          kieResult = await generateImage(imageParams);
          responseTime = Date.now() - startTime;
          break;
        case 'text_to_prompt':
          const textParams: TextGenerationParams = {
            prompt: prompt,
          };
          kieResult = await generateText(textParams);
          responseTime = Date.now() - startTime;
          break;
        case 'video':
          const videoParams: VideoGenerationParams = {
            prompt: prompt,
            aspect_ratio: "16:9", // Default aspect ratio, can be configurable
          };
          kieResult = await generateVideo(videoParams);
          responseTime = Date.now() - startTime;
          break;
        default:
          await logActivity({
            userId: userId,
            action: 'generate_error',
            type: type,
            error: 'Unsupported generation type',
          });
          return NextResponse.json({ error: 'Unsupported generation type' }, { status: 400 });
      }

      // Log the full response to debug the structure
      console.log('Kie.ai response:', kieResult);

      // Log successful API call to Kie.ai
      await logActivity({
        userId: userId,
        action: 'kie_api_success',
        type: type,
        responseTime: responseTime,
        metadata: {
          response_keys: Object.keys(kieResult),
        },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Kie.ai API error:', error);

      await logActivity({
        userId: userId,
        action: 'kie_api_error',
        type: type,
        error: errorMessage || 'Unknown error',
        responseTime: responseTime,
        metadata: {
          error_stack: error instanceof Error ? error.stack : undefined,
        },
      });

      return NextResponse.json({ error: `Kie.ai API error: ${errorMessage || 'Unknown error'}` }, { status: 500 });
    }

    // According to Kie.ai documentation and our KieApiResponse interface, taskId should be in the data field
    let job_id_external: string | undefined;

    // Check if the response follows the documented format with data object
    if (kieResult && kieResult.data && kieResult.data.taskId) {
      job_id_external = kieResult.data.taskId;
    } else if (kieResult && typeof kieResult === 'object' && 'taskId' in kieResult && typeof kieResult.taskId === 'string') {
      // Some responses might have taskId directly at the root level
      job_id_external = kieResult.taskId as string;
    }

    if (!job_id_external) {
      console.error('Unable to extract job ID from Kie.ai response:', kieResult);
      return NextResponse.json({ error: `Failed to get job ID from Kie.ai. Expected documented response format but got: ${JSON.stringify(kieResult) || 'unknown response format'}` }, { status: 500 });
    }

    // Create a new generation record in the database
    const generationId = uuidv4();

    // Determine the status based on the type and response
    let status = 'pending';
    let resultUrl: string | null = null;

    // Check if the result is already complete (direct response)
    // Note: The Kie.ai API typically returns taskId immediately and the actual result later
    // So this check is mainly for APIs that return immediate results
    if (type === 'image' && kieResult.data?.result_url) {
      status = 'completed';
      resultUrl = kieResult.data.result_url;
    } else if (type === 'image' && kieResult.data?.result) {
      status = 'completed';
      resultUrl = kieResult.data.result;
    } else if (type === 'text_to_prompt' && kieResult.data?.result) {
      status = 'completed';
      resultUrl = kieResult.data.result;
    } else if (type === 'text_to_prompt' && kieResult.data?.content) { // Add support for content field if it exists
      status = 'completed';
      resultUrl = kieResult.data.content;
    }

    const { error: insertError } = await supabase
      .from('generations')
      .insert([
        {
          id: generationId,
          user_id: userId,
          prompt: prompt,
          type: type,
          status: status,
          job_id_external: job_id_external,
          result_url: resultUrl, // Store the result URL if available
        }
      ]);

    if (insertError) {
      console.error('Error inserting generation record:', insertError);
      console.error('Insert data details:', {
        generationId,
        userId,
        prompt,
        type,
        status,
        job_id_external,
        resultUrl
      });

      await logActivity({
        userId: userId,
        jobId: generationId,
        externalJobId: job_id_external,
        action: 'database_insert_error',
        type: type,
        error: insertError.message,
        metadata: {
          operation: 'insert_generation',
          prompt_length: prompt.length,
        },
      });

      return NextResponse.json({ error: `Failed to create generation record: ${insertError.message}` }, { status: 500 });
    }

    // Log successful job creation
    await logActivity({
      userId: userId,
      jobId: generationId,
      externalJobId: job_id_external,
      action: 'job_created',
      type: type,
      status: status,
    });

    // Deduct credit from user profile
    const currentCredits = profile!.credits; // profile is guaranteed to exist at this point

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

      await logActivity({
        userId: userId,
        jobId: generationId,
        action: 'credit_deduction_error',
        type: type,
        error: updateError.message,
      });

      return NextResponse.json({ error: 'Failed to deduct credit' }, { status: 500 });
    }

    // Log successful credit deduction
    await logActivity({
      userId: userId,
      jobId: generationId,
      action: 'credit_deducted',
      type: type,
      metadata: {
        credits_before: currentCredits,
        credits_after: currentCredits - 1,
      },
    });

    // Return the internal job ID to the client
    return NextResponse.json({
      internal_job_id: generationId,
      external_job_id: job_id_external,
      status: status
    });
  } catch (error) {
    console.error('Error in generate API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Define the API endpoint for retrieving generation results
export async function GET(req: NextRequest) {
  try {
    console.log('GET /api/generate called - starting to retrieve generation result');

    // Verify authentication
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // Get the internal job ID from query parameters
    const url = new URL(req.url);
    const internalJobId = url.searchParams.get('id');

    if (!internalJobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    console.log(`Fetching generation record for ID: ${internalJobId}, user: ${userId}`);

    // Check if the generation record belongs to the authenticated user
    const supabase = createServiceClient();

    const { data: generation, error: fetchError } = await supabase
      .from('generations')
      .select('*')
      .eq('id', internalJobId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !generation) {
      console.error('Error fetching generation record:', fetchError);
      return NextResponse.json({ error: 'Generation record not found' }, { status: 404 });
    }

    console.log('Fetched generation record:', {
      id: generation.id,
      status: generation.status,
      result_url: generation.result_url,
      job_id_external: generation.job_id_external,
      type: generation.type
    });

    // If the status is already 'completed', return the stored result
    if (generation.status === 'completed' && generation.result_url) {
      return NextResponse.json({
        internal_job_id: generation.id,
        external_job_id: generation.job_id_external,
        status: generation.status,
        result_url: generation.result_url,
        type: generation.type,
        prompt: generation.prompt
      });
    }

    // If status is not completed, get the latest status from Kie.ai API
    let kieResult: KieApiResponse | null = null;
    
    try {
      switch (generation.type) {
        case 'image':
          kieResult = await getImageStatus(generation.job_id_external);
          break;
        case 'text_to_prompt':
          kieResult = await getTextStatus(generation.job_id_external);
          break;
        case 'video':
          kieResult = await getVideoStatus(generation.job_id_external);
          break;
        default:
          return NextResponse.json({ error: 'Unsupported generation type' }, { status: 400 });
      }

      console.log('Kie.ai status check response:', kieResult);

      // Extract status and result from the response
      let status = 'pending';
      let resultUrl: string | null = null;
      
      // Check various response formats based on the API documentation
      if (kieResult && kieResult.data) {
        // Check if the response has successFlag (0: processing, 1: success, 2: failed)
        if (typeof kieResult.data.successFlag === 'number') {
          if (kieResult.data.successFlag === 1) {
            status = 'completed';
            // Direct extraction from the response based on your API response
            if (kieResult.data.response?.resultUrls && Array.isArray(kieResult.data.response.resultUrls) && kieResult.data.response.resultUrls.length > 0) {
              // Try to access the first URL from resultUrls
              resultUrl = kieResult.data.response.resultUrls[0];
            } else {
              // If resultUrls doesn't have items, try other possible response formats
              resultUrl = kieResult.data.result_url ||
                          kieResult.data.result ||
                          kieResult.data.url ||
                          kieResult.data.resultUrl ||
                          kieResult.data.outputUrl ||
                          kieResult.data.output_url ||
                          kieResult.data.content || null;
            }
          } else if (kieResult.data.successFlag === 0) {
            status = 'pending'; // Still processing
          } else if (kieResult.data.successFlag === 2) {
            status = 'failed'; // Generation failed
          }
        }

        // Also check the status field directly
        if (kieResult.data.status && status === 'pending') {
          const statusUpper = kieResult.data.status.toUpperCase();
          if (statusUpper === 'SUCCESS' || statusUpper === 'FINISHED') {
            status = 'completed';
            // Direct extraction from the response based on your API response
            if (kieResult.data.response?.resultUrls && Array.isArray(kieResult.data.response.resultUrls) && kieResult.data.response.resultUrls.length > 0) {
              // Try to access the first URL from resultUrls
              resultUrl = kieResult.data.response.resultUrls[0];
            } else {
              // If resultUrls doesn't have items, try other possible response formats
              resultUrl = kieResult.data.result_url ||
                          kieResult.data.result ||
                          kieResult.data.url ||
                          kieResult.data.resultUrl ||
                          kieResult.data.outputUrl ||
                          kieResult.data.output_url ||
                          kieResult.data.content || null;
            }
          } else if (statusUpper === 'GENERATING' || statusUpper === 'PENDING' || statusUpper === 'PROCESSING') {
            status = 'pending';
          } else if (statusUpper === 'CREATE_TASK_FAILED' || statusUpper === 'GENERATE_FAILED' || statusUpper === 'FAILED' || statusUpper === 'ERROR') {
            status = 'failed';
          }
        }
      }

      // Debug logging after processing
      console.log('After processing Kie.ai response:', {
        successFlag: kieResult?.data?.successFlag,
        status: kieResult?.data?.status,
        hasResponse: !!kieResult?.data?.response,
        hasResultUrls: !!(kieResult?.data?.response?.resultUrls),
        resultUrlsType: typeof kieResult?.data?.response?.resultUrls,
        resultUrlsIsArray: Array.isArray(kieResult?.data?.response?.resultUrls),
        resultUrlsLength: kieResult?.data?.response?.resultUrls?.length,
        resultUrls: kieResult?.data?.response?.resultUrls,
        extractedResultUrl: resultUrl,
        finalStatus: status
      });

      // Update the database record with the latest status and result if available
      console.log('Checking if database update is needed:', {
        currentStatus: generation.status,
        newStatus: status,
        hasResultUrl: !!resultUrl,
        currentResultUrl: generation.result_url,
        resultUrlValue: resultUrl
      });

      // Update if status changed OR if we have a result URL that's different from what's stored
      const shouldUpdateStatus = status !== generation.status;
      const shouldUpdateResult = resultUrl !== generation.result_url;  // Update if resultUrl is different

      if (shouldUpdateStatus || shouldUpdateResult) {
        console.log('Updating database with new status and/or result:', {
          status,
          resultUrl,
          shouldUpdateStatus,
          shouldUpdateResult
        });
        const { error: updateError } = await supabase
          .from('generations')
          .update({
            status: status,
            result_url: resultUrl
          })
          .eq('id', generation.id);

        if (updateError) {
          console.error('Error updating generation record:', updateError);
        } else {
          console.log('Successfully updated generation record in database');
        }
      } else {
        console.log('No update needed for database record');
      }

      // Log the status check
      await logActivity({
        userId: userId,
        jobId: generation.id,
        externalJobId: generation.job_id_external,
        action: 'status_check',
        type: generation.type,
        status: status,
        metadata: {
          kie_response_keys: kieResult ? Object.keys(kieResult) : undefined,
          has_result_url: !!resultUrl,
        },
      });

      // Return the current status and result if available
      return NextResponse.json({
        internal_job_id: generation.id,
        external_job_id: generation.job_id_external,
        status: status,
        result_url: resultUrl || generation.result_url,
        type: generation.type,
        prompt: generation.prompt
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error checking Kie.ai status:', error);

      await logActivity({
        userId: userId,
        jobId: generation.id,
        externalJobId: generation.job_id_external,
        action: 'status_check_error',
        type: generation.type,
        error: errorMessage || 'Unknown error',
        metadata: {
          error_stack: error instanceof Error ? error.stack : undefined,
        },
      });

      // Return the stored status even if we couldn't get a fresh status from Kie.ai
      return NextResponse.json({
        internal_job_id: generation.id,
        external_job_id: generation.job_id_external,
        status: generation.status,
        result_url: generation.result_url,
        type: generation.type,
        prompt: generation.prompt
      });
    }
  } catch (error) {
    console.error('Error in GET generate API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}