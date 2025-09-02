# 📜 Scrolls of Wisdom - Biblical Knowledge Quest Platform

A comprehensive biblical education platform featuring AI-powered quiz generation, advanced document processing, real-time assessments, and multi-role management system. Built with modern web technologies for educators and students to create, manage, and experience biblical learning journeys.

![Next.js](https://img.shields.io/badge/Next.js-15.4.6-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-green)
![Redis](https://img.shields.io/badge/Redis-Caching-red)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 📑 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Quick Deploy](#-quick-deploy-to-vercel)
- [Local Development](#-local-development)
- [Production Deployment](#-production-deployment)
- [Project Structure](#-project-structure)
- [User Roles](#-user-roles)
- [API Documentation](#-api-documentation)
- [Database Schema](#-database-schema)
- [Security](#-security)
- [Scripts](#-scripts)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [Support](#-support)
- [License](#-license)

## ✨ Features

### Core Features
- **🤖 AI-Powered Quiz Generation** - Generate comprehensive biblical quizzes from uploaded documents using GPT-4o
- **📚 Advanced Document Processing** - Process PDFs, DOCX, TXT files with LightRAG for intelligent content extraction
- **⏱️ Real-Time Quiz Sessions** - Timed quiz taking with auto-submission and progress tracking
- **📊 Comprehensive Analytics** - Detailed performance metrics, attempt history, and topic-wise analysis
- **🌍 Full Timezone Support** - Global timezone handling for scheduled quizzes
- **📧 Email Notifications** - Automated notifications for quiz creation, enrollment, and results
- **👥 Multi-Role System** - Educator, Student, and Super Admin roles with specific permissions
- **🎨 Biblical Theme** - Custom UI with sacred design elements and biblical terminology
- **🔗 Smart URL System** - Share codes and short URLs for easy quiz distribution
- **⚡ Performance Optimized** - Redis caching, optimized queries, and lazy loading
- **🛡️ Enhanced Security** - Rate limiting, input validation, and SQL injection prevention

### Educator Features
- **Document Upload & Processing** - Batch upload biblical materials for quiz generation
- **Quiz Management** - Create, edit, delete, archive, and schedule quizzes
- **Student Management** - Enroll students, track progress, send invitations
- **Question Bank** - AI-generated questions with difficulty levels and biblical topics
- **Detailed Analytics** - Class performance, individual student tracking, difficulty analysis
- **Approval System** - Educator verification and approval workflow
- **Quiz Limits** - Configurable quiz creation limits with archive functionality
- **Deferred Scheduling** - Set future start times for quizzes with timezone support
- **Bulk Operations** - Mass enrollment and quiz management capabilities

### Student Features
- **Quiz Enrollment** - Join quizzes via invite codes or educator enrollment
- **Practice Mode** - Attempt quizzes multiple times for learning
- **Progress Tracking** - View scores, attempt history, and improvement trends
- **Instant Feedback** - Detailed explanations for correct/incorrect answers
- **Dashboard** - Personalized view of enrolled quizzes and upcoming sessions

### Super Admin Features
- **Complete System Control** - Manage all users, quizzes, and system settings
- **Educator Approval** - Review and approve educator registrations
- **Activity Monitoring** - Track all system activities and user actions
- **Batch Operations** - Bulk user management and quiz operations
- **System Settings** - Configure global platform settings
- **Security Controls** - Manage access permissions and security policies

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 15.4.6 (App Router)
- **Language:** TypeScript 5.0
- **Styling:** Tailwind CSS 3.4 + Custom Theming
- **UI Components:** Radix UI + Custom Components
- **Icons:** Heroicons, Lucide React, Phosphor Icons
- **Forms:** React Hook Form + Zod Validation
- **State Management:** React Context + Hooks

### Backend
- **Runtime:** Node.js 20+
- **API Routes:** Next.js API Routes
- **Database:** PostgreSQL 16 with Drizzle ORM
- **Caching:** Redis for performance optimization
- **Authentication:** Better Auth with JWT
- **AI Integration:** OpenAI GPT-4o API
- **Document Processing:** LightRAG API with status tracking
- **Email:** Nodemailer with SMTP (table-based templates)
- **File Storage:** Local filesystem with cleanup scripts
- **Performance:** Custom logger, optimized queries, connection pooling

### DevOps & Tools
- **Deployment:** Vercel
- **Database Hosting:** Neon / Supabase / Railway
- **Caching:** Redis (Upstash recommended for Vercel)
- **Version Control:** Git
- **Package Manager:** npm
- **Build Tool:** Next.js with Turbopack
- **Linting:** ESLint
- **Type Checking:** TypeScript
- **Component Library:** shadcn/ui with Radix UI
- **Icons:** Heroicons, Lucide React, Phosphor Icons

## 📋 Prerequisites

Before getting started, ensure you have:

1. **Node.js 20+** - [Download](https://nodejs.org/)
2. **PostgreSQL Database** - Recommended providers:
   - [Neon](https://neon.tech) (Best for Vercel)
   - [Supabase](https://supabase.com)
   - [Railway](https://railway.app)
3. **OpenAI API Key** - [Get from OpenAI](https://platform.openai.com)
4. **Google OAuth Credentials** - [Google Cloud Console](https://console.cloud.google.com)
5. **LightRAG API Access** - Contact provider for access
6. **SMTP Email Service** - Options:
   - Gmail with App Password
   - SendGrid
   - Mailgun
   - Custom SMTP

## 🚀 Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/sdcharly/bible-quiz-1)

Click the button above and follow the deployment wizard. You'll need to provide all environment variables during setup.

## 💻 Local Development

### 1. Clone the Repository
```bash
git clone https://github.com/sdcharly/bible-quiz-1.git
cd bible-quiz-1
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Environment Variables
```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

```env
# Database
POSTGRES_URL=postgresql://user:password@localhost:5432/bible_quiz

# Authentication
BETTER_AUTH_SECRET=your-32-character-secret-key

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# OpenAI
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini

# Redis (Optional - for caching)
REDIS_URL=redis://localhost:6379

# LightRAG
LIGHTRAG_API_URL=your-lightrag-url
LIGHTRAG_API_KEY=your-lightrag-api-key

# Quiz Generation
QUIZ_GENERATION_WEBHOOK_URL=http://localhost:3000/api/educator/quiz/webhook-callback

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM="Scrolls of Wisdom <noreply@example.com>"

# Super Admin
SUPER_ADMIN_EMAIL=admin@example.com
SUPER_ADMIN_PASSWORD=SecurePassword123!
SUPER_ADMIN_SECRET_KEY=another-32-character-secret
SUPER_ADMIN_2FA_ENABLED=false

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Set Up Database
```bash
# Generate database schema
npm run db:generate

# Push schema to database
npm run db:push

# Run migrations
npm run db:migrate
```

### 5. Run Development Server
```bash
npm run dev
```

### 6. Access the Application
- Main App: http://localhost:3000
- Database Studio: `npm run db:studio` (opens at http://localhost:3333)

## 🚢 Production Deployment

### Vercel Deployment (Recommended)

#### Step 1: Prepare Database
1. Create a PostgreSQL database on Neon/Supabase
2. Copy the connection string with SSL mode

#### Step 2: Fork Repository
Fork this repository to your GitHub account

#### Step 3: Import to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your forked repository

#### Step 4: Configure Environment Variables
Add all variables from `.env.example` in Vercel's Environment Variables section

#### Step 5: Deploy
Click "Deploy" and wait for the build to complete

#### Step 6: Post-Deployment
1. Update Google OAuth redirect URLs with your production URL
2. Update `NEXT_PUBLIC_APP_URL` in Vercel
3. Run database migrations if needed

### Manual Deployment

For other platforms, ensure you:
1. Set all environment variables
2. Run `npm run build`
3. Run `npm run db:migrate`
4. Start with `npm start`

## 📁 Project Structure

```
bible-quiz-1/
├── src/
│   ├── app/                  # Next.js App Router pages
│   │   ├── api/              # API routes
│   │   ├── auth/             # Authentication pages
│   │   ├── admin/            # Super admin dashboard
│   │   ├── educator/         # Educator dashboard
│   │   ├── student/          # Student dashboard
│   │   ├── quiz/             # Public quiz pages
│   │   └── page.tsx          # Home page
│   ├── components/           # React components
│   │   ├── ui/              # shadcn/ui base components
│   │   ├── educator-v2/     # Educator components (amber theme)
│   │   ├── student/         # Student v1 components
│   │   └── student-v2/      # Student v2 components
│   ├── lib/                 # Utility functions
│   │   ├── auth.ts          # Authentication utilities
│   │   ├── db.ts            # Database connection
│   │   ├── ai.ts            # AI integration
│   │   ├── logger.ts        # Performance logger
│   │   ├── api-cache.ts     # API response caching
│   │   └── timezone.ts      # Timezone utilities
│   ├── db/                  # Database schema
│   │   └── schema.ts        # Drizzle ORM schema
│   └── styles/              # Global styles
├── public/                  # Static assets
├── docs/                    # Documentation
│   ├── deployment/          # Deployment guides
│   ├── project-management/  # TODOs and planning
│   └── technical/          # Technical documentation
├── drizzle/                 # Database migrations
├── scripts/                 # Utility scripts
│   ├── tests/              # Test scripts (gitignored)
│   └── maintenance scripts  # DB cleanup, fixes
├── CLAUDE.md               # AI assistant instructions
└── config files            # Various configuration files
```

## 👥 User Roles

### Student
- Take quizzes
- View results and progress
- Join educator classrooms
- Practice with multiple attempts

### Educator
- Create and manage quizzes
- Upload documents for AI processing
- Manage student enrollments
- View detailed analytics
- Schedule quiz sessions

### Super Admin
- Full system access
- Approve educator registrations
- Manage all users
- Monitor system activity
- Configure platform settings
- Access hidden via subtle link on homepage (✝ symbol in footer)

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/session` - Get current session

### Quiz Management
- `GET /api/educator/quiz` - List educator's quizzes
- `POST /api/educator/quiz/create` - Create new quiz
- `PUT /api/educator/quiz/[id]` - Update quiz
- `DELETE /api/educator/quiz/[id]` - Delete quiz

### Student Operations
- `GET /api/student/quizzes` - Get enrolled quizzes
- `POST /api/student/quiz/[id]/attempt` - Submit quiz attempt
- `GET /api/student/results/[id]` - Get attempt results

### Admin Operations
- `GET /api/admin/users` - List all users
- `PUT /api/admin/educators/[id]/approve` - Approve educator
- `GET /api/admin/activity` - Get activity logs
- `POST /api/admin/settings` - Update system settings

## 🗄️ Database Schema

### Core Tables
- `user` - User accounts and profiles
- `account` - OAuth account links
- `session` - Active user sessions
- `quizzes` - Quiz definitions with share codes
- `questions` - Quiz questions with biblical references
- `quiz_attempts` - Student attempts with timing
- `question_responses` - Individual answers
- `enrollments` - Student-quiz enrollments with status
- `documents` - Uploaded documents with LightRAG tracking
- `educator_students` - Educator-student relationships
- `invitations` - Quiz invitation codes
- `activity_logs` - System activity tracking
- `admin_settings` - Global platform settings
- `short_urls` - Short URL redirects for quiz sharing

## 🔒 Security

### Implemented Security Measures
- **Authentication:** JWT-based with Better Auth
- **Password Security:** Bcrypt hashing with salt
- **SQL Injection Prevention:** Parameterized queries via Drizzle ORM
- **XSS Protection:** React's built-in escaping
- **CSRF Protection:** Token-based verification
- **Environment Variables:** Secure secret management
- **HTTPS Only:** Enforced in production
- **Rate Limiting:** API endpoint protection
- **Input Validation:** Zod schema validation
- **File Upload Security:** Type and size restrictions

### Security Best Practices
1. Use strong, unique passwords
2. Enable 2FA for super admin (when available)
3. Regularly rotate API keys
4. Keep dependencies updated
5. Monitor activity logs
6. Use environment-specific secrets
7. Implement proper CORS policies
8. Regular security audits

## 📝 Scripts

### Development
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - TypeScript type checking
- `npm run test` - Run tests (if configured)

### Database
- `npm run db:generate` - Generate migrations from schema
- `npm run db:migrate` - Run pending migrations
- `npm run db:push` - Push schema to database
- `npm run db:studio` - Open Drizzle Studio
- `npm run db:reset` - Reset database (CAUTION: Drops all data)

### Utilities
- `npm run cleanup:quizzes` - Clean up orphaned quiz data
- `npm run vercel-build` - Vercel-specific build command
- `node scripts/cleanup-sessions.js` - Clean up expired sessions
- `node scripts/cleanup-stale-quiz-attempts.js` - Mark abandoned attempts
- `node scripts/fix-enrollment-statuses.js` - Fix enrollment inconsistencies
- `node scripts/check-documents.js` - Check document processing status

## 🐛 Troubleshooting

### Common Issues

#### Database Connection Failed
```
Error: Can't reach database server
```
**Solution:**
- Check POSTGRES_URL format
- Ensure SSL mode is enabled: `?sslmode=require`
- Verify database is accessible from your network

#### Authentication Issues
```
Error: Invalid authentication token
```
**Solution:**
- Regenerate BETTER_AUTH_SECRET
- Clear browser cookies
- Check session expiry settings

#### Google OAuth Not Working
```
Error: Redirect URI mismatch
```
**Solution:**
- Add correct redirect URLs in Google Console:
  - Development: `http://localhost:3000/api/auth/callback/google`
  - Production: `https://your-domain.com/api/auth/callback/google`

#### Build Failures
```
Error: Type errors during build
```
**Solution:**
- Run `npm run type-check` locally
- Fix TypeScript errors
- Ensure all environment variables are set

#### Email Not Sending
```
Error: Failed to send email
```
**Solution:**
- For Gmail: Use App Password, not regular password
- Check SMTP settings
- Verify firewall allows SMTP connections

#### Quiz Generation Timeout
```
Error: Quiz generation timed out
```
**Solution:**
- Check OpenAI API key validity
- Verify LightRAG API is accessible
- Increase timeout settings if needed

### Getting Help
1. Check the error logs in Vercel dashboard
2. Run `npm run db:studio` to inspect database
3. Enable debug mode with `NEXT_PUBLIC_ENABLE_LOGGING=true`
4. Check `/docs/technical/` for specific troubleshooting guides
5. Review CLAUDE.md for development instructions
6. Open an issue on GitHub with error details

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines
- Follow existing code style and conventions in CLAUDE.md
- Use shadcn/ui components (never raw HTML form elements)
- Follow educator design standards (amber theme, TabNavigation)
- Use the custom logger instead of console.log
- Add tests for new features
- Update documentation in `/docs/`
- Run `npm run db:generate` and `npm run build` before committing
- Keep commits atomic and descriptive
- Check for TypeScript errors and hook dependencies

## 📞 Support

### Resources
- **Documentation:** This README and `/docs/` folder
- **Production URL:** https://biblequiz.textr.in
- **Issues:** [GitHub Issues](https://github.com/sdcharly/bible-quiz-1/issues)
- **Discussions:** [GitHub Discussions](https://github.com/sdcharly/bible-quiz-1/discussions)
- **Email:** support@scrollsofwisdom.com

### Commercial Support
For enterprise support, custom features, or consulting, contact us at enterprise@scrollsofwisdom.com

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for GPT-4o API
- Vercel for hosting platform
- Next.js team for the framework
- shadcn/ui for component library
- LightRAG for document processing
- All contributors and users

---

**Built with ❤️ for Biblical Education**

*"The fear of the Lord is the beginning of wisdom, and knowledge of the Holy One is understanding." - Proverbs 9:10*