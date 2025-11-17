import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { getLoggingConfig } from './logging-config';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Interface for logging data
export interface LogData {
  userId?: string;
  jobId?: string;
  externalJobId?: string;
  action: string;
  status?: string;
  type?: string;
  responseTime?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

// Function to log API activities to console and potentially external services
export async function logActivity(data: LogData): Promise<void> {
  const config = getLoggingConfig();

  // Check if logging is enabled based on the configured level
  const levelOrder = { debug: 0, info: 1, warn: 2, error: 3 };
  const currentLevelIndex = levelOrder[config.level];
  const actionLevelIndex = data.error ? levelOrder.error :
                           data.action.includes('error') ? levelOrder.error :
                           data.action.includes('warning') || data.action.includes('warn') ? levelOrder.warn : levelOrder.info;

  if (!config.enabled || actionLevelIndex < currentLevelIndex) {
    return; // Logging disabled or below configured level
  }

  // Log to console for debugging
  console.log(`[LOG] ${data.action}`, {
    userId: data.userId,
    jobId: data.jobId,
    externalJobId: data.externalJobId,
    status: data.status,
    type: data.type,
    responseTime: data.responseTime,
    error: data.error,
    metadata: data.metadata,
    timestamp: new Date().toISOString(),
  });

  // In the future, you could add calls to external logging services here
  // For example, sending logs to Sentry, LogRocket, etc.
  // This is where you would implement actual logging to external services
  try {
    // Check if external logging is configured
    if (config.externalLogging.enabled) {
      // Example: send to external logging service
      await sendToExternalLogger(data);
    }
  } catch (error) {
    console.error('Error sending log to external service:', error);
  }
}

// Function to send logs to external logging services
async function sendToExternalLogger(data: LogData): Promise<void> {
  const config = getLoggingConfig();

  // This is where you would implement the actual external logging
  // For example, you could:
  // 1. Send to a custom logging endpoint
  // 2. Send to a third-party service like Sentry, LogRocket, etc.
  // 3. Send to an analytics service

  // Example implementation for a custom logging endpoint:
  if (config.externalLogging.webhookUrl) {
    try {
      await fetch(config.externalLogging.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Failed to send log to external service:', error);
    }
  }

  // You could also add implementations for other services like Sentry here
}
