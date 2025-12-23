/**
 * Environment variable validation and configuration
 * Ensures all required variables are present at runtime
 */

interface EnvConfig {
  supabase: {
    url: string;
    publishableKey: string;
  };
  features: {
    analytics: boolean;
    payments: boolean;
    notifications: boolean;
  };
}

function validateEnv(key: string, value: string | undefined): string {
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `Please set ${key} in your .env file or deployment environment.\n` +
      `See .env.example for required variables.`
    );
  }
  return value;
}

function getOptionalEnv(key: string, defaultValue: string): string {
  return import.meta.env[key] || defaultValue;
}

// Validate required environment variables on import
export const env: EnvConfig = {
  supabase: {
    url: validateEnv('VITE_SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL),
    publishableKey: validateEnv('VITE_SUPABASE_PUBLISHABLE_KEY', import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
  },
  features: {
    analytics: getOptionalEnv('VITE_FEATURE_ANALYTICS', 'true') === 'true',
    payments: getOptionalEnv('VITE_FEATURE_PAYMENTS', 'true') === 'true',
    notifications: getOptionalEnv('VITE_FEATURE_NOTIFICATIONS', 'true') === 'true',
  },
};

// Development mode check
export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;

// Log configuration in development
if (isDevelopment) {
  console.log('[ENV] Configuration loaded:', {
    supabase: { url: env.supabase.url },
    features: env.features,
    mode: import.meta.env.MODE,
  });
}
