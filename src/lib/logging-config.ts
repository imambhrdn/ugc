// Configuration for logging services
export interface LoggingConfig {
  enabled: boolean;
  level: 'debug' | 'info' | 'warn' | 'error';
  externalLogging: {
    enabled: boolean;
    webhookUrl?: string;
    services: {
      sentry?: {
        dsn?: string;
        environment?: string;
      };
      logRocket?: {
        appId?: string;
      };
      // Add other logging services as needed
    };
  };
}

// Default configuration
export const defaultLoggingConfig: LoggingConfig = {
  enabled: true,
  level: 'info',
  externalLogging: {
    enabled: false,
    webhookUrl: process.env.LOGGING_WEBHOOK_URL,
    services: {
      sentry: {
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
      },
      logRocket: {
        appId: process.env.LOGROCKET_APP_ID,
      },
    },
  },
};

// Get configuration from environment variables or use defaults
export function getLoggingConfig(): LoggingConfig {
  return {
    ...defaultLoggingConfig,
    enabled: process.env.LOGGING_ENABLED === 'true',
    level: (process.env.LOGGING_LEVEL as 'debug' | 'info' | 'warn' | 'error') || defaultLoggingConfig.level,
    externalLogging: {
      ...defaultLoggingConfig.externalLogging,
      enabled: process.env.EXTERNAL_LOGGING_ENABLED === 'true',
      webhookUrl: process.env.LOGGING_WEBHOOK_URL || defaultLoggingConfig.externalLogging.webhookUrl,
      services: {
        sentry: {
          dsn: process.env.SENTRY_DSN || defaultLoggingConfig.externalLogging.services.sentry?.dsn,
          environment: process.env.NODE_ENV || defaultLoggingConfig.externalLogging.services.sentry?.environment,
        },
        logRocket: {
          appId: process.env.LOGROCKET_APP_ID || defaultLoggingConfig.externalLogging.services.logRocket?.appId,
        },
      },
    },
  };
}

// Initialize logging services based on configuration
export function initializeLogging(): void {
  const config = getLoggingConfig();
  
  if (config.enabled) {
    console.log('[LOGGING] Initializing with config:', config);
    
    // Initialize external logging services if enabled
    if (config.externalLogging.enabled) {
      // Example: Initialize Sentry if DSN is provided
      if (config.externalLogging.services.sentry?.dsn) {
        // In a real implementation, you would initialize Sentry here
        // import('@sentry/nextjs').then(sentry => {
        //   sentry.init({
        //     dsn: config.externalLogging.services.sentry!.dsn,
        //     environment: config.externalLogging.services.sentry!.environment,
        //   });
        // });
      }
      
      // Example: Initialize LogRocket if App ID is provided
      if (config.externalLogging.services.logRocket?.appId) {
        // In a real implementation, you would initialize LogRocket here
        // import('logrocket').then(LogRocket => {
        //   LogRocket.init(config.externalLogging.services.logRocket!.appId!);
        // });
      }
    }
  }
}