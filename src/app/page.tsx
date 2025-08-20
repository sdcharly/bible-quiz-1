import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, Clock, BarChart3, FileText, CheckCircle } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <section className="px-6 py-24 sm:px-12 lg:px-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Biblical Study Quiz Platform
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              Empower your biblical education with AI-powered quizzes. Create, manage, and take comprehensive assessments based on scripture and study materials.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" className="w-full sm:w-auto">
                  Get Started as Student
                </Button>
              </Link>
              <Link href="/auth/educator-signup">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Join as Educator
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-16 sm:px-12 lg:px-24 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">
            Platform Features
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <FileText className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Document Processing
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Upload biblical study materials in PDF, DOCX, or TXT formats for automatic quiz generation.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <BookOpen className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Smart Quiz Generation
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                AI-powered quiz creation with customizable difficulty levels and Bloom&apos;s Taxonomy support.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <Clock className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Timed Assessments
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Server-synchronized timers with scheduled start times and automatic submission.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <Users className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Role-Based Access
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Dedicated dashboards for educators and students with tailored functionality.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <BarChart3 className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Analytics & Insights
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Comprehensive performance tracking with individual and class-wide statistics.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <CheckCircle className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Instant Results
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Immediate scoring with detailed explanations and performance metrics by topic.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-6 py-16 sm:px-12 lg:px-24">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">
            How It Works
          </h2>
          <div className="grid md:grid-cols-2 gap-12">
            {/* For Educators */}
            <div>
              <h3 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">
                For Educators
              </h3>
              <ol className="space-y-4">
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                    1
                  </span>
                  <span className="ml-4 text-gray-600 dark:text-gray-300">
                    Upload your biblical study documents and materials
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                    2
                  </span>
                  <span className="ml-4 text-gray-600 dark:text-gray-300">
                    Configure quiz parameters (topics, difficulty, duration)
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                    3
                  </span>
                  <span className="ml-4 text-gray-600 dark:text-gray-300">
                    Review and publish quizzes for your students
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                    4
                  </span>
                  <span className="ml-4 text-gray-600 dark:text-gray-300">
                    Monitor progress and analyze performance metrics
                  </span>
                </li>
              </ol>
            </div>

            {/* For Students */}
            <div>
              <h3 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">
                For Students
              </h3>
              <ol className="space-y-4">
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                    1
                  </span>
                  <span className="ml-4 text-gray-600 dark:text-gray-300">
                    Sign up and enroll in available quizzes
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                    2
                  </span>
                  <span className="ml-4 text-gray-600 dark:text-gray-300">
                    Take quizzes at scheduled times with timer support
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                    3
                  </span>
                  <span className="ml-4 text-gray-600 dark:text-gray-300">
                    Navigate questions with skip and review options
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                    4
                  </span>
                  <span className="ml-4 text-gray-600 dark:text-gray-300">
                    Review detailed results and track your progress
                  </span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-16 sm:px-12 lg:px-24 bg-blue-600 dark:bg-blue-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Your Biblical Education?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join educators and students in creating a more engaging learning experience.
          </p>
          <Link href="/auth/signup">
            <Button size="lg" variant="secondary" className="font-semibold">
              Start Your Free Trial
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}