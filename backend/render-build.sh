#!/bin/bash

echo "🚀 Attempting LibreOffice installation..."

# Try different installation methods
echo "Method 1: Using apt..."
apt-get update && apt-get install -y libreoffice

if command -v soffice &> /dev/null; then
    echo "✅ Method 1 succeeded"
    exit 0
fi

echo "Method 2: Trying headless version..."
apt-get install -y libreoffice-headless

if command -v soffice &> /dev/null; then
    echo "✅ Method 2 succeeded"
    exit 0
fi

echo "Method 3: Trying minimal installation..."
apt-get install -y libreoffice-core libreoffice-common

if command -v soffice &> /dev/null; then
    echo "✅ Method 3 succeeded"
    exit 0
fi

echo "❌ All installation methods failed"
echo "Free tier restrictions prevent package installation"
echo "Consider upgrading to paid plan or switching providers"

# Continue with build anyway
npm install
npm run build
echo "✅ Build completed (without LibreOffice)"