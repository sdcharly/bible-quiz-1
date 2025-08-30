# Production Admin Setup

## ⚠️ Current Status: Admin Login Not Working in Production

The admin login is returning "Invalid credentials" on production. This means the required environment variables are not set or are different in your production deployment.

## Required Environment Variables for Production

You need to add these environment variables to your production deployment (Vercel, Railway, etc.):

```env
SUPER_ADMIN_EMAIL=admin@biblequiz.app
SUPER_ADMIN_PASSWORD_HASH=$2b$12$WJXDj944I3yLlW77AwC3VOBDpz5wflwBtbi0hgDv4nrm.Arlweaq6
SUPER_ADMIN_SECRET_KEY=FvCt6P8LHptMJNyVYXFYPMqniUrZnH2n
```

## Important Notes

1. **Use SUPER_ADMIN_PASSWORD_HASH** (not SUPER_ADMIN_PASSWORD) in production for security
2. The hash above is for the password: `SuperAdmin@2024!Secure`
3. **SUPER_ADMIN_SECRET_KEY** must match exactly for JWT tokens to work

## How to Set Environment Variables

### For Vercel:
1. Go to your project dashboard on Vercel
2. Navigate to Settings → Environment Variables
3. Add each variable above
4. Redeploy your application

### For Railway:
1. Go to your project on Railway
2. Click on Variables tab
3. Add each variable above
4. Railway will automatically redeploy

### For Other Platforms:
Check your platform's documentation for setting environment variables.

## After Setting Variables

Once you've added these environment variables and redeployed:

1. Visit: https://biblequiz.textr.in/admin/login
2. Login with:
   - Email: `admin@biblequiz.app`
   - Password: `SuperAdmin@2024!Secure`

## Testing Production Login

Run this script to test if production admin is working:
```bash
node scripts/test-production-admin.js
```

## Troubleshooting

If login still doesn't work after setting environment variables:

1. **Verify deployment**: Make sure the deployment completed successfully
2. **Check logs**: Look at your production logs for any errors
3. **Clear cache**: Try clearing browser cookies and cache
4. **Different password?**: If you used a different password in production, generate a new hash:
   ```bash
   node scripts/generate-hash-direct.js
   ```

## Security Recommendations

For production, consider:
1. Changing the default password to something unique
2. Using a different SUPER_ADMIN_SECRET_KEY
3. Enabling 2FA when available
4. Regularly rotating credentials