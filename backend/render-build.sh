#!/bin/bash

echo "🚀 Starting build process on Render..."

# Update package list
echo "📦 Updating package list..."
apt-get update

# Install LibreOffice with minimal dependencies (headless)
echo "🔧 Installing LibreOffice (this may take a few minutes)..."
apt-get install -y --no-install-recommends libreoffice

# Install additional fonts and dependencies for better compatibility
echo "📥 Installing additional dependencies..."
apt-get install -y fonts-liberation fonts-dejavu poppler-utils

# Verify LibreOffice installation
echo "🔍 Verifying LibreOffice installation..."
if command -v soffice &> /dev/null; then
    echo "✅ LibreOffice command found"
    soffice --version
else
    echo "❌ LibreOffice command not found, checking alternative locations..."
    # Check common installation paths
    find /usr -name "soffice" 2>/dev/null | head -5
    find /opt -name "soffice" 2>/dev/null | head -5
fi

# Check if LibreOffice is actually working
echo "🧪 Testing LibreOffice functionality..."
if timeout 10s soffice --help &> /dev/null; then
    echo "✅ LibreOffice is working correctly"
else
    echo "⚠️ LibreOffice may have issues starting"
fi

# Install Node.js dependencies
echo "📥 Installing npm packages..."
npm install

# Build the project
echo "🔨 Building TypeScript project..."
npm run build

echo "✅ Build process completed!"