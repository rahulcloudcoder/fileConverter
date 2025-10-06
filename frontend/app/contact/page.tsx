import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact Us - FileConverter Pro',
  description: 'Get in touch with the FileConverter Pro team for support and feedback',
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Contact Us</h1>
          <p className="text-lg text-gray-600 mb-8">We&apos;d love to hear from you!</p>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-semibold mb-6 text-blue-600">Get In Touch</h2>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 p-3 rounded-full">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Email</h3>
                    <p className="text-gray-600">contact@fileconverterpro.com</p>
                    <p className="text-sm text-gray-500">We&apos;ll respond within 24 hours</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-green-100 p-3 rounded-full">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Feedback</h3>
                    <p className="text-gray-600">Share your experience</p>
                    <p className="text-sm text-gray-500">Help us improve our service</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-purple-100 p-3 rounded-full">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Support</h3>
                    <p className="text-gray-600">Technical assistance</p>
                    <p className="text-sm text-gray-500">Get help with file conversions</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4 text-blue-800">Why Contact Us?</h3>
              <ul className="space-y-3 text-blue-700">
                <li className="flex items-center space-x-2">
                  <span>✓</span>
                  <span>Report conversion issues</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span>✓</span>
                  <span>Request new file formats</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span>✓</span>
                  <span>Provide feature suggestions</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span>✓</span>
                  <span>Report bugs or problems</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span>✓</span>
                  <span>General inquiries</span>
                </li>
              </ul>
              
              <div className="mt-6 p-4 bg-white rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Note:</strong> While we don&apos;t store your files, if you&apos;re experiencing issues with 
                  specific file types, please let us know so we can improve our conversion algorithms.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}