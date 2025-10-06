import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy - FileConverter Pro',
  description: 'Privacy policy for FileConverter Pro online file conversion service',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
          
          <div className="space-y-6 text-gray-700">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
              <p>FileConverter Pro is committed to protecting your privacy. We do not collect, store, or share any personal information. All file conversions happen entirely in your browser.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. File Processing</h2>
              <p>Your files are processed temporarily in memory and are never stored on our servers. Files are automatically deleted immediately after conversion.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Cookies</h2>
              <p>We use only essential cookies for website functionality. We do not use tracking cookies or collect analytics without your consent.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Third-Party Services</h2>
              <p>We use Google AdSense to display advertisements. Google may use cookies to serve ads based on your prior visits to our website or other websites.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Contact Us</h2>
              <p>If you have any questions about this Privacy Policy, please contact us.</p>
            </section>

            <p className="text-sm text-gray-500 mt-8">Last updated: {new Date().getFullYear()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}