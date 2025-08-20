/**
 * Environment variable validation and configuration
 * Ensures all required environment variables are present in production
 */

const requiredEnvVars = {
  // Database
  POSTGRES_URL: process.env.POSTGRES_URL,
  
  // Authentication
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  
  // Google OAuth (optional but recommended)
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  
  // AI Integration
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  
  // LightRAG
  LIGHTRAG_API_URL: process.env.LIGHTRAG_API_URL,
  LIGHTRAG_API_KEY: process.env.LIGHTRAG_API_KEY,
  
  // Quiz Generation
  QUIZ_GENERATION_WEBHOOK_URL: process.env.QUIZ_GENERATION_WEBHOOK_URL,
  
  // Email
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  
  // Application
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
};

const optionalEnvVars = {
  // AI Models
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  OPENAI_EMBEDDING_MODEL: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large',
  
  // Email
  SMTP_PORT: process.env.SMTP_PORT || '587',
  SMTP_SECURE: process.env.SMTP_SECURE || 'false',
  EMAIL_FROM: process.env.EMAIL_FROM || 'Scrolls of Wisdom <noreply@scrollsofwisdom.com>',
  
  // File Storage
  BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
  
  // Monitoring
  SENTRY_DSN: process.env.SENTRY_DSN,
  
  // Node Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
};

/**
 * Validates that all required environment variables are present
 * Call this during app initialization
 */
export function validateEnv() {
  const missingVars: string[] = [];
  
  // Skip validation in development for some vars
  const isDev = process.env.NODE_ENV === 'development';
  const skipInDev = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'SMTP_USER', 'SMTP_PASS'];
  
  for (const [key, value] of Object.entries(requiredEnvVars)) {
    if (!value && !(isDev && skipInDev.includes(key))) {
      missingVars.push(key);
    }
  }
  
  if (missingVars.length > 0) {
    const errorMessage = `Missing required environment variables:\n${missingVars.join('\n')}`;
    
    // In production, throw an error to prevent app from starting
    if (process.env.NODE_ENV === 'production') {
      throw new Error(errorMessage);
    } else {
      // In development, just warn
      console.warn('⚠️ Warning:', errorMessage);
    }
  }
  
  return true;
}

/**
 * Typed environment configuration
 * Use this throughout the app instead of process.env directly
 */
export const env = {
  // Database
  database: {
    url: requiredEnvVars.POSTGRES_URL!,
  },
  
  // Authentication
  auth: {
    secret: requiredEnvVars.BETTER_AUTH_SECRET!,
    google: {
      clientId: requiredEnvVars.GOOGLE_CLIENT_ID || '',
      clientSecret: requiredEnvVars.GOOGLE_CLIENT_SECRET || '',
    },
  },
  
  // AI
  ai: {
    openai: {
      apiKey: requiredEnvVars.OPENAI_API_KEY!,
      model: optionalEnvVars.OPENAI_MODEL,
      embeddingModel: optionalEnvVars.OPENAI_EMBEDDING_MODEL,
    },
  },
  
  // LightRAG
  lightrag: {
    apiUrl: requiredEnvVars.LIGHTRAG_API_URL!,
    apiKey: requiredEnvVars.LIGHTRAG_API_KEY!,
  },
  
  // Quiz Generation
  quiz: {
    webhookUrl: requiredEnvVars.QUIZ_GENERATION_WEBHOOK_URL!,
  },
  
  // Email
  email: {
    smtp: {
      host: requiredEnvVars.SMTP_HOST!,
      port: parseInt(optionalEnvVars.SMTP_PORT),
      secure: optionalEnvVars.SMTP_SECURE === 'true',
      user: requiredEnvVars.SMTP_USER || '',
      pass: requiredEnvVars.SMTP_PASS || '',
    },
    from: optionalEnvVars.EMAIL_FROM,
  },
  
  // Application
  app: {
    url: requiredEnvVars.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    isDev: optionalEnvVars.NODE_ENV === 'development',
    isProd: optionalEnvVars.NODE_ENV === 'production',
  },
  
  // Storage
  storage: {
    blobToken: optionalEnvVars.BLOB_READ_WRITE_TOKEN,
  },
  
  // Monitoring
  monitoring: {
    sentryDsn: optionalEnvVars.SENTRY_DSN,
  },
};

// Validate environment variables on module load
if (typeof window === 'undefined') {
  // Only validate on server-side
  validateEnv();
}