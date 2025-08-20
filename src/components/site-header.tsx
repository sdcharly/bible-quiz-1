"use client";

import Link from "next/link";
import { UserProfile } from "@/components/auth/user-profile";
import { ModeToggle } from "./ui/mode-toggle";
import { Button } from "./ui/button";
import { BookOpen, Menu, X, LayoutDashboard, LogIn } from "lucide-react";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/auth-client";

export function SiteHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const pathname = usePathname();
  const { data: session } = useSession();

  useEffect(() => {
    const fetchUserRole = async () => {
      if (session?.user) {
        try {
          const response = await fetch("/api/auth/get-user-role", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: session.user.id,
              email: session.user.email,
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            setUserRole(data.role);
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
        }
      } else {
        setUserRole(null);
      }
    };

    fetchUserRole();
  }, [session]);

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/");

  const getDashboardLink = () => {
    if (!session?.user) return "/auth/signin";
    return userRole === "educator" ? "/educator/dashboard" : "/student/dashboard";
  };

  return (
    <header className="border-b bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-blue-600" />
            <Link
              href="/"
              className="text-2xl font-bold text-gray-900 dark:text-white hover:opacity-90"
            >
              BibleQuiz
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                pathname === "/" ? "text-blue-600" : "text-gray-600 dark:text-gray-300"
              }`}
            >
              Home
            </Link>
            
            {session?.user && (
              <Link
                href={getDashboardLink()}
                className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                  isActive("/educator/dashboard") || isActive("/student/dashboard") 
                    ? "text-blue-600" 
                    : "text-gray-600 dark:text-gray-300"
                }`}
              >
                Dashboard
              </Link>
            )}

            {session?.user && userRole === "educator" && (
              <>
                <Link
                  href="/educator/documents"
                  className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                    isActive("/educator/documents") ? "text-blue-600" : "text-gray-600 dark:text-gray-300"
                  }`}
                >
                  Documents
                </Link>
                <Link
                  href="/educator/quiz/create"
                  className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                    isActive("/educator/quiz") ? "text-blue-600" : "text-gray-600 dark:text-gray-300"
                  }`}
                >
                  Create Quiz
                </Link>
              </>
            )}

            {session?.user && userRole === "student" && (
              <>
                <Link
                  href="/student/quizzes"
                  className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                    isActive("/student/quizzes") ? "text-blue-600" : "text-gray-600 dark:text-gray-300"
                  }`}
                >
                  Quizzes
                </Link>
                <Link
                  href="/student/results"
                  className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                    isActive("/student/results") ? "text-blue-600" : "text-gray-600 dark:text-gray-300"
                  }`}
                >
                  My Results
                </Link>
              </>
            )}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            {session?.user ? (
              <>
                <Link href={getDashboardLink()}>
                  <Button variant="ghost" size="sm">
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
                <UserProfile />
              </>
            ) : (
              <div className="flex gap-2">
                <Link href="/auth/signin">
                  <Button variant="outline" size="sm">
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button size="sm">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
            <ModeToggle />
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6 text-gray-600 dark:text-gray-300" />
            ) : (
              <Menu className="h-6 w-6 text-gray-600 dark:text-gray-300" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t">
            <nav className="flex flex-col gap-4">
              <Link
                href="/"
                className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                  pathname === "/" ? "text-blue-600" : "text-gray-600 dark:text-gray-300"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>

              {session?.user && (
                <Link
                  href={getDashboardLink()}
                  className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                    isActive("/educator/dashboard") || isActive("/student/dashboard")
                      ? "text-blue-600"
                      : "text-gray-600 dark:text-gray-300"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
              )}

              {session?.user && userRole === "educator" && (
                <>
                  <Link
                    href="/educator/documents"
                    className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                      isActive("/educator/documents") ? "text-blue-600" : "text-gray-600 dark:text-gray-300"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Documents
                  </Link>
                  <Link
                    href="/educator/quiz/create"
                    className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                      isActive("/educator/quiz") ? "text-blue-600" : "text-gray-600 dark:text-gray-300"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Create Quiz
                  </Link>
                </>
              )}

              {session?.user && userRole === "student" && (
                <>
                  <Link
                    href="/student/quizzes"
                    className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                      isActive("/student/quizzes") ? "text-blue-600" : "text-gray-600 dark:text-gray-300"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Quizzes
                  </Link>
                  <Link
                    href="/student/results"
                    className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                      isActive("/student/results") ? "text-blue-600" : "text-gray-600 dark:text-gray-300"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    My Results
                  </Link>
                </>
              )}

              <div className="flex items-center gap-4 pt-4 border-t">
                {session?.user ? (
                  <UserProfile />
                ) : (
                  <div className="flex gap-2 w-full">
                    <Link href="/auth/signin" className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        Sign In
                      </Button>
                    </Link>
                    <Link href="/auth/signup" className="flex-1">
                      <Button size="sm" className="w-full">
                        Get Started
                      </Button>
                    </Link>
                  </div>
                )}
                <ModeToggle />
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}