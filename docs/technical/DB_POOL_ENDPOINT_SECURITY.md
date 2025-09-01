# DB Pool Endpoint Security

## Overview
The `/api/db-pool` endpoint has been secured to prevent information leakage in production environments.

## Security Measures Implemented

### 1. API Key Authentication (Production Only)
- **Environment Variable**: `DB_POOL_API_KEY`
- **Header**: `x-api-key`, `X-API-Key`, or `Authorization: Bearer <key>`
- **Comparison**: Uses constant-time comparison to prevent timing attacks
- **Status Codes**:
  - `503 Service Unavailable`: API key not configured
  - `403 Forbidden`: Invalid or missing API key
  - `200 OK`: Valid API key provided

### 2. Environment-Based Response
The endpoint returns different levels of detail based on the environment:

#### Development Mode (NODE_ENV=development)
- Full access without API key
- Complete health check details
- All pool statistics
- Feature flag visibility
- Detailed error messages

#### Production Mode (NODE_ENV=production)
- Requires API key authentication
- Sanitized responses only:
  ```json
  {
    "status": "ok",
    "pool": {
      "status": "operational",
      "type": "optimized",
      "pool": {
        "maxConnections": 50,
        "utilizationInfo": "limited"
      }
    },
    "health": {
      "status": "ok",
      "timestamp": "2025-09-01T...",
      "metrics": {
        "responsive": true,
        "poolType": "optimized"
      }
    }
  }
  ```
- No internal implementation details
- No feature flag exposure
- Generic error messages

### 3. Security Utilities
Located in `/src/lib/security-utils.ts`:

- **`safeCompare()`**: Constant-time string comparison using Node.js crypto.timingSafeEqual
- **`validateApiKey()`**: Validates API keys from request headers
- **`sanitizePoolStats()`**: Removes sensitive pool statistics
- **`sanitizeHealthData()`**: Sanitizes health check data

## Configuration

### Setting Up API Key (Production)
1. Generate a secure API key:
   ```bash
   openssl rand -hex 32
   ```

2. Set environment variable:
   ```bash
   DB_POOL_API_KEY=your-generated-key-here
   ```

3. Add to production environment (.env.production or deployment platform)

### Using the Endpoint

#### Without Authentication (Development)
```bash
curl http://localhost:3000/api/db-pool
```

#### With Authentication (Production)
```bash
curl -H "x-api-key: your-api-key" https://biblequiz.textr.in/api/db-pool
```

#### Alternative Headers
```bash
# Using X-API-Key
curl -H "X-API-Key: your-api-key" https://biblequiz.textr.in/api/db-pool

# Using Authorization Bearer
curl -H "Authorization: Bearer your-api-key" https://biblequiz.textr.in/api/db-pool
```

## Testing
Use the provided test script:
```bash
node scripts/test-db-pool-endpoint.js
```

This script tests:
1. Access without API key
2. Access with valid API key
3. Access with invalid API key

## Security Considerations

1. **API Key Storage**: Never commit API keys to version control
2. **Key Rotation**: Rotate API keys periodically
3. **Access Logs**: Monitor access logs for unauthorized attempts
4. **Rate Limiting**: Consider adding rate limiting for additional protection
5. **HTTPS Only**: Always use HTTPS in production to protect API keys in transit

## Migration Notes

### For Existing Deployments
1. Deploy the code changes
2. Set `DB_POOL_API_KEY` environment variable
3. Update monitoring tools to include API key header
4. Test with the new authentication

### Backward Compatibility
- Development environments remain unchanged
- Production environments without `DB_POOL_API_KEY` will return 503
- Existing monitoring may need updates to include authentication

## Monitoring Integration

### Example: Datadog/New Relic
```javascript
// Health check with API key
const response = await fetch('https://biblequiz.textr.in/api/db-pool', {
  headers: {
    'x-api-key': process.env.MONITORING_API_KEY
  }
});
```

### Example: Kubernetes Liveness Probe
```yaml
livenessProbe:
  httpGet:
    path: /api/db-pool
    port: 3000
    httpHeaders:
    - name: x-api-key
      value: $(DB_POOL_API_KEY)
```

## Troubleshooting

### 503 Service Unavailable
- Check if `DB_POOL_API_KEY` is set in production environment
- Verify environment variables are loaded correctly

### 403 Forbidden
- Verify API key is correct
- Check header name (x-api-key, X-API-Key, or Authorization)
- Ensure no extra spaces in the API key

### Empty or Limited Response
- This is expected in production (sanitized response)
- Use development environment for detailed debugging