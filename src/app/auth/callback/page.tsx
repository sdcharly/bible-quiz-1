"use client";

import { useEffect, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";


function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleIntent = searchParams.get('roleIntent');
  const invitation = searchParams.get('invitation');
  const shareCode = searchParams.get('shareCode');

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // Wait for session to be established
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Get the current session
      const session = await authClient.getSession();
      
      if (session?.data?.user) {
        const userId = session.data.user.id;
        const userEmail = session.data.user.email;
        
        // Determine the role from URL params or session storage
        const intendedRole = roleIntent || sessionStorage.getItem('pendingRole') || 'student';
        
        // Update user profile with role and handle approval status
        if (intendedRole === 'educator') {
          // Set educator role with pending approval status
          // Google OAuth users are automatically email verified
          await fetch('/api/auth/update-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: userEmail,
              role: 'educator',
              emailVerified: true, // Google OAuth verifies email
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            }),
          });
          
          // Notify admin about new educator signup
          await fetch('/api/auth/notify-educator-signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: userId,
              email: userEmail,
              name: session.data.user.name || 'Unknown',
            }),
          });
          
          // Clear stored data
          sessionStorage.removeItem('pendingRole');
          sessionStorage.removeItem('pendingInstitution');
          
          // Redirect to educator dashboard (will show approval banner)
          router.push('/educator/dashboard');
          return;
        } else {
          // Set student role (auto-approved)
          await fetch('/api/auth/update-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: userEmail,
              role: 'student',
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            }),
          });
          
          // Handle invitations for students
          if (invitation) {
            const acceptResponse = await fetch('/api/invitations/accept', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                token: invitation,
                studentId: userId 
              }),
            });
            
            if (!acceptResponse.ok) {
              // [REMOVED: Console statement for performance]);
            }
          }
          
          // Handle pending invitation from session storage
          const pendingInvitation = sessionStorage.getItem('pendingInvitation');
          if (pendingInvitation && !invitation) {
            const acceptResponse = await fetch('/api/invitations/accept', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                token: pendingInvitation,
                studentId: userId 
              }),
            });
            
            if (!acceptResponse.ok) {
              // [REMOVED: Console statement for performance]);
            }
            sessionStorage.removeItem('pendingInvitation');
          }
          
          // Clear stored role
          sessionStorage.removeItem('pendingRole');
          
          // If there's a share code, redirect to it
          if (shareCode) {
            router.push(`/quiz/share/${shareCode}`);
            return;
          }
          
          // Check for pending quiz share in session storage
          const pendingQuizShare = sessionStorage.getItem('pendingQuizShare');
          if (pendingQuizShare) {
            sessionStorage.removeItem('pendingQuizShare');
            router.push(`/quiz/share/${pendingQuizShare}`);
            return;
          }
          
          // Redirect to student dashboard
          router.push('/student/dashboard');
        }
      } else {
        // No session, redirect to signin
        router.push('/auth/signin');
      }
    } catch (error) {
      // [REMOVED: Console statement for performance]
      router.push('/auth/signin');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-amber-600 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Setting up your account...</p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-amber-600" />
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}