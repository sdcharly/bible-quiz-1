# Scripts Directory

This directory contains various utility scripts for the application.

## Security Notice

⚠️ **IMPORTANT**: Scripts in this directory use environment variables for database credentials and other sensitive information. Never hardcode credentials in script files.

## Environment Variables Required

All scripts require the following environment variables to be set in your `.env` file:

- `POSTGRES_URL` - Database connection string
- `TEST_PASSWORD` - Password for test scripts (optional)

## Usage

1. Ensure your `.env` file contains all required environment variables
2. Run scripts from the project root directory:
   ```bash
   npm run ts-node scripts/script-name.ts
   ```

## Security Best Practices

- Never commit files with hardcoded credentials
- Always use environment variables for sensitive data
- Test scripts should use environment variables or secure defaults
- Review all scripts before committing to ensure no secrets are exposed