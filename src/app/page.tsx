"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  BookOpenIcon, 
  UserGroupIcon, 
  ClockIcon, 
  ChartBarIcon, 
  DocumentTextIcon, 
  CheckCircleIcon,
  AcademicCapIcon,
  SparklesIcon,
  HeartIcon
} from "@heroicons/react/24/outline";
import { 
  BookOpenIcon as BookOpenSolid
} from "@heroicons/react/24/solid";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";

export default function HomePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    // If user is signed in, redirect to dashboard
    if (!isPending && session?.user) {
      router.push("/dashboard");
    }
  }, [session, isPending, router]);

  // Show loading while checking session
  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <section className="px-6 py-24 sm:px-12 lg:px-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="mb-8">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full blur-2xl opacity-30"></div>
                  <div className="relative bg-gradient-to-br from-amber-500 to-orange-600 p-6 rounded-full shadow-2xl">
                    <BookOpenSolid className="h-16 w-16 text-white" />
                  </div>
                </div>
              </div>
              <h1 className="text-5xl sm:text-6xl font-heading font-bold mb-4">
                <span className="bg-gradient-to-r from-amber-700 via-orange-600 to-amber-800 bg-clip-text text-transparent">
                  Scrolls of Wisdom
                </span>
              </h1>
              <p className="text-xl font-body font-medium text-amber-600 dark:text-amber-400 mb-2">
                Biblical Knowledge Quest Platform
              </p>
            </div>
            <p className="text-xl font-body text-gray-700 dark:text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              Embark on a journey through scripture with AI-powered wisdom quests. Create, manage, and experience 
              comprehensive biblical assessments that deepen understanding and strengthen faith.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" className="w-full sm:w-auto">
                  Begin Your Journey
                </Button>
              </Link>
              <Link href="/auth/educator-signup">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-amber-600 text-amber-700 hover:bg-amber-50">
                  Become a Guide
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-16 sm:px-12 lg:px-24 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                Sacred Features
              </span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Discover the tools that will guide your biblical learning journey
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 rounded-xl border border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 hover:shadow-lg transition-all duration-300">
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-3 rounded-lg w-fit mb-4">
                <DocumentTextIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-amber-800 dark:text-amber-300">
                Sacred Text Processing
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                Upload biblical study materials and scriptures in multiple formats for divine wisdom extraction.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-xl border border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 hover:shadow-lg transition-all duration-300">
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-3 rounded-lg w-fit mb-4">
                <SparklesIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-amber-800 dark:text-amber-300">
                Divine Quest Generation
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                AI-guided quest creation with wisdom levels and spiritual taxonomy support for deeper learning.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-xl border border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 hover:shadow-lg transition-all duration-300">
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-3 rounded-lg w-fit mb-4">
                <ClockIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-amber-800 dark:text-amber-300">
                Sacred Time Keeper
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                Divine timing with synchronized sessions and guided meditation periods for focused learning.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-xl border border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 hover:shadow-lg transition-all duration-300">
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-3 rounded-lg w-fit mb-4">
                <UserGroupIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-amber-800 dark:text-amber-300">
                Guided Community
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                Sacred spaces for guides and disciples with personalized spiritual learning experiences.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-xl border border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 hover:shadow-lg transition-all duration-300">
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-3 rounded-lg w-fit mb-4">
                <ChartBarIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-amber-800 dark:text-amber-300">
                Wisdom Analytics
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                Divine insights into spiritual growth with comprehensive journey tracking and enlightenment metrics.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-xl border border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 hover:shadow-lg transition-all duration-300">
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-3 rounded-lg w-fit mb-4">
                <HeartIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-amber-800 dark:text-amber-300">
                Instant Revelation
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                Immediate spiritual feedback with divine explanations and growth insights by sacred topic.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-6 py-16 sm:px-12 lg:px-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                The Sacred Path
              </span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Journey through wisdom with purpose and divine guidance
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-12">
            {/* For Educators */}
            <div>
              <h3 className="text-2xl font-semibold mb-6 text-amber-800 dark:text-amber-300">
                For Spiritual Guides
              </h3>
              <ol className="space-y-4">
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-full flex items-center justify-center font-semibold shadow-lg">
                    1
                  </span>
                  <span className="ml-4 text-gray-700 dark:text-gray-300">
                    Upload your sacred texts and biblical study materials
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-full flex items-center justify-center font-semibold shadow-lg">
                    2
                  </span>
                  <span className="ml-4 text-gray-700 dark:text-gray-300">
                    Configure quest parameters (wisdom topics, spiritual depth, divine timing)
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-full flex items-center justify-center font-semibold shadow-lg">
                    3
                  </span>
                  <span className="ml-4 text-gray-700 dark:text-gray-300">
                    Review and share wisdom quests with your disciples
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-full flex items-center justify-center font-semibold shadow-lg">
                    4
                  </span>
                  <span className="ml-4 text-gray-700 dark:text-gray-300">
                    Watch spiritual growth and celebrate divine revelations
                  </span>
                </li>
              </ol>
            </div>

            {/* For Students */}
            <div>
              <h3 className="text-2xl font-semibold mb-6 text-amber-800 dark:text-amber-300">
                For Disciples
              </h3>
              <ol className="space-y-4">
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-full flex items-center justify-center font-semibold shadow-lg">
                    1
                  </span>
                  <span className="ml-4 text-gray-700 dark:text-gray-300">
                    Join the fellowship and enroll in wisdom quests
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-full flex items-center justify-center font-semibold shadow-lg">
                    2
                  </span>
                  <span className="ml-4 text-gray-700 dark:text-gray-300">
                    Embark on quests during sacred times with divine guidance
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-full flex items-center justify-center font-semibold shadow-lg">
                    3
                  </span>
                  <span className="ml-4 text-gray-700 dark:text-gray-300">
                    Navigate wisdom with contemplation and reflection opportunities
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-full flex items-center justify-center font-semibold shadow-lg">
                    4
                  </span>
                  <span className="ml-4 text-gray-700 dark:text-gray-300">
                    Receive divine revelations and track your spiritual journey
                  </span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-16 sm:px-12 lg:px-24 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 dark:from-amber-700 dark:via-orange-700 dark:to-amber-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Begin Your Sacred Journey?
          </h2>
          <p className="text-xl text-amber-100 mb-8 leading-relaxed">
            Join guides and disciples in the most profound biblical learning experience ever created.
          </p>
          <Link href="/auth/signup">
            <Button size="lg" className="bg-white text-amber-700 hover:bg-amber-50 font-semibold px-8 py-3 shadow-lg">
              Start Your Divine Quest
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer with subtle admin link */}
      <footer className="px-6 py-8 sm:px-12 lg:px-24 bg-amber-50/50 dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center text-sm text-gray-500 dark:text-gray-600">
            <p className="mb-2">
              &ldquo;The fear of the Lord is the beginning of wisdom&rdquo; - Proverbs 9:10
            </p>
            <div className="flex justify-center items-center gap-4 mt-4">
              <span>© 2024 Scrolls of Wisdom</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}