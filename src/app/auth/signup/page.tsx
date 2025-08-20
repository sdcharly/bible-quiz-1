"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { BookOpenIcon as BookOpenSolid } from "@heroicons/react/24/solid";
import { ArrowPathIcon, UserPlusIcon } from "@heroicons/react/24/outline";

function StudentSignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitationData, setInvitationData] = useState<{email?: string; educatorName?: string; educatorId?: string; quizId?: string} | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
  });

  const invitationToken = searchParams.get('invitation');

  useEffect(() => {
    if (invitationToken) {
      // Validate invitation token
      validateInvitation(invitationToken);
    }
  }, [invitationToken]);

  const validateInvitation = async (token: string) => {
    try {
      const response = await fetch(`/api/invitations/validate?token=${token}`);
      if (response.ok) {
        const data = await response.json();
        setInvitationData(data);
        // Pre-fill email if invitation is valid
        if (data.email) {
          setFormData(prev => ({ ...prev, email: data.email }));
        }
      } else {
        setError("Invalid or expired invitation link");
      }
    } catch (err) {
      console.error("Error validating invitation:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (!formData.phoneNumber) {
      setError("Phone number is required for communication");
      return;
    }

    setIsLoading(true);

    try {
      // First, sign up the user
      const signUpResult = await authClient.signUp.email({
        email: formData.email,
        password: formData.password,
        name: formData.name,
      });
      
      // Update user profile with phone number and role
      if (signUpResult) {
        await fetch('/api/auth/update-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            phoneNumber: formData.phoneNumber,
            role: "student",
          }),
        });
      }

      // If there's an invitation, accept it
      if (invitationToken) {
        await fetch('/api/invitations/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: invitationToken }),
        });
      }
      
      router.push("/student/dashboard");
    } catch (err) {
      setError((err as Error).message || "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/student/dashboard",
      });
    } catch (err) {
      setError((err as Error).message || "Failed to sign in with Google");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full blur-lg opacity-30"></div>
              <div className="relative bg-gradient-to-br from-amber-500 to-orange-600 p-3 rounded-full shadow-xl">
                <BookOpenSolid className="h-12 w-12 text-white" />
              </div>
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold">
            <span className="bg-gradient-to-r from-amber-700 via-orange-600 to-amber-800 bg-clip-text text-transparent">
              Begin Your Discipleship
            </span>
          </h2>
          {invitationData ? (
            <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
              <div className="flex items-center justify-center text-amber-600 dark:text-amber-400">
                <UserPlusIcon className="h-5 w-5 mr-2" />
                <p className="text-sm">
                  You&apos;ve been called by Guide <strong>{invitationData.educatorName}</strong>
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              Or{" "}
              <Link
                href="/auth/educator-signup"
                className="font-medium text-amber-600 hover:text-amber-500 transition-colors"
              >
                become a sacred guide
              </Link>
            </p>
          )}
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-amber-500 focus:border-amber-500 focus:z-10 sm:text-sm dark:bg-gray-800"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-amber-500 focus:border-amber-500 focus:z-10 sm:text-sm dark:bg-gray-800"
                placeholder="student@example.com"
              />
            </div>
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                autoComplete="tel"
                required
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-amber-500 focus:border-amber-500 focus:z-10 sm:text-sm dark:bg-gray-800"
                placeholder="+1 (555) 123-4567"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Required for educator communication and quiz notifications
              </p>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-amber-500 focus:border-amber-500 focus:z-10 sm:text-sm dark:bg-gray-800"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-amber-500 focus:border-amber-500 focus:z-10 sm:text-sm dark:bg-gray-800"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <Button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center"
            >
              {isLoading ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
              ) : (
                "Join as Disciple"
              )}
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 dark:bg-gray-900 text-gray-500">Or continue with</span>
            </div>
          </div>

          <div>
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full"
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>
          </div>

          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{" "}
            <Link
              href="/auth/signin"
              className="font-medium text-amber-600 hover:text-amber-500 transition-colors"
            >
              Enter sacred realm
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function StudentSignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    }>
      <StudentSignUpForm />
    </Suspense>
  );
}