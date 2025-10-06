import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Us - FileConverter Pro',
  description: 'Learn about FileConverter Pro and our mission',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">About FileConverter Pro</h1>
          
          <div className="space-y-6 text-gray-700">
            <section>
              <h2 className="text-xl font-semibold mb-3">Our Mission</h2>
              <p>FileConverter Pro was created to provide fast, secure, and free file conversion services to users worldwide. We believe that file conversion should be simple, accessible, and privacy-focused.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">What We Offer</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>Free online file conversion</li>
                <li>No registration required</li>
                <li>Secure in-browser processing</li>
                <li>Support for multiple file formats</li>
                <li>Fast conversion speeds</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Privacy First</h2>
              <p>We take your privacy seriously. Your files are never stored on our servers and all processing happens securely in your browser.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Always Free</h2>
              <p>Our core conversion services will always remain free. We support our operations through non-intrusive advertisements.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}