'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { Upload, Download, File, Image, Shield, Zap, CheckCircle, AlertCircle, Loader2, Users, Clock, Globe } from 'lucide-react';
import Script from 'next/script';

interface SupportedConversions {
  [mimeType: string]: string[];
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [targetFormat, setTargetFormat] = useState('');
  const [converting, setConverting] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [error, setError] = useState('');
  const [supportedConversions, setSupportedConversions] = useState<SupportedConversions>({});

  // Fetch supported conversions from backend
  useEffect(() => {
    const fetchSupportedConversions = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/conversion/supported-formats');
        setSupportedConversions(response.data.data);
      } catch (err) {
        console.error('Failed to fetch supported conversions:', err);

        setSupportedConversions({
          'image/jpeg': ['png', 'webp', 'gif'],
          'image/jpg': ['png', 'webp', 'gif'],
          'image/png': ['jpeg', 'jpg', 'webp', 'gif'],
          'image/gif': ['jpeg', 'jpg', 'png', 'webp'],
          'image/webp': ['jpeg', 'jpg', 'png', 'gif'],
          'application/pdf': ['docx', 'txt'],
          'text/plain': ['pdf', 'docx'],
        });
      }
    };

    fetchSupportedConversions();
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      setTargetFormat('');
      setDownloadUrl('');
      setError('');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const handleConvert = async () => {
    if (!file || !targetFormat) return;

    setConverting(true);
    setError('');
    setDownloadUrl('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetFormat', targetFormat);

    try {
      const response = await axios.post('http://localhost:5000/api/conversion/convert', formData, {
        responseType: 'blob',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      });

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      setDownloadUrl(url);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Conversion failed. Please try again.');
    } finally {
      setConverting(false);
    }
  };

  const getAvailableConversions = () => {
    if (!file) return [];
    return supportedConversions[file.type] || [];
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <File className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">FileConverter Pro</h1>
                <p className="text-sm text-gray-600">Universal File Conversion</p>
              </div>
            </div>

            {/* Navigation Menu - Added this section */}
            <nav className="hidden md:flex items-center space-x-8">
              <a
                href="/"
                className="text-gray-700 hover:text-blue-600 transition-colors duration-200 font-medium"
              >
                Home
              </a>
              <a
                href="#features"
                className="text-gray-700 hover:text-blue-600 transition-colors duration-200 font-medium"
              >
                Features
              </a>
              <a
                href="#formats"
                className="text-gray-700 hover:text-blue-600 transition-colors duration-200 font-medium"
              >
                Formats
              </a>

              <a
                href="/about"
                className="text-gray-700 hover:text-blue-600 transition-colors duration-200 font-medium"
              >
                About
              </a>
              <a
                href="/contact"
                className="text-gray-700 hover:text-blue-600 transition-colors duration-200 font-medium"
              >
                Contact
              </a>
            </nav>

            {/* Mobile menu button - Optional */}
            <div className="md:hidden">
              <button className="p-2 text-gray-600 hover:text-blue-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* AdSense Banner - Top */}
        <div className="text-center mb-8">
          <ins className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
            data-ad-slot="1234567890"
            data-ad-format="auto"
            data-full-width-responsive="true"></ins>
        </div>

        {/* Hero Section */}
        <section className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Convert Files{' '}
            <span className="text-blue-600">in Seconds</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Free online file converter supporting images, documents, PDFs and more.
            No registration required. 100% secure and private.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto mb-8">
            <div className="flex items-center justify-center space-x-2 text-gray-600">
              <Users className="h-5 w-5 text-blue-600" />
              <span>10,000+ Users</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-gray-600">
              <Clock className="h-5 w-5 text-green-600" />
              <span>Instant Conversion</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-gray-600">
              <Globe className="h-5 w-5 text-purple-600" />
              <span>100% Free</span>
            </div>
          </div>
        </section>

        {/* Conversion Interface */}
        <section className="max-w-4xl mx-auto mb-16">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
            <div
              {...getRootProps()}
              className={`border-3 border-dashed border-gray-300 rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 bg-white/50 backdrop-blur-sm hover:border-blue-400 hover:bg-blue-50/50 ${isDragActive ? 'border-blue-500 bg-blue-50 border-solid' : ''}`}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              {isDragActive ? (
                <div>
                  <p className="text-2xl font-semibold text-blue-600 mb-2">Drop the file here</p>
                  <p className="text-gray-500">Release to start conversion</p>
                </div>
              ) : (
                <div>
                  <p className="text-2xl font-semibold text-gray-700 mb-2">
                    Drag & drop your file
                  </p>
                  <p className="text-lg text-gray-500 mb-4">
                    or <span className="text-blue-600 font-semibold">click to browse</span>
                  </p>
                  <p className="text-sm text-gray-400">
                    Supports images, PDFs, documents • Max 50MB
                  </p>
                </div>
              )}
            </div>

            {file && (
              <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <File className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-lg">{file.name}</p>
                      <p className="text-sm text-gray-600">
                        {formatFileSize(file.size)} • {file.type}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setFile(null)}
                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                </div>

                {/* Format Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Convert to:
                  </label>
                  <select
                    value={targetFormat}
                    onChange={(e) => setTargetFormat(e.target.value)}
                    className="w-full p-4 border border-gray-300 rounded-xl focus:ring-3 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 text-lg"
                    disabled={converting}
                  >
                    <option value="">Select target format</option>
                    {getAvailableConversions().map((format) => (
                      <option key={format} value={format}>
                        {format.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    <p className="text-red-700">{error}</p>
                  </div>
                )}

                {/* Convert Button */}
                <button
                  onClick={handleConvert}
                  disabled={!targetFormat || converting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                >
                  {converting ? (
                    <span className="flex items-center justify-center">
                      <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                      Converting...
                    </span>
                  ) : (
                    'Convert File'
                  )}
                </button>

                {/* Download Section */}
                {downloadUrl && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-gray-900">
                            Conversion complete!
                          </p>
                          <p className="text-sm text-gray-600">
                            Your file has been converted successfully
                          </p>
                        </div>
                      </div>
                      <a
                        href={downloadUrl}
                        download={`converted.${targetFormat}`}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center space-x-2"
                      >
                        <Download className="h-5 w-5" />
                        <span>Download</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* AdSense In-Article */}
        <div className="text-center my-12">
          <ins className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
            data-ad-slot="2345678901"
            data-ad-format="auto"
            data-full-width-responsive="true"></ins>
        </div>

        {/* Features Section */}
        <section className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-2xl shadow-xl border border-white/20 p-6 text-center">
            <Shield className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-3">Secure & Private</h3>
            <p className="text-gray-600 leading-relaxed">
              Files are processed in memory and never stored on our servers. Complete privacy guaranteed.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-white/20 p-6 text-center">
            <Zap className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-3">Lightning Fast</h3>
            <p className="text-gray-600 leading-relaxed">
              Advanced conversion algorithms ensure quick processing without compromising quality.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-white/20 p-6 text-center">
            <Image className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-3">Multiple Formats</h3>
            <p className="text-gray-600 leading-relaxed">
              Support for images, documents, PDFs and many other file types with high quality output.
            </p>
          </div>
        </section>

        {/* AdSense Bottom Banner */}
        <div className="text-center my-12">
          <ins className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
            data-ad-slot="3456789012"
            data-ad-format="auto"
            data-full-width-responsive="true"></ins>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="flex justify-center items-center space-x-2 mb-4">
              <File className="h-6 w-6 text-blue-400" />
              <span className="text-xl font-bold">FileConverter Pro</span>
            </div>
            <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
              Free online file conversion service. Convert images, documents, PDFs and more
              with our secure and fast conversion tool.
            </p>

            {/* Updated navigation links */}
            <div className="flex justify-center space-x-8 mb-6 flex-wrap">
              <a href="/" className="text-gray-400 hover:text-white transition-colors">
                Home
              </a>
              <a href="/about" className="text-gray-400 hover:text-white transition-colors">
                About
              </a>
              <a href="/contact" className="text-gray-400 hover:text-white transition-colors">
                Contact
              </a>
              <a href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                Privacy Policy
              </a>
              <a href="/terms" className="text-gray-400 hover:text-white transition-colors">
                Terms of Service
              </a>
            </div>

            <p className="text-gray-500 text-sm">
              &copy; 2024 FileConverter Pro. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Initialize AdSense Scripts */}
      <Script
        id="adsense-load"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (adsbygoogle = window.adsbygoogle || []).push({});
          `
        }}
      />
    </div>
  );
}