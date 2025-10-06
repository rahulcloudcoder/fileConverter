import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service - FileConverter Pro',
  description: 'Terms of service for FileConverter Pro online file conversion service',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms of Service</h1>
          
          <div className="space-y-6 text-gray-700">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
              <p>By using FileConverter Pro, you agree to be bound by these Terms of Service.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Service Description</h2>
              <p>FileConverter Pro provides online file conversion services. We strive to maintain high service quality but do not guarantee uninterrupted or error-free service.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. User Responsibilities</h2>
              <p>You agree not to use our service for illegal purposes or to convert copyrighted material without permission.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Limitation of Liability</h2>
              <p>FileConverter Pro is not liable for any damages resulting from the use of our service. File conversion is provided &quot;as is&quot; without warranties.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Changes to Terms</h2>
              <p>We reserve the right to modify these terms at any time. Continued use of the service constitutes acceptance of modified terms.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}