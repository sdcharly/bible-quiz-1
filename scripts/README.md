# Scripts Directory

This folder contains utility and test scripts for development and testing purposes.

## Directory Structure

### `/tests`
Manual test scripts for API endpoints and features:

- **test-signup.js** - Tests email/password signup functionality
- **test-webhook.js** - Tests webhook endpoints
- **test-webhook-flow.js** - Tests complete webhook flow
- **test-replace-webhook.js** - Tests question replacement webhook

### `/utils`
Utility scripts for development tasks (placeholder for future scripts)

## Usage

### Running Test Scripts

From the project root:

```bash
# Test signup flow
node scripts/tests/test-signup.js

# Test webhook
node scripts/tests/test-webhook.js

# Test webhook flow
node scripts/tests/test-webhook-flow.js

# Test replace webhook
node scripts/tests/test-replace-webhook.js
```

### Environment Variables

Some test scripts may require environment variables:
- `TEST_PASSWORD` - Password for test user creation
- `WEBHOOK_URL` - Webhook endpoint URL

## Important Notes

- These are manual test scripts, not automated tests
- Should NOT be deployed to production
- Used for development and debugging only
- Consider converting to proper automated tests in the future

## Future Improvements

- [ ] Convert to proper Jest/Vitest test suite
- [ ] Add automated API testing
- [ ] Create utility scripts for common tasks
- [ ] Add database seed scripts