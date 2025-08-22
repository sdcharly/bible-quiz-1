# Environment Configuration Guide

## Overview
This document explains how environment detection and configuration works in the SimpleQuiz application, particularly for deployment scenarios.

## How Environment Detection Works

### 1. **NODE_ENV (Automatically Set by Next.js)**
Next.js automatically sets `NODE_ENV` based on the command you run:

| Command | NODE_ENV Value | Purpose |
|---------|---------------|---------|
| `npm run dev` | development | Local development with hot reload |
| `npm run build` | production | Building for production |
| `npm run start` | production | Running production build |
| `npm test` | test | Running tests |

**You don't need to set NODE_ENV manually** - Next.js handles this automatically.

### 2. **Environment Files**
The application uses different `.env` files for different environments:

- `.env` - Default environment variables (loaded in all environments)
- `.env.local` - Local overrides (git-ignored, for local development)
- `.env.production` - Production environment variables
- `.env.development` - Development environment variables (optional)

**Loading Order:**
1. `.env` (always loaded)
2. `.env.local` (always loaded if exists, overrides `.env`)
3. `.env.development` or `.env.production` (based on NODE_ENV)
4. `.env.development.local` or `.env.production.local` (if exists)

## Custom Environment Flags

### Performance & Debugging Flags

Add these to your `.env.production` or deployment platform environment variables:

```bash
# Enable debug mode in production (USE WITH CAUTION)
NEXT_PUBLIC_DEBUG_MODE=false

# Enable specific features
NEXT_PUBLIC_ENABLE_DEBUG_ENDPOINTS=false
NEXT_PUBLIC_ENABLE_WEBHOOK_LOGGING=false

# Control logging
NEXT_PUBLIC_ENABLE_LOGGING=false
NEXT_PUBLIC_LOG_LEVEL=error  # Options: debug, info, warn, error

# Deployment environment
NEXT_PUBLIC_DEPLOYMENT_ENV=production  # Options: production, staging

# Maintenance mode
NEXT_PUBLIC_MAINTENANCE_MODE=false
```

### Required Production Variables

These MUST be set in production:

```bash
# Database
POSTGRES_URL=your_database_url

# Authentication
BETTER_AUTH_SECRET=your_secret_key

# Application
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# LightRAG API (for document processing)
LIGHTRAG_API_KEY=your_api_key
LIGHTRAG_API_URL=https://lightrag-api-url

# Email (if using email features)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

## Deployment Platform Configuration

### Vercel
1. Go to Project Settings > Environment Variables
2. Add variables for Production, Preview, and Development environments
3. Vercel automatically sets NODE_ENV

### Railway/Render
1. Add environment variables in the dashboard
2. NODE_ENV is automatically set to 'production'

### Docker
```dockerfile
# In your Dockerfile
ENV NODE_ENV=production
ENV NEXT_PUBLIC_DEPLOYMENT_ENV=production
```

### Manual Deployment
```bash
# Build command
NODE_ENV=production npm run build

# Start command
NODE_ENV=production npm run start
```

## Environment Configuration API

The application uses `/src/lib/env-config.ts` for centralized environment detection:

```typescript
import { ENV } from '@/lib/env-config';

// Check environment
if (ENV.isDevelopment) { /* dev only code */ }
if (ENV.isProduction) { /* production only code */ }

// Check features
if (ENV.isDebugMode) { /* debug mode enabled */ }
if (ENV.enableLogging) { /* logging enabled */ }
```

## Performance Optimizations by Environment

### Development (NODE_ENV=development)
- ✅ All console.log statements active
- ✅ Debug endpoints accessible
- ✅ Webhook logging enabled
- ✅ Detailed error messages

### Production (NODE_ENV=production)
- ❌ Console.log statements disabled (unless NEXT_PUBLIC_ENABLE_LOGGING=true)
- ❌ Debug endpoints blocked (unless NEXT_PUBLIC_ENABLE_DEBUG_ENDPOINTS=true)
- ❌ Webhook logging disabled (unless NEXT_PUBLIC_ENABLE_WEBHOOK_LOGGING=true)
- ❌ Generic error messages for security

## Troubleshooting

### How to Enable Debugging in Production
**⚠️ WARNING: Only for troubleshooting, disable afterward!**

1. Set in your deployment platform:
```bash
NEXT_PUBLIC_DEBUG_MODE=true
NEXT_PUBLIC_ENABLE_LOGGING=true
NEXT_PUBLIC_LOG_LEVEL=debug
```

2. Redeploy the application

3. **IMPORTANT**: Disable after troubleshooting to maintain performance

### Checking Current Environment
Add this temporary API route to check environment:

```typescript
// app/api/check-env/route.ts
import { NextResponse } from 'next/server';
import { envSummary } from '@/lib/env-config';

export async function GET() {
  return NextResponse.json(envSummary);
}
```

Visit `/api/check-env` to see current environment configuration.

## Performance Impact

| Feature | Development | Production | Production + Debug |
|---------|------------|------------|-------------------|
| Console Logging | ✅ Active | ❌ Disabled | ✅ Active |
| Memory Usage | High | Low | Medium |
| Response Time | Slower | Fast | Medium |
| Debug Endpoints | ✅ Open | ❌ Blocked | ✅ Open |

## Best Practices

1. **Never commit `.env.local`** - It's in .gitignore for a reason
2. **Use NEXT_PUBLIC_ prefix** for client-side variables
3. **Keep production logs minimal** - Only errors by default
4. **Enable debug mode temporarily** - Don't leave it on
5. **Monitor performance** - Check response times after changes
6. **Use environment-specific configs** - Different settings for staging vs production

## Migration Checklist

When deploying to a new environment:

- [ ] Set all required environment variables
- [ ] Verify NODE_ENV is set correctly (usually automatic)
- [ ] Test database connection
- [ ] Check authentication works
- [ ] Verify email sending (if applicable)
- [ ] Test file uploads (if applicable)
- [ ] Monitor initial performance
- [ ] Disable debug mode if enabled for testing

## Support

For issues with environment configuration:
1. Check `/api/check-env` endpoint (if added)
2. Review deployment platform logs
3. Verify all required variables are set
4. Check this documentation for updates