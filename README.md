# Scrolls of Wisdom - Biblical Knowledge Quest Platform

A comprehensive biblical quiz platform with AI-powered question generation, document processing, and real-time assessments.

## 🚀 Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/simplequiz)

## 📋 Prerequisites

Before deploying, you'll need:

1. **PostgreSQL Database** (Recommended: [Neon](https://neon.tech) or [Supabase](https://supabase.com))
2. **OpenAI API Key** from [OpenAI Platform](https://platform.openai.com)
3. **Google OAuth Credentials** from [Google Cloud Console](https://console.cloud.google.com)
4. **LightRAG API** access
5. **SMTP Email Service** (Gmail, SendGrid, etc.)

## 🛠️ Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/simplequiz.git
   cd simplequiz
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open the app**
   ```
   http://localhost:3000
   ```

## 🚀 Production Deployment on Vercel

### Step 1: Prepare Your Database

1. Create a PostgreSQL database (Neon recommended for Vercel)
2. Copy the connection string (should look like: `postgres://user:pass@host/database?sslmode=require`)

### Step 2: Deploy to Vercel

1. **Fork/Clone this repository** to your GitHub account

2. **Import to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository

3. **Configure Environment Variables**
   
   Add the following environment variables in Vercel:

   **Required Variables:**
   ```
   # Database
   POSTGRES_URL=your_postgresql_connection_string

   # Authentication
   BETTER_AUTH_SECRET=generate_random_32_char_string

   # Google OAuth
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret

   # OpenAI
   OPENAI_API_KEY=your_openai_api_key
   OPENAI_MODEL=gpt-4o-mini

   # LightRAG
   LIGHTRAG_API_URL=your_lightrag_url
   LIGHTRAG_API_KEY=your_lightrag_key

   # Quiz Generation Webhook
   QUIZ_GENERATION_WEBHOOK_URL=your_webhook_url

   # Email (SMTP)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   EMAIL_FROM=Scrolls of Wisdom <noreply@yourdomain.com>

   # Application URL (update after deployment)
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait for the build to complete

### Step 3: Post-Deployment Setup

1. **Update OAuth Redirect URLs**
   - Go to Google Cloud Console
   - Add your production URL to authorized redirect URIs:
     - `https://your-app.vercel.app/api/auth/callback/google`

2. **Run Database Migrations**
   - The migrations run automatically during build
   - If needed, you can run manually:
     ```bash
     npm run db:migrate
     ```

3. **Update NEXT_PUBLIC_APP_URL**
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Update `NEXT_PUBLIC_APP_URL` with your actual Vercel URL
   - Redeploy for changes to take effect

## 🔧 Environment Variables Reference

See `.env.example` for a complete list of environment variables and their descriptions.

### Required Variables:
- `POSTGRES_URL` - PostgreSQL connection string
- `BETTER_AUTH_SECRET` - Authentication secret key
- `OPENAI_API_KEY` - OpenAI API key for AI features
- `LIGHTRAG_API_URL` - LightRAG service URL
- `LIGHTRAG_API_KEY` - LightRAG API key
- `QUIZ_GENERATION_WEBHOOK_URL` - Webhook for quiz generation
- `SMTP_*` - Email configuration

### Optional Variables:
- `GOOGLE_CLIENT_ID` - For Google OAuth
- `GOOGLE_CLIENT_SECRET` - For Google OAuth
- `BLOB_READ_WRITE_TOKEN` - For file storage (if using Vercel Blob)

## 📦 Tech Stack

- **Framework:** Next.js 15 with App Router
- **Database:** PostgreSQL with Drizzle ORM
- **Authentication:** Better Auth
- **Styling:** Tailwind CSS
- **AI:** OpenAI GPT-4
- **Document Processing:** LightRAG
- **Deployment:** Vercel

## 🔒 Security Features

- Secure authentication with Better Auth
- Environment variable validation
- Security headers via middleware
- CSRF protection
- SQL injection prevention via Drizzle ORM
- XSS protection

## 📱 Features

- **AI-Powered Quiz Generation** - Generate quizzes from uploaded documents
- **Biblical Document Processing** - Process various biblical texts
- **Real-time Quiz Taking** - Students can take quizzes in real-time
- **Comprehensive Analytics** - Track student performance
- **Timezone Support** - Full timezone support for global users
- **Email Notifications** - Automated email notifications
- **Role-Based Access** - Separate educator and student dashboards

## 🐛 Troubleshooting

### Database Connection Issues
- Ensure your PostgreSQL URL includes `?sslmode=require` for production
- Check if your database allows connections from Vercel IPs

### Authentication Issues
- Regenerate `BETTER_AUTH_SECRET` if authentication fails
- Ensure Google OAuth redirect URLs are correctly configured

### Build Failures
- Check all required environment variables are set
- Run `npm run type-check` locally to catch TypeScript errors
- Ensure database migrations are up to date

## 📝 License

MIT

## 🤝 Support

For issues or questions, please open an issue on GitHub or contact support.

---

Built with ❤️ for biblical education