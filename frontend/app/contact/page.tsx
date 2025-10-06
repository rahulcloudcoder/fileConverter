import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact Us - FileConverter Pro',
  description: 'Get in touch with FileConverter Pro team',
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Contact Us</h1>
          
          <div className="space-y-6 text-gray-700">
            <section>
              <h2 className="text-xl font-semibold mb-3">Get in Touch</h2>
              <p>Have questions or feedback about FileConverter Pro? We'd love to hear from you!</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Email</h2>
              <p>contact@fileconverterpro.com</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Response Time</h2>
              <p>We typically respond to all inquiries within 24-48 hours.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Feedback</h2>
              <p>Your feedback helps us improve our service. Let us know what features you'd like to see added!</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}