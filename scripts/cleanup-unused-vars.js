#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Categories of issues from the build output
const issues = {
  unusedImports: [
    // Component imports
    { file: 'src/app/admin/educators/[id]/EducatorDetails.tsx', unused: ['User', 'Mail', 'Phone', 'Calendar', 'AlertTriangle', 'Clock'] },
    { file: 'src/app/admin/students/[id]/StudentDetails.tsx', unused: ['User', 'Mail', 'Phone', 'Calendar', 'Clock', 'Users', 'XCircle'] },
    { file: 'src/app/educator/analytics/optimized/page.tsx', unused: ['BarChart3', 'Clock'] },
    { file: 'src/app/educator/analytics/page.tsx', unused: ['Clock', 'XCircle', 'Calendar', 'Filter'] },
    { file: 'src/app/educator/dashboard/page.tsx', unused: ['getTimezoneInfo', 'PlusCircleIcon'] },
    { file: 'src/app/educator/documents/page.tsx', unused: ['Clock', 'CheckCircle', 'XCircle', 'Filter'] },
    { file: 'src/app/educator/quiz/[id]/review/page.tsx', unused: ['CardTitle', 'ArrowRight', 'Clock', 'List', 'FileText'] },
    { file: 'src/app/educator/students/[id]/page.tsx', unused: ['XCircle'] },
    { file: 'src/app/educator/students/page.tsx', unused: ['Filter'] },
    { file: 'src/app/page.tsx', unused: ['BookOpenIcon', 'CheckCircleIcon', 'AcademicCapIcon'] },
    { file: 'src/app/student/quizzes/page.tsx', unused: ['Users', 'AlertCircle'] },
    { file: 'src/components/educator/ApprovalStatusBanner.tsx', unused: ['Button', 'CardDescription', 'Shield', 'BarChart'] },
    { file: 'src/components/site-header.tsx', unused: ['BookOpenIcon'] },
    { file: 'src/components/ui/icons.tsx', unused: ['BookOpenIcon'] },
    { file: 'src/lib/logger.ts', unused: ['ENV'] },
    { file: 'src/app/auth/educator-signup/page.tsx', unused: ['BookOpenSolid'] },
    { file: 'src/app/educator/quiz/[id]/attempt/[attemptId]/page.tsx', unused: ['TrendingUp', 'Calendar'] },
    { file: 'src/app/educator/quiz/create/page.tsx', unused: ['getDefaultTimezone', 'formatDateInTimezone'] },
    { file: 'src/components/analytics/AnalyticsStudentList.tsx', unused: ['logger'] },
    
    // API route imports
    { file: 'src/app/api/admin/performance/application/route.ts', unused: ['eq', 'avg', 'desc'] },
    { file: 'src/app/api/admin/settings/permissions/route.ts', unused: ['activityLogs'] },
    { file: 'src/app/api/admin/settings/system/route.ts', unused: ['activityLogs'] },
    { file: 'src/app/api/educator/analytics/optimized/route.ts', unused: ['educatorStudents', 'asc'] },
    { file: 'src/app/api/educator/analytics/route.ts', unused: ['desc'] },
    { file: 'src/app/api/educator/quiz/[id]/delete/route.ts', unused: ['and'] },
    { file: 'src/app/api/educator/quiz/create/route.ts', unused: ['user'] },
    { file: 'src/app/api/student/quizzes/route.ts', unused: ['ne'] },
    { file: 'src/app/api/auth/educator-signup/route.ts', unused: ['account'] },
    { file: 'src/app/api/educator/students/add-existing/route.ts', unused: ['user'] },
    { file: 'src/app/api/invitations/check-and-accept/route.ts', unused: ['user'] },
    { file: 'src/lib/question-validator.ts', unused: ['EntityExistsResponse'] },
    { file: 'src/app/api/admin/performance/database/route.ts', unused: ['db'] },
  ],
  
  unusedParameters: [
    // Route handlers with unused req/request parameters
    { file: 'src/app/api/admin/check-users/route.ts', param: 'request' },
    { file: 'src/app/api/admin/fix-educator-status/route.ts', param: 'request' },
    { file: 'src/app/api/admin/performance/application/route.ts', param: 'req' },
    { file: 'src/app/api/admin/performance/apply-indexes/route.ts', param: '_req' },
    { file: 'src/app/api/admin/performance/cache/route.ts', param: '_req' },
    { file: 'src/app/api/admin/performance/database/route.ts', param: 'req' },
    { file: 'src/app/api/admin/performance/stream/route.ts', param: 'req' },
    { file: 'src/app/api/cleanup-quizzes/route.ts', param: 'req' },
    { file: 'src/app/api/debug/local-docs/route.ts', param: 'req' },
    { file: 'src/app/api/educator/analytics/optimized/route.ts', param: 'req' },
    { file: 'src/app/api/educator/documents/route.ts', param: 'req' },
    { file: 'src/app/api/educator/quizzes/route.ts', param: 'req' },
    { file: 'src/app/api/educator/status/route.ts', param: 'request' },
    { file: 'src/app/api/educator/students/route.ts', param: 'req' },
    { file: 'src/app/api/student/quizzes/route.ts', param: 'req' },
    { file: 'src/app/api/user/profile/route.ts', param: 'req' },
    { file: 'src/app/api/admin/auth/login/route.ts', param: 'request' },
    { file: 'src/lib/email-service.ts', param: 'educatorEmail' },
    { file: 'src/lib/timezone.ts', param: '_userTimezone' },
    { file: 'src/lib/redis.ts', param: '_error' },
  ],
  
  unusedVariables: [
    { file: 'src/app/admin/activity/ActivityLogsView.tsx', vars: ['setFilterType', 'actionTypes'] },
    { file: 'src/app/admin/educators/EducatorsManagement.tsx', vars: ['handleUpdatePermissions'] },
    { file: 'src/app/admin/login/page.tsx', vars: ['error'] },
    { file: 'src/app/educator/analytics/optimized/page.tsx', vars: ['router'] },
    { file: 'src/app/educator/analytics/page.tsx', vars: ['router'] },
    { file: 'src/app/educator/quizzes/page.tsx', vars: ['router', 'isQuizAvailable'] },
    { file: 'src/app/educator/students/[id]/page.tsx', vars: ['router'] },
    { file: 'src/app/settings/page.tsx', vars: ['error'] },
    { file: 'src/app/student/quiz/[id]/page.tsx', vars: ['isResumed', 'showTimeWarning'] },
    { file: 'src/components/session-monitor.tsx', vars: ['pathname'] },
    { file: 'src/lib/web-vitals.ts', vars: ['thresholds'] },
    { file: 'src/app/api/admin/performance/stream/route.ts', vars: ['dbMetricsPayload', 'appMetricsPayload'] },
    { file: 'src/app/educator/quiz/[id]/review/page.tsx', vars: ['validateSingleQuestion'] },
    { file: 'src/app/educator/quiz/create/page.tsx', vars: ['jobId'] },
    { file: 'src/app/api/auth/reset-password/route.ts', vars: ['hasSpecialChar'] },
    { file: 'src/app/api/educator/quiz/create-async/route.ts', vars: ['newQuiz', 'job'] },
    { file: 'src/app/api/educator/quiz/[id]/question/[questionId]/replace-async/route.ts', vars: ['job'] },
    { file: 'src/app/api/educator/attempt/[id]/route.ts', vars: ['session'] },
    { file: 'src/app/api/educator/quiz/[id]/results/route.ts', vars: ['session'] },
    { file: 'src/app/api/auth/educator-signup/route.ts', vars: ['password', 'institution'] },
    { file: 'src/components/ui/icons.tsx', vars: ['HomeSolid', 'solid'] },
    { file: 'src/hooks/use-toast.ts', vars: ['actionTypes'] },
    { file: 'src/app/educator/documents/page.tsx', vars: ['isComplete'] },
    { file: 'src/app/admin/educators/[id]/page.tsx', vars: ['quizAttempts', 'enrollments'] },
    { file: 'src/app/admin/educators/[id]/EducatorDetails.tsx', vars: ['templateId'] },
  ],
  
  catchBlockVars: [
    { file: 'src/app/admin/performance/page.tsx', var: 'e' },
    { file: 'src/app/auth/reset-password/page.tsx', var: 'err' },
    { file: 'src/app/educator/documents/upload/page.tsx', var: 'error' },
    { file: 'src/app/educator/quiz/[id]/question/[questionId]/replace/route.ts', var: 'e' },
    { file: 'src/app/educator/quiz/[id]/question/[questionId]/replace-async/route.ts', var: 'e' },
    { file: 'src/app/educator/quiz/create/route.ts', var: 'parseError' },
    { file: 'src/app/educator/quiz/create-async/route.ts', var: 'e' },
    { file: 'src/lib/auth-helpers.ts', var: 'error' },
    { file: 'src/lib/timezone.ts', var: 'e' },
    { file: 'src/lib/web-vitals.ts', var: 'e' },
  ],
  
  hookDependencies: [
    { file: 'src/app/admin/performance/page.tsx', hook: 'useEffect', missing: ['collectWebVitals'] },
    { file: 'src/app/educator/analytics/optimized/page.tsx', hook: 'useEffect', missing: ['fetchAnalytics'] },
    { file: 'src/app/educator/analytics/page.tsx', hook: 'useEffect', missing: ['fetchAnalytics'] },
    { file: 'src/app/educator/quiz/[id]/attempt/[attemptId]/page.tsx', hook: 'useEffect', missing: ['fetchAttemptDetails'] },
    { file: 'src/app/educator/quiz/[id]/manage/page.tsx', hook: 'useEffect', missing: ['fetchAvailableStudents', 'fetchEnrolledStudents', 'fetchQuizDetails'] },
    { file: 'src/app/educator/quiz/[id]/results/page.tsx', hook: 'useEffect', missing: ['fetchResults'] },
    { file: 'src/app/educator/quiz/[id]/review/page.tsx', hook: 'useEffect', missing: ['fetchQuizDetails'] },
    { file: 'src/app/educator/students/[id]/page.tsx', hook: 'useEffect', missing: ['fetchStudentDetails'] },
    { file: 'src/app/settings/page.tsx', hook: 'useEffect', missing: ['fetchUserProfile'] },
    { file: 'src/app/student/results/[id]/page.tsx', hook: 'useEffect', missing: ['fetchResults'] },
    { file: 'src/components/document-processing-status.tsx', hook: 'useEffect', missing: ['fetchStatus'] },
    { file: 'src/components/session-monitor.tsx', hook: 'useCallback', missing: ['handleSessionExpired', 'toast'] },
  ]
};

console.log('📊 Cleanup Analysis:');
console.log(`- ${issues.unusedImports.length} files with unused imports`);
console.log(`- ${issues.unusedParameters.length} unused function parameters`);
console.log(`- ${issues.unusedVariables.length} files with unused variables`);
console.log(`- ${issues.catchBlockVars.length} unused catch block variables`);
console.log(`- ${issues.hookDependencies.length} React Hook dependency issues`);

const totalIssues = 
  issues.unusedImports.length + 
  issues.unusedParameters.length + 
  issues.unusedVariables.length + 
  issues.catchBlockVars.length + 
  issues.hookDependencies.length;

console.log(`\n📈 Total: ${totalIssues} cleanup opportunities`);

// Export for use in cleanup script
module.exports = { issues };