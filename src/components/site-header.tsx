"use client";

import Link from "next/link";
import { UserProfile } from "@/components/auth/user-profile";
import { ModeToggle } from "./ui/mode-toggle";
import { Button } from "./ui/button";
import { Menu, X } from "lucide-react";
import { 
  BookOpenIcon, 
  HomeIcon, 
  DocumentTextIcon, 
  PlusCircleIcon, 
  UserGroupIcon, 
  ClipboardDocumentListIcon,
  ChartBarIcon
} from "@heroicons/react/24/outline";
import { 
  BookOpenIcon as BookOpenSolid
} from "@heroicons/react/24/solid";
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
    <header className="border-b bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-sm">
      <div className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg blur-sm group-hover:blur-md transition-all duration-300 opacity-70"></div>
              <div className="relative bg-gradient-to-br from-amber-500 to-orange-600 p-2 rounded-lg shadow-lg">
                <BookOpenSolid className="h-7 w-7 text-white" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 bg-clip-text text-transparent group-hover:from-amber-500 group-hover:to-orange-500 transition-all duration-300">
                Scrolls of Wisdom
              </span>
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400 -mt-1">
                Biblical Knowledge Quest
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {session?.user && (
              <>
                <Link
                  href={getDashboardLink()}
                  className={`flex items-center gap-2 text-sm font-medium transition-all hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 px-3 py-2 rounded-lg ${
                    isActive("/educator/dashboard") || isActive("/student/dashboard") 
                      ? "text-amber-600 bg-amber-50 dark:bg-amber-900/20" 
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <HomeIcon className="h-4 w-4" />
                  Dashboard
                </Link>

                {userRole === "educator" && (
                  <>
                    <Link
                      href="/educator/documents"
                      className={`flex items-center gap-2 text-sm font-medium transition-all hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 px-3 py-2 rounded-lg ${
                        isActive("/educator/documents") ? "text-amber-600 bg-amber-50 dark:bg-amber-900/20" : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <DocumentTextIcon className="h-4 w-4" />
                      Scrolls
                    </Link>
                    <Link
                      href="/educator/quiz/create"
                      className={`flex items-center gap-2 text-sm font-medium transition-all hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 px-3 py-2 rounded-lg ${
                        isActive("/educator/quiz/create") ? "text-amber-600 bg-amber-50 dark:bg-amber-900/20" : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <PlusCircleIcon className="h-4 w-4" />
                      Create Quest
                    </Link>
                    <Link
                      href="/educator/students"
                      className={`flex items-center gap-2 text-sm font-medium transition-all hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 px-3 py-2 rounded-lg ${
                        isActive("/educator/students") ? "text-amber-600 bg-amber-50 dark:bg-amber-900/20" : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <UserGroupIcon className="h-4 w-4" />
                      Disciples
                    </Link>
                  </>
                )}

                {userRole === "student" && (
                  <>
                    <Link
                      href="/student/quizzes"
                      className={`flex items-center gap-2 text-sm font-medium transition-all hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 px-3 py-2 rounded-lg ${
                        isActive("/student/quizzes") ? "text-amber-600 bg-amber-50 dark:bg-amber-900/20" : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <ClipboardDocumentListIcon className="h-4 w-4" />
                      Quests
                    </Link>
                    <Link
                      href="/student/results"
                      className={`flex items-center gap-2 text-sm font-medium transition-all hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 px-3 py-2 rounded-lg ${
                        isActive("/student/results") ? "text-amber-600 bg-amber-50 dark:bg-amber-900/20" : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <ChartBarIcon className="h-4 w-4" />
                      My Journey
                    </Link>
                  </>
                )}
              </>
            )}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            {session?.user ? (
              <>
                <UserProfile />
                <ModeToggle />
              </>
            ) : (
              <>
                <Link href="/auth/signin">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button size="sm">
                    Get Started
                  </Button>
                </Link>
                <ModeToggle />
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6 text-gray-700 dark:text-gray-300" />
            ) : (
              <Menu className="h-6 w-6 text-gray-700 dark:text-gray-300" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-amber-200 dark:border-amber-800">
            <nav className="flex flex-col gap-2">
              {session?.user && (
                <>
                  <Link
                    href={getDashboardLink()}
                    className={`flex items-center gap-2 text-sm font-medium transition-all hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 px-3 py-2 rounded-lg ${
                      isActive("/educator/dashboard") || isActive("/student/dashboard")
                        ? "text-amber-600 bg-amber-50 dark:bg-amber-900/20"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <HomeIcon className="h-4 w-4" />
                    Dashboard
                  </Link>

                  {userRole === "educator" && (
                    <>
                      <Link
                        href="/educator/documents"
                        className={`flex items-center gap-2 text-sm font-medium transition-all hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 px-3 py-2 rounded-lg ${
                          isActive("/educator/documents") ? "text-amber-600 bg-amber-50 dark:bg-amber-900/20" : "text-gray-700 dark:text-gray-300"
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <DocumentTextIcon className="h-4 w-4" />
                        Scrolls
                      </Link>
                      <Link
                        href="/educator/quiz/create"
                        className={`flex items-center gap-2 text-sm font-medium transition-all hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 px-3 py-2 rounded-lg ${
                          isActive("/educator/quiz/create") ? "text-amber-600 bg-amber-50 dark:bg-amber-900/20" : "text-gray-700 dark:text-gray-300"
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <PlusCircleIcon className="h-4 w-4" />
                        Create Quest
                      </Link>
                      <Link
                        href="/educator/students"
                        className={`flex items-center gap-2 text-sm font-medium transition-all hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 px-3 py-2 rounded-lg ${
                          isActive("/educator/students") ? "text-amber-600 bg-amber-50 dark:bg-amber-900/20" : "text-gray-700 dark:text-gray-300"
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <UserGroupIcon className="h-4 w-4" />
                        Disciples
                      </Link>
                    </>
                  )}

                  {userRole === "student" && (
                    <>
                      <Link
                        href="/student/quizzes"
                        className={`flex items-center gap-2 text-sm font-medium transition-all hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 px-3 py-2 rounded-lg ${
                          isActive("/student/quizzes") ? "text-amber-600 bg-amber-50 dark:bg-amber-900/20" : "text-gray-700 dark:text-gray-300"
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <ClipboardDocumentListIcon className="h-4 w-4" />
                        Quests
                      </Link>
                      <Link
                        href="/student/results"
                        className={`flex items-center gap-2 text-sm font-medium transition-all hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 px-3 py-2 rounded-lg ${
                          isActive("/student/results") ? "text-amber-600 bg-amber-50 dark:bg-amber-900/20" : "text-gray-700 dark:text-gray-300"
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <ChartBarIcon className="h-4 w-4" />
                        My Journey
                      </Link>
                    </>
                  )}
                </>
              )}

              <div className="flex items-center justify-between pt-3 border-t">
                {session?.user ? (
                  <>
                    <UserProfile />
                    <ModeToggle />
                  </>
                ) : (
                  <div className="flex gap-2 w-full">
                    <Link href="/auth/signin" className="flex-1">
                      <Button variant="ghost" size="sm" className="w-full">
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
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}