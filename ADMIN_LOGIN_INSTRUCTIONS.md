# Admin Login Instructions

## ✅ Admin Authentication is Working!

The admin authentication system is properly configured and working. Here's how to login:

## Login Credentials

- **URL**: http://localhost:3002/admin/login (note: port may vary - check your dev server)
- **Email**: `admin@biblequiz.app`
- **Password**: `SuperAdmin@2024!Secure`

## Important Notes

1. **Port Number**: The development server is currently running on port **3002** (not 3000) because port 3000 is already in use. Always check the terminal output when you run `npm run dev` to see which port is being used.

2. **Environment Variables**: The following are properly configured in your `.env` file:
   - `SUPER_ADMIN_EMAIL=admin@biblequiz.app`
   - `SUPER_ADMIN_PASSWORD=SuperAdmin@2024!Secure`
   - `SUPER_ADMIN_SECRET_KEY=FvCt6P8LHptMJNyVYXFYPMqniUrZnH2n`

## Testing Scripts Available

We've created helpful scripts to test the admin authentication:

1. **Test Admin Setup**: `node scripts/test-admin-auth.js`
   - Verifies environment variables are configured
   - Tests password hashing
   - Shows current configuration

2. **Test Admin API**: `node scripts/test-admin-api.js`
   - Tests the actual login endpoint
   - Automatically tries both ports (3000 and 3002)
   - Confirms API is working

## Troubleshooting

If you can't login:

1. **Check the port**: Make sure you're using the correct port shown when running `npm run dev`
2. **Clear cookies**: Try clearing browser cookies for localhost
3. **Check server logs**: Look at the terminal running `npm run dev` for any errors
4. **Verify environment**: Run `node scripts/test-admin-auth.js` to check configuration

## Security Note

**For Production**: 
- Change these credentials before deploying
- Use a strong, unique password
- Consider using `SUPER_ADMIN_PASSWORD_HASH` instead of plain text password
- Keep `SUPER_ADMIN_SECRET_KEY` secure and unique

## Session Management

- Admin sessions expire after 30 minutes by default
- Session configuration can be adjusted in the admin panel once logged in
- Sessions are stored as JWT tokens in httpOnly cookies