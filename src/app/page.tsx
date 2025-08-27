"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  UserGroupIcon, 
  ClockIcon, 
  ChartBarIcon, 
  DocumentTextIcon, 
  SparklesIcon,
  HeartIcon,
  ArrowRightIcon,
  CheckIcon
} from "@heroicons/react/24/outline";

import {
  BookOpenIcon as BookOpenSolid,
  StarIcon
} from "@heroicons/react/24/solid";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";

export default function HomePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [email, setEmail] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState<string | null>(null);

  useEffect(() => {
    // If user is signed in, redirect to dashboard
    if (!isPending && session?.user) {
      router.push("/dashboard");
    }
  }, [session, isPending, router]);

  // Fetch YouTube URL from settings
  useEffect(() => {
    fetch("/api/public/youtube-url")
      .then(res => res.json())
      .then(data => {
        if (data.youtubeUrl) {
          setYoutubeUrl(data.youtubeUrl);
        }
      })
      .catch(() => {
        // Use default URL on error
        setYoutubeUrl("https://www.youtube.com/embed/zBnGACs7Ddo?rel=0&modestbranding=1&autoplay=0&mute=1");
      });
  }, []);

  const handleQuickStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      router.push(`/auth/signup?email=${encodeURIComponent(email)}`);
    }
  };

  // Show loading while checking session
  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-amber-700 font-medium">Preparing your journey...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section with Modern Religious Design */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {/* Decorative Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 35px,
              rgba(245, 158, 11, 0.1) 35px,
              rgba(245, 158, 11, 0.1) 70px
            )`
          }}></div>
        </div>
        
        <div className="relative px-6 py-16 sm:px-12 lg:px-24">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Content */}
              <div className="text-center lg:text-left">
                {/* Scripture Quote */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 rounded-full mb-6">
                  <BookOpenSolid className="h-4 w-4 text-amber-600" />
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    "Your word is a lamp to my feet" - Psalm 119:105
                  </p>
                </div>
                
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold mb-6 leading-tight">
                  <span className="block text-gray-900 dark:text-gray-100">Transform Your</span>
                  <span className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 bg-clip-text text-transparent">
                    Biblical Education
                  </span>
                </h1>
                
                <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                  Join thousands of educators and students in creating engaging, 
                  AI-powered biblical assessments that deepen understanding and strengthen faith.
                </p>
                
                {/* Quick Start Form */}
                <form onSubmit={handleQuickStart} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto lg:mx-0 mb-6">
                  <Input
                    type="email"
                    placeholder="Enter your email to get started"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 h-12 px-4 border-amber-300 focus:border-amber-500"
                  />
                  <Button type="submit" size="lg" className="h-12 px-6 shadow-lg hover:shadow-xl transition-all">
                    Get Started <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </Button>
                </form>
                
                {/* Trust Indicators */}
                <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <CheckIcon className="h-4 w-4 text-green-600" />
                    100% Free Platform
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckIcon className="h-4 w-4 text-green-600" />
                    No Fees Required
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckIcon className="h-4 w-4 text-green-600" />
                    Instant Access
                  </span>
                </div>
              </div>
              
              {/* Right Visual Element with Video */}
              <div className="relative hidden lg:block">
                <div className="relative">
                  {/* Video Only - No Card, No Border */}
                  {youtubeUrl && (
                    <div className="rounded-xl overflow-hidden shadow-2xl">
                      <div className="relative aspect-video">
                        <iframe
                          className="absolute inset-0 w-full h-full"
                          src={youtubeUrl}
                          title="Platform Demo"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          loading="lazy"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section with Better Visual Hierarchy */}
      <section className="px-6 py-16 sm:px-12 lg:px-24 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-heading font-bold mb-4">
              <span className="text-gray-900 dark:text-gray-100">Everything You Need for</span>
              <span className="block mt-2 bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                Biblical Education Excellence
              </span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Powerful tools designed specifically for biblical educators and learners
            </p>
          </div>
          
          {/* Feature Grid with Enhanced Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <Card className="group hover:shadow-xl transition-all duration-300 border-amber-200/50 hover:border-amber-300">
              <CardContent className="p-6">
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-3 rounded-lg w-fit mb-4 group-hover:scale-110 transition-transform">
                  <DocumentTextIcon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
                  Smart Document Processing
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Upload study materials in any format. Our AI extracts and organizes biblical content automatically.
                </p>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card className="group hover:shadow-xl transition-all duration-300 border-amber-200/50 hover:border-amber-300">
              <CardContent className="p-6">
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-3 rounded-lg w-fit mb-4 group-hover:scale-110 transition-transform">
                  <SparklesIcon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
                  AI Quiz Generation
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Generate comprehensive assessments instantly with support for multiple difficulty levels.
                </p>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card className="group hover:shadow-xl transition-all duration-300 border-amber-200/50 hover:border-amber-300">
              <CardContent className="p-6">
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-3 rounded-lg w-fit mb-4 group-hover:scale-110 transition-transform">
                  <ClockIcon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
                  Scheduled Sessions
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Set specific times for quizzes with automatic timezone handling for global classes.
                </p>
              </CardContent>
            </Card>

            {/* Feature 4 */}
            <Card className="group hover:shadow-xl transition-all duration-300 border-amber-200/50 hover:border-amber-300">
              <CardContent className="p-6">
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-3 rounded-lg w-fit mb-4 group-hover:scale-110 transition-transform">
                  <UserGroupIcon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
                  Class Management
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Organize students into groups and track progress with personalized feedback.
                </p>
              </CardContent>
            </Card>

            {/* Feature 5 */}
            <Card className="group hover:shadow-xl transition-all duration-300 border-amber-200/50 hover:border-amber-300">
              <CardContent className="p-6">
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-3 rounded-lg w-fit mb-4 group-hover:scale-110 transition-transform">
                  <ChartBarIcon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
                  Detailed Analytics
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Track performance by topic and difficulty with exportable reports.
                </p>
              </CardContent>
            </Card>

            {/* Feature 6 */}
            <Card className="group hover:shadow-xl transition-all duration-300 border-amber-200/50 hover:border-amber-300">
              <CardContent className="p-6">
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-3 rounded-lg w-fit mb-4 group-hover:scale-110 transition-transform">
                  <HeartIcon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
                  Instant Feedback
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Provide immediate explanations to help students learn and grow.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section - Simplified */}
      <section className="px-6 py-16 sm:px-12 lg:px-24 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-heading font-bold mb-4">
              <span className="text-gray-900 dark:text-gray-100">Start Teaching in</span>
              <span className="block mt-2 bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                Three Simple Steps
              </span>
            </h2>
          </div>

          {/* Three Steps Process */}
          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white text-2xl font-bold w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                1
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
                Upload Your Content
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Simply upload your study materials or scripture passages in any format.
              </p>
            </div>
            
            {/* Step 2 */}
            <div className="text-center">
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white text-2xl font-bold w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                2
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
                Customize Your Quiz
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Set difficulty levels and time limits. AI generates perfect questions instantly.
              </p>
            </div>
            
            {/* Step 3 */}
            <div className="text-center">
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white text-2xl font-bold w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                3
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
                Share & Track Progress
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Send quiz links to students and watch their progress in real-time.
              </p>
            </div>
          </div>
          
          {/* CTA Button */}
          <div className="text-center mt-12">
            <Link href="/auth/educator-signup">
              <Button size="lg" className="shadow-lg hover:shadow-xl transition-all">
                Create Your First Quiz <ArrowRightIcon className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="px-6 py-16 sm:px-12 lg:px-24 bg-white dark:bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-heading font-bold mb-4">
              <span className="text-gray-900 dark:text-gray-100">Trusted by Educators</span>
              <span className="block mt-2 bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                Worldwide
              </span>
            </h2>
          </div>
          
          {/* Testimonial Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-amber-200/50">
              <CardContent className="p-6">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <StarIcon key={i} className="h-5 w-5 text-amber-500" />
                  ))}
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-4 italic">
                  "This platform has transformed how I teach scripture. The AI-generated questions are thoughtful and align perfectly with my curriculum."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold">
                    SM
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Sarah Mitchell</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Bible Study Leader</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-amber-200/50">
              <CardContent className="p-6">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <StarIcon key={i} className="h-5 w-5 text-amber-500" />
                  ))}
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-4 italic">
                  "The analytics help me identify where students need more support. It's been invaluable for personalizing my teaching approach."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold">
                    JD
                  </div>
                  <div>
                    <p className="font-semibold text-sm">John Davis</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Seminary Professor</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-amber-200/50">
              <CardContent className="p-6">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <StarIcon key={i} className="h-5 w-5 text-amber-500" />
                  ))}
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-4 italic">
                  "Easy to use and incredibly powerful. My students love the instant feedback, and I love the time it saves me!"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold">
                    RB
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Rachel Brown</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Youth Pastor</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="px-6 py-16 sm:px-12 lg:px-24 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 dark:from-amber-700 dark:via-orange-700 dark:to-amber-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-heading font-bold text-white mb-6">
            Ready to Transform Your Biblical Teaching?
          </h2>
          <p className="text-xl text-amber-100 mb-8 leading-relaxed">
            Join thousands of educators who are already using AI to create engaging biblical assessments.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup">
              <Button size="lg" className="bg-white text-amber-700 hover:bg-amber-50 font-semibold px-8 py-3 shadow-lg hover:shadow-xl transition-all">
                Get Started Free
              </Button>
            </Link>
            <Link href="/auth/educator-signup">
              <Button size="lg" className="!bg-transparent !border-2 !border-white !text-white hover:!bg-white hover:!text-amber-800 hover:!border-white hover:!shadow-xl font-semibold px-8 py-3 transition-all">
                Educator Sign Up
              </Button>
            </Link>
          </div>
          <p className="mt-8 text-sm text-amber-200">
            100% Free Platform • Setup in 2 minutes
          </p>
        </div>
      </section>
    </div>
  );
}