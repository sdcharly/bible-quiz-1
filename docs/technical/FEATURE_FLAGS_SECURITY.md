# Feature Flags Security Documentation

## Overview
The feature flags system has been secured to prevent client-side tampering and ensure only authorized features can be controlled via cookies.

## Security Measures Implemented

### 1. Signed Cookies with HMAC
- All feature flag cookies are now signed using HMAC-SHA256
- Signature verification prevents tampering
- Secret key stored in `FEATURE_FLAG_SECRET` environment variable

### 2. Allowlist for Client-Controllable Features
Only the following non-sensitive features can be controlled via cookies:
- `BROWSER_CACHE_OPTIMIZATION` - UI performance optimization
- `COMPONENT_LAZY_LOADING` - Client-side loading behavior
- `DEBUG_PERFORMANCE` - Development-only debugging (disabled in production)

### 3. Server-Side Validation
- Cookie values are verified for integrity before trust
- Invalid signatures are rejected
- Constant-time comparison prevents timing attacks

### 4. Cookie Security Settings
- `httpOnly`: true - Prevents JavaScript access
- `secure`: true (in production) - HTTPS only
- `sameSite`: 'strict' - CSRF protection
- Limited lifetime (1 hour) - Reduces exposure window

## Sensitive Features (Server-Only)
The following features are NEVER controllable via cookies:
- Database optimizations
- Authentication features
- Real-time updates
- Monitoring and analytics
- API endpoints
- Submission handling

These can only be controlled via:
1. Environment variables (`NEXT_PUBLIC_FF_*`)
2. Server-side configuration
3. Admin API (development only)

## Configuration

### Production Setup
1. Generate a secure secret:
```bash
openssl rand -hex 32
```

2. Set in environment:
```
FEATURE_FLAG_SECRET=your-generated-secret
```

### Testing Client-Controllable Flags
```javascript
// Only these flags will work via cookies:
const allowedFlags = [
  'BROWSER_CACHE_OPTIMIZATION',
  'COMPONENT_LAZY_LOADING',
  'DEBUG_PERFORMANCE' // dev only
];
```

## Security Considerations
1. Never add sensitive features to `CLIENT_CONTROLLABLE_FLAGS`
2. Rotate `FEATURE_FLAG_SECRET` periodically
3. Monitor for unusual feature flag patterns
4. Use server-side feature flags for critical functionality

## Migration Notes
- Old unsigned cookies will be ignored
- Existing server-side flags remain unaffected
- Admin API still works for development testing