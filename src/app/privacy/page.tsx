import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export const metadata: Metadata = {
  title: "Privacy Policy - Scrolls of Wisdom",
  description: "Privacy Policy for Scrolls of Wisdom - Your Biblical Knowledge Quest Platform",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>
        
        <div className="bg-white rounded-xl shadow-lg p-8 md:p-12">
          <h1 className="text-4xl font-heading font-bold text-amber-800 mb-8">
            Privacy Policy
          </h1>
          
          <div className="prose prose-amber max-w-none">
            <p className="text-gray-600 mb-6">
              <strong>Effective Date:</strong> January 1, 2025<br />
              <strong>Last Updated:</strong> December 2024
            </p>
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-amber-700 mb-4">
                Our Sacred Commitment to Your Privacy
              </h2>
              <p className="text-gray-700 mb-4">
                At Scrolls of Wisdom ("we," "our," or "us"), we honor the trust you place in us when you use our biblical education platform. This Privacy Policy explains how we collect, use, protect, and share information about you when you use our services at biblequiz.textr.in.
              </p>
              <p className="text-gray-700 mb-4">
                As stewards of your information, we are committed to transparency and protecting your privacy while providing you with meaningful biblical education tools.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-amber-700 mb-4">
                1. Information We Collect
              </h2>
              
              <h3 className="text-xl font-semibold text-amber-600 mb-3">
                1.1 Information You Provide
              </h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li><strong>Account Information:</strong> Name, email address, password, and role (educator/student)</li>
                <li><strong>Profile Information:</strong> Display name, educational institution, timezone preferences</li>
                <li><strong>Educational Content:</strong> Documents, study materials, and quiz content you upload</li>
                <li><strong>Quiz Responses:</strong> Your answers, scores, and learning progress</li>
                <li><strong>Communications:</strong> Feedback, support requests, and correspondence with us</li>
              </ul>

              <h3 className="text-xl font-semibold text-amber-600 mb-3">
                1.2 Information Automatically Collected
              </h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li><strong>Usage Data:</strong> Pages visited, features used, time spent on platform</li>
                <li><strong>Device Information:</strong> Browser type, operating system, device type</li>
                <li><strong>Log Data:</strong> IP address, access times, error logs</li>
                <li><strong>Learning Analytics:</strong> Quiz performance, topic strengths, learning patterns</li>
              </ul>

              <h3 className="text-xl font-semibold text-amber-600 mb-3">
                1.3 Information from Third Parties
              </h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li><strong>OAuth Providers:</strong> Basic profile information if you sign in with Google or other providers</li>
                <li><strong>Educator Invitations:</strong> Name and email when an educator invites you to join</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-amber-700 mb-4">
                2. How We Use Your Information
              </h2>
              <p className="text-gray-700 mb-4">We use your information to:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li><strong>Provide Educational Services:</strong> Create accounts, generate quizzes, track progress</li>
                <li><strong>Improve Learning Outcomes:</strong> Analyze performance data to enhance educational tools</li>
                <li><strong>Communicate:</strong> Send important updates, reminders, and educational insights</li>
                <li><strong>Ensure Safety:</strong> Detect fraud, prevent abuse, maintain platform security</li>
                <li><strong>Personalize Experience:</strong> Customize content difficulty, suggest relevant materials</li>
                <li><strong>Legal Compliance:</strong> Fulfill legal obligations and enforce our terms</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-amber-700 mb-4">
                3. How We Share Information
              </h2>
              <p className="text-gray-700 mb-4">
                We do not sell, rent, or trade your personal information. We share information only in these circumstances:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li><strong>With Your Consent:</strong> When you explicitly agree to sharing</li>
                <li><strong>Within Educational Groups:</strong> Educators can see their students' progress and scores</li>
                <li><strong>Service Providers:</strong> Trusted partners who help us operate (hosting, email services)</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect rights and safety</li>
                <li><strong>Aggregated Data:</strong> Non-identifiable statistics for research and improvement</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-amber-700 mb-4">
                4. Data Security
              </h2>
              <p className="text-gray-700 mb-4">
                We implement appropriate technical and organizational measures to protect your information:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Encryption of data in transit and at rest</li>
                <li>Secure password hashing using industry standards</li>
                <li>Regular security audits and updates</li>
                <li>Limited access to personal information on need-to-know basis</li>
                <li>Secure data centers with physical and digital protection</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-amber-700 mb-4">
                5. Your Rights and Choices
              </h2>
              <p className="text-gray-700 mb-4">You have the right to:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li><strong>Access Your Data:</strong> Request a copy of information we hold about you</li>
                <li><strong>Correct Information:</strong> Update or correct inaccurate data</li>
                <li><strong>Delete Account:</strong> Request deletion of your account and associated data</li>
                <li><strong>Data Portability:</strong> Receive your data in a machine-readable format</li>
                <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications</li>
                <li><strong>Restrict Processing:</strong> Limit how we use your information</li>
              </ul>
              <p className="text-gray-700 mb-4">
                To exercise these rights, contact us at support@biblequiz.textr.in
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-amber-700 mb-4">
                6. Children's Privacy
              </h2>
              <p className="text-gray-700 mb-4">
                We take special care with children's information:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Students under 13 require parental consent through their educator</li>
                <li>We collect minimal information necessary for educational purposes</li>
                <li>Parents can review and delete their child's information</li>
                <li>We do not use children's data for marketing or advertising</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-amber-700 mb-4">
                7. Data Retention
              </h2>
              <p className="text-gray-700 mb-4">
                We retain your information for as long as necessary to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Provide our educational services</li>
                <li>Maintain academic records as required</li>
                <li>Comply with legal obligations</li>
                <li>Resolve disputes and enforce agreements</li>
              </ul>
              <p className="text-gray-700 mb-4">
                Inactive accounts may be deleted after 2 years of inactivity, with prior notice.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-amber-700 mb-4">
                8. Cookies and Tracking
              </h2>
              <p className="text-gray-700 mb-4">
                We use essential cookies and similar technologies to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Maintain your session and preferences</li>
                <li>Ensure platform security</li>
                <li>Analyze usage patterns to improve services</li>
                <li>Remember your timezone and display settings</li>
              </ul>
              <p className="text-gray-700 mb-4">
                We do not use tracking cookies for advertising purposes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-amber-700 mb-4">
                9. International Data Transfers
              </h2>
              <p className="text-gray-700 mb-4">
                Your information may be processed in countries other than your own. We ensure appropriate safeguards are in place to protect your data according to this Privacy Policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-amber-700 mb-4">
                10. Changes to This Policy
              </h2>
              <p className="text-gray-700 mb-4">
                We may update this Privacy Policy periodically. We will notify you of material changes via email or platform notification. Continued use after changes indicates acceptance.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-amber-700 mb-4">
                11. Contact Us
              </h2>
              <p className="text-gray-700 mb-4">
                For privacy concerns or questions, please contact:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li><strong>Email:</strong> support@biblequiz.textr.in</li>
                <li><strong>Data Protection Officer:</strong> privacy@biblequiz.textr.in</li>
                <li><strong>Response Time:</strong> Within 48 hours</li>
              </ul>
            </section>

            <div className="mt-12 p-6 bg-amber-50 rounded-lg border-2 border-amber-200">
              <p className="text-amber-800 text-center italic">
                "The Lord is my shepherd; I shall not want. He makes me lie down in green pastures. He leads me beside still waters." - Psalm 23:1-2
              </p>
              <p className="text-amber-700 text-center mt-4">
                Your trust is sacred to us. We protect your information as we would protect our own.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}