import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServiceClient } from '@/lib/supabase-server';
import { JobStatus } from '@/lib/types';
import { logActivity } from '@/lib/utils';
import {
  getImageStatusAlt,
  getVideoStatus,
  getTextStatus,
  KieApiResponse
} from '@/lib/kie-api';

// Define the API endpoint for checking job status
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await context.params;
  try {
    // jobId is extracted from context above

    // Verify authentication
    const authObject = await auth();
    const { userId } = authObject;
    if (!userId) {
      await logActivity({
        jobId: jobId,
        action: 'status_unauthorized',
        metadata: {
          endpoint: req.url,
        },
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Log the status check request
    await logActivity({
      userId: userId,
      jobId: jobId,
      action: 'status_check_request',
    });

    // Fetch the job from the database
    const supabase = createServiceClient();

    const { data: job, error } = await supabase
      .from('generations')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', userId)
      .single();

    if (error || !job) {
      console.error('Error fetching job:', error);
      await logActivity({
        userId: userId,
        jobId: jobId,
        action: 'job_fetch_error',
        error: error?.message || 'Job not found',
      });
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // If the job is already completed or failed, return the status directly
    if (job.status === 'completed' || job.status === 'failed') {
      await logActivity({
        userId: userId,
        jobId: jobId,
        action: 'status_check_cached',
        status: job.status,
        metadata: {
          cached_result: true,
          result_url_exists: !!job.result_url,
        },
      });

      return NextResponse.json({
        status: job.status,
        url: job.result_url || null,
        error_message: job.error_message || null,
      });
    }

    // If the job is still pending or processing, check the external API
    if (!job.job_id_external) {
      await logActivity({
        userId: userId,
        jobId: jobId,
        action: 'external_job_id_missing',
        status: job.status,
      });
      return NextResponse.json({ error: 'External job ID not found' }, { status: 500 });
    }

    // Call Kie.ai API to get the current status using helper functions
    let kieResult;
    let responseTime: number = 0; // Initialize with 0 to avoid undefined issues in catch block

    try {
      const startTime = Date.now();

      switch (job.type) {
        case 'image':
          kieResult = await getImageStatusAlt(job.job_id_external);
          responseTime = Date.now() - startTime;
          break;
        case 'text_to_prompt':
          kieResult = await getTextStatus(job.job_id_external);
          responseTime = Date.now() - startTime;
          break;
        case 'video':
          kieResult = await getVideoStatus(job.job_id_external);
          responseTime = Date.now() - startTime;
          break;
        default:
          await logActivity({
            userId: userId,
            jobId: jobId,
            action: 'unsupported_generation_type',
            type: job.type,
          });
          return NextResponse.json({ error: 'Unsupported generation type' }, { status: 400 });
      }

      // Log the response to debug the structure
      console.log('Kie.ai status response:', kieResult);

      // Log successful API call to Kie.ai
      await logActivity({
        userId: userId,
        jobId: jobId,
        externalJobId: job.job_id_external,
        action: 'kie_api_status_success',
        type: job.type,
        responseTime: responseTime,
        metadata: {
          response_keys: Object.keys(kieResult),
        },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Kie.ai API error:', error);

      // Update the job status to failed in the database
      await supabase
        .from('generations')
        .update({ status: 'failed', error_message: errorMessage || 'Kie.ai API error' })
        .eq('id', jobId);

      await logActivity({
        userId: userId,
        jobId: jobId,
        externalJobId: job.job_id_external,
        action: 'kie_api_status_error',
        type: job.type,
        error: errorMessage || 'Kie.ai API error',
        responseTime: responseTime,
        metadata: {
          error_stack: error instanceof Error ? error.stack : undefined,
        },
      });

      return NextResponse.json({
        status: 'failed',
        error_message: errorMessage || 'Kie.ai API error'
      });
    }

    // Update the job status based on the external API response
    let updatedStatus: JobStatus = 'processing';
    let resultUrl: string | null = null;

    // Handle various possible response formats from different Kie.ai APIs
    // Since different APIs might return different response structures
    if (kieResult) {
      // Check based on Kie.ai documentation format: {code, msg, data: {successFlag, response, etc.}}
      if (kieResult.data && kieResult.data.successFlag !== undefined) {
        const successFlag = kieResult.data.successFlag;

        if (successFlag === 1) { // Success
          updatedStatus = 'completed';
          // For image responses, result URLs are in resultUrls array (as per API documentation)
          if (kieResult.data.response && kieResult.data.response.resultUrls && Array.isArray(kieResult.data.response.resultUrls) && kieResult.data.response.resultUrls.length > 0) {
            resultUrl = kieResult.data.response.resultUrls[0]; // Use first URL
          }
          // Also check result_urls (snake_case) for compatibility
          else if (kieResult.data.response && kieResult.data.response.result_urls && Array.isArray(kieResult.data.response.result_urls) && kieResult.data.response.result_urls.length > 0) {
            resultUrl = kieResult.data.response.result_urls[0]; // Use first URL
          } else {
            resultUrl = null;
          }
        } else if (successFlag === 2) { // Failed
          updatedStatus = 'failed';
        } else if (successFlag === 0) { // Processing
          updatedStatus = 'processing';
        } else {
          updatedStatus = 'processing'; // Default to processing for unknown flags
        }
      }
      // Check the documented format: {code, message, data: {taskId, status, result_url}}
      else if (kieResult.data && kieResult.data.status) {
        const externalStatus = kieResult.data.status;
        if (externalStatus === 'completed' || externalStatus === 'succeeded' || externalStatus === 'success') {
          updatedStatus = 'completed';
          // Check for result URL in multiple possible locations
          // First check response.resultUrls array (as per API documentation)
          if (kieResult.data.response?.resultUrls && Array.isArray(kieResult.data.response.resultUrls) && kieResult.data.response.resultUrls.length > 0) {
            resultUrl = kieResult.data.response.resultUrls[0];
          }
          // Also check response.result_urls array (snake_case) for compatibility
          else if (kieResult.data.response?.result_urls && Array.isArray(kieResult.data.response.result_urls) && kieResult.data.response.result_urls.length > 0) {
            resultUrl = kieResult.data.response.result_urls[0];
          }
          // Fallback to other possible result URL fields
          else {
            resultUrl = kieResult.data.result_url ||
                       kieResult.data.resultUrl ||
                       kieResult.data.url ||
                       kieResult.data.result ||
                       kieResult.data.output_url ||
                       kieResult.data.outputUrl || null;
          }
        } else if (externalStatus === 'failed' || externalStatus === 'error') {
          updatedStatus = 'failed';
        } else {
          updatedStatus = 'processing';
        }
      }
      // Check alternative format where status is at root level: {status, url, ...}
      else if (kieResult.status) {
        const externalStatus = kieResult.status;
        if (externalStatus === 'completed' || externalStatus === 'succeeded' || externalStatus === 'success') {
          updatedStatus = 'completed';
          // Check for result URL in multiple possible locations
          // First check response.resultUrls array (as per API documentation)
          if (kieResult.response?.resultUrls && Array.isArray(kieResult.response.resultUrls) && kieResult.response.resultUrls.length > 0) {
            resultUrl = kieResult.response.resultUrls[0];
          }
          // Also check response.result_urls array (snake_case) for compatibility
          else if (kieResult.response?.result_urls && Array.isArray(kieResult.response.result_urls) && kieResult.response.result_urls.length > 0) {
            resultUrl = kieResult.response.result_urls[0];
          }
          // Fallback to other possible result URL fields
          else {
            resultUrl = kieResult.url ||
                       kieResult.result_url ||
                       kieResult.resultUrl ||
                       kieResult.result ||
                       kieResult.output_url ||
                       kieResult.outputUrl || null;
          }
        } else if (externalStatus === 'failed' || externalStatus === 'error') {
          updatedStatus = 'failed';
        } else {
          updatedStatus = 'processing';
        }
      }
      // Check if response has a direct status field (some APIs use simple true/false or 200/400)
      else if (kieResult.success !== undefined) {
        if (kieResult.success) {
          updatedStatus = 'completed';
          // First check response.resultUrls array (as per API documentation)
          if (kieResult.response?.resultUrls && Array.isArray(kieResult.response.resultUrls) && kieResult.response.resultUrls.length > 0) {
            resultUrl = kieResult.response.resultUrls[0];
          }
          // Also check response.result_urls array (snake_case) for compatibility
          else if (kieResult.response?.result_urls && Array.isArray(kieResult.response.result_urls) && kieResult.response.result_urls.length > 0) {
            resultUrl = kieResult.response.result_urls[0];
          }
          // Look for possible result URL fields in the response
          else {
            resultUrl = kieResult.url ||
                       kieResult.result_url ||
                       kieResult.resultUrl ||
                       kieResult.result ||
                       kieResult.output_url ||
                       kieResult.outputUrl ||
                       kieResult.data?.url ||
                       kieResult.data?.result_url ||
                       kieResult.data?.resultUrl ||
                       kieResult.data?.result ||
                       kieResult.data?.output_url ||
                       kieResult.data?.outputUrl || null;
          }
        } else {
          updatedStatus = 'failed';
        }
      }
      else {
        // If the response doesn't match any known format, log for debugging
        console.error('Unexpected Kie.ai status response format:', kieResult);
        await logActivity({
          userId: userId,
          jobId: jobId,
          externalJobId: job.job_id_external,
          action: 'unexpected_response_format',
          type: job.type,
          error: 'Response does not match any known Kie.ai API format',
          metadata: {
            response: kieResult,
            response_type: typeof kieResult,
          },
        });
        // Default to processing if we can't determine status from the response
        updatedStatus = 'processing';
      }
    } else {
      console.error('Empty or invalid Kie.ai status response:', kieResult);
      await logActivity({
        userId: userId,
        jobId: jobId,
        externalJobId: job.job_id_external,
        action: 'invalid_response',
        type: job.type,
        error: 'Empty or invalid Kie.ai status response',
      });
      updatedStatus = 'failed';
    }

    // Log for debugging the result URL
    console.log('Processing status update - Job ID:', jobId, 'Status:', updatedStatus, 'Result URL:', resultUrl);

    // Update the job in the database if the status has changed
    if (job.status !== updatedStatus || (resultUrl && !job.result_url)) {
      const updateData: { status: JobStatus; result_url?: string } = { status: updatedStatus };
      if (resultUrl) {
        updateData.result_url = resultUrl;
        console.log('Updating job with result URL:', resultUrl);
      }

      const { error: updateError } = await supabase
        .from('generations')
        .update(updateData)
        .eq('id', jobId);

      if (updateError) {
        console.error('Error updating job status:', updateError);

        await logActivity({
          userId: userId,
          jobId: jobId,
          action: 'database_update_error',
          status: updatedStatus,
          type: job.type,
          error: updateError.message,
          metadata: {
            operation: 'update_generation_status',
            update_data: updateData,
          },
        });

        return NextResponse.json({ error: 'Failed to update job status' }, { status: 500 });
      }

      // Log successful status update
      await logActivity({
        userId: userId,
        jobId: jobId,
        action: 'status_updated',
        status: updatedStatus,
        type: job.type,
        metadata: {
          previous_status: job.status,
          has_result_url: !!resultUrl,
        },
      });
    } else {
      // Still update the job status even if result URL is the same to ensure consistency
      if (job.status !== updatedStatus) {
        const { error: updateError } = await supabase
          .from('generations')
          .update({ status: updatedStatus })
          .eq('id', jobId);

        if (updateError) {
          console.error('Error updating job status only:', updateError);
          await logActivity({
            userId: userId,
            jobId: jobId,
            action: 'status_update_error',
            status: updatedStatus,
            type: job.type,
            error: updateError.message,
          });
          return NextResponse.json({ error: 'Failed to update job status' }, { status: 500 });
        }

        // Log successful status update
        await logActivity({
          userId: userId,
          jobId: jobId,
          action: 'status_updated',
          status: updatedStatus,
          type: job.type,
        });
      }
    }

    // Log the final response
    await logActivity({
      userId: userId,
      jobId: jobId,
      action: 'status_response',
      status: updatedStatus,
      type: job.type,
      metadata: {
        has_result_url: !!resultUrl,
        has_error_message: !!job.error_message,
      },
    });

    // Return the updated status
    if (updatedStatus === 'completed') {
      return NextResponse.json({
        status: updatedStatus,
        url: resultUrl
      });
    } else if (updatedStatus === 'failed') {
      return NextResponse.json({
        status: updatedStatus,
        error_message: job.error_message || null
      });
    } else {
      return NextResponse.json({
        status: updatedStatus
      });
    }
  } catch (error) {
    console.error('Error in status API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}