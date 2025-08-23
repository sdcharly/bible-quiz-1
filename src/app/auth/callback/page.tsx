"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
        const studentId = session.data.user.id;
        
        // If there's an invitation, accept it
        if (invitation) {
          const acceptResponse = await fetch('/api/invitations/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              token: invitation,
              studentId: studentId 
            }),
          });
          
          if (!acceptResponse.ok) {
            console.error('Failed to accept invitation:', await acceptResponse.text());
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
              studentId: studentId 
            }),
          });
          
          if (!acceptResponse.ok) {
            console.error('Failed to accept pending invitation:', await acceptResponse.text());
          }
          sessionStorage.removeItem('pendingInvitation');
        }
        
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
        
        // Default redirect - we'll assume student for OAuth users
        // The role will be properly set when they access specific features
        router.push('/student/dashboard');
      } else {
        // No session, redirect to signin
        router.push('/auth/signin');
      }
    } catch (error) {
      console.error('Error in callback:', error);
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