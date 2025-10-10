#!/bin/bash

echo "🚀 Starting build with LibreOffice..."

# Update and install minimal LibreOffice
apt-get update

# Try installing only the core components
echo "🔧 Installing minimal LibreOffice..."
apt-get install -y --no-install-recommends \
    libreoffice-core \
    libreoffice-writer \
    libreoffice-common

# Alternative: Try headless version
if ! command -v soffice &> /dev/null; then
    echo "Trying headless LibreOffice..."
    apt-get install -y libreoffice-headless
fi

# Final attempt with timeout
if command -v soffice &> /dev/null; then
    echo "✅ LibreOffice found"
    timeout 10s soffice --version && echo "✅ Working" || echo "❌ Not working"
else
    echo "❌ LibreOffice installation failed"
    echo "Consider upgrading to paid plan or using alternative hosting"
fi

npm install
npm run build
echo "✅ Build completed"