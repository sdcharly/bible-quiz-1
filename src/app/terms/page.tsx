import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export const metadata: Metadata = {
  title: "Terms of Service - Scrolls of Wisdom",
  description: "Terms of Service for Scrolls of Wisdom - Your Biblical Knowledge Quest Platform",
};

export default function TermsPage() {
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
            Terms of Service
          </h1>
          
          <div className="prose prose-amber max-w-none">
            <p className="text-gray-600 mb-6">
              <strong>Effective Date:</strong> January 1, 2025<br />
              <strong>Last Updated:</strong> December 2024
            </p>
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-amber-700 mb-4">
                Welcome to Our Community of Learning
              </h2>
              <p className="text-gray-700 mb-4">
                These Terms of Service ("Terms") govern your use of Scrolls of Wisdom ("Service"), operated by us at biblequiz.textr.in. By accessing or using our Service, you agree to be bound by these Terms.
              </p>
              <p className="text-gray-700 mb-4">
                Our mission is to empower biblical education through technology while maintaining a safe, respectful, and enriching environment for all users.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-amber-700 mb-4">
                1. Acceptance of Terms
              </h2>
              <p className="text-gray-700 mb-4">
                By creating an account or using our Service, you confirm that:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>You are at least 13 years old (or have parental consent if younger)</li>
                <li>You have the legal capacity to enter into these Terms</li>
                <li>You will use the Service in compliance with all applicable laws</li>
                <li>You accept these Terms and our Privacy Policy</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-amber-700 mb-4">
                2. Account Registration
              </h2>
              
              <h3 className="text-xl font-semibold text-amber-600 mb-3">
                2.1 Account Types
              </h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li><strong>Educator Accounts:</strong> For teachers, instructors, and ministry leaders</li>
                <li><strong>Student Accounts:</strong> For learners participating in biblical education</li>
                <li><strong>Administrator Accounts:</strong> For institutional management (where applicable)</li>
              </ul>

              <h3 className="text-xl font-semibold text-amber-600 mb-3">
                2.2 Your Responsibilities
              </h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Provide accurate and complete registration information</li>
                <li>Maintain the security of your password</li>
                <li>Notify us immediately of any unauthorized use</li>
                <li>Be responsible for all activities under your account</li>
                <li>Not share your account with others</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-amber-700 mb-4">
                3. Free Forever Commitment (2025 Educators)
              </h2>
              <p className="text-gray-700 mb-4">
                <strong>Special Provision for 2025 Early Adopters:</strong>
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Educators who register in 2025 receive lifetime free access</li>
                <li>This includes all current features and reasonable future enhancements</li>
                <li>No credit card required, no hidden fees, no future charges</li>
                <li>This commitment is non-transferable and tied to the original account</li>
                <li>Premium features may be offered separately but core platform remains free</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-amber-700 mb-4">
                4. Acceptable Use Policy
              </h2>
              
              <h3 className="text-xl font-semibold text-amber-600 mb-3">
                4.1 You May Use Our Service To:
              </h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Create and distribute biblical educational content</li>
                <li>Assess and track learning progress</li>
                <li>Build educational communities</li>
                <li>Share knowledge and insights respectfully</li>
                <li>Enhance biblical understanding and faith</li>
              </ul>

              <h3 className="text-xl font-semibold text-amber-600 mb-3">
                4.2 You May NOT:
              </h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Upload harmful, offensive, or inappropriate content</li>
                <li>Harass, bully, or discriminate against others</li>
                <li>Violate intellectual property rights</li>
                <li>Attempt to breach security or disrupt service</li>
                <li>Use the platform for commercial spam or solicitation</li>
                <li>Misrepresent your identity or affiliation</li>
                <li>Share content promoting violence or illegal activities</li>
                <li>Use automated systems to abuse the platform</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-amber-700 mb-4">
                5. Content and Intellectual Property
              </h2>
              
              <h3 className="text-xl font-semibold text-amber-600 mb-3">
                5.1 Your Content
              </h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>You retain ownership of content you create and upload</li>
                <li>You grant us a license to use, store, and display your content for service operation</li>
                <li>You warrant that you have rights to all content you upload</li>
                <li>You are responsible for the accuracy and appropriateness of your content</li>
              </ul>

              <h3 className="text-xl font-semibold text-amber-600 mb-3">
                5.2 Our Content
              </h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>The Service and its original content remain our property</li>
                <li>Our trademarks, logos, and branding are protected</li>
                <li>You may not copy or redistribute our platform code or design</li>
              </ul>

              <h3 className="text-xl font-semibold text-amber-600 mb-3">
                5.3 AI-Generated Content
              </h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>AI-generated quizzes and assessments are provided as educational tools</li>
                <li>You should review and verify AI content before distribution</li>
                <li>We do not guarantee the theological accuracy of AI interpretations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-amber-700 mb-4">
                6. Privacy and Data Protection
              </h2>
              <p className="text-gray-700 mb-4">
                Your privacy is sacred to us. Our use of your information is governed by our Privacy Policy. Key points:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>We do not sell your personal data</li>
                <li>Educational data is used solely for improving learning outcomes</li>
                <li>You control your data and can request deletion</li>
                <li>We comply with educational privacy regulations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-amber-700 mb-4">
                7. Educator Responsibilities
              </h2>
              <p className="text-gray-700 mb-4">
                Educators using our platform agree to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Obtain necessary consents for student participation</li>
                <li>Use the platform for legitimate educational purposes</li>
                <li>Protect student privacy and safety</li>
                <li>Provide accurate feedback and grades</li>
                <li>Report any misuse or safety concerns promptly</li>
                <li>Comply with institutional and legal requirements</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-amber-700 mb-4">
                8. Disclaimers and Limitations
              </h2>
              
              <h3 className="text-xl font-semibold text-amber-600 mb-3">
                8.1 Service Availability
              </h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>We strive for 99.9% uptime but cannot guarantee uninterrupted service</li>
                <li>We may perform maintenance with reasonable notice</li>
                <li>We are not liable for third-party service disruptions</li>
              </ul>

              <h3 className="text-xl font-semibold text-amber-600 mb-3">
                8.2 Educational Content
              </h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Content is for educational purposes only</li>
                <li>We do not guarantee specific learning outcomes</li>
                <li>Biblical interpretations may vary; consult spiritual leaders</li>
                <li>AI-generated content should be reviewed by educators</li>
              </ul>

              <h3 className="text-xl font-semibold text-amber-600 mb-3">
                8.3 Limitation of Liability
              </h3>
              <p className="text-gray-700 mb-4">
                To the maximum extent permitted by law, we are not liable for indirect, incidental, special, consequential, or punitive damages arising from your use of the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-amber-700 mb-4">
                9. Termination
              </h2>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>You may close your account at any time</li>
                <li>We may suspend or terminate accounts that violate these Terms</li>
                <li>Upon termination, your right to use the Service ceases</li>
                <li>We may retain certain data as required by law</li>
                <li>Free-forever commitments remain valid unless account is terminated for violations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-amber-700 mb-4">
                10. Changes to Terms
              </h2>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>We may update these Terms to reflect service changes or legal requirements</li>
                <li>We will notify you of material changes via email or platform notification</li>
                <li>Continued use after changes constitutes acceptance</li>
                <li>Free-forever commitments for 2025 educators remain protected</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-amber-700 mb-4">
                11. Dispute Resolution
              </h2>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>We encourage resolution through direct communication</li>
                <li>Disputes will be governed by the laws of applicable jurisdiction</li>
                <li>Both parties agree to attempt good-faith negotiation before litigation</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-amber-700 mb-4">
                12. Contact Information
              </h2>
              <p className="text-gray-700 mb-4">
                For questions about these Terms, please contact us:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li><strong>Email:</strong> support@biblequiz.textr.in</li>
                <li><strong>Website:</strong> https://biblequiz.textr.in</li>
                <li><strong>Response Time:</strong> Within 48 hours during business days</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-amber-700 mb-4">
                13. Miscellaneous
              </h2>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li><strong>Entire Agreement:</strong> These Terms constitute the entire agreement</li>
                <li><strong>Severability:</strong> Invalid provisions don't affect remaining Terms</li>
                <li><strong>No Waiver:</strong> Failure to enforce doesn't waive our rights</li>
                <li><strong>Assignment:</strong> You may not assign your rights without consent</li>
              </ul>
            </section>

            <div className="mt-12 p-6 bg-amber-50 rounded-lg border-2 border-amber-200">
              <p className="text-amber-800 text-center italic">
                "Let all things be done decently and in order." - 1 Corinthians 14:40
              </p>
              <p className="text-amber-700 text-center mt-4">
                Thank you for being part of our mission to advance biblical education worldwide.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}