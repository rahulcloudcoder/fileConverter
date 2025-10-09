#!/bin/bash

echo "🚀 Starting build process on Render..."

# Update package list
echo "📦 Updating package list..."
apt-get update

# Install LibreOffice (required for your converter)
echo "🔧 Installing LibreOffice..."
apt-get install -y libreoffice

# Install additional dependencies for better PDF support
echo "📥 Installing PDF tools..."
apt-get install -y poppler-utils

# Verify installations
echo "🔍 Verifying installations..."
if command -v soffice &> /dev/null; then
    soffice --version
    echo "✅ LibreOffice installed successfully"
else
    echo "❌ LibreOffice installation failed"
    exit 1
fi

if command -v pdftotext &> /dev/null; then
    pdftotext -v
    echo "✅ Poppler-utils installed successfully"
else
    echo "❌ Poppler-utils installation failed"
fi

# Install Node.js dependencies
echo "📥 Installing npm packages..."
npm install

# Build the project
echo "🔨 Building TypeScript project..."
npm run build

# Check if build was successful
if [ -d "dist" ]; then
    echo "✅ Build completed successfully!"
    echo "📁 Build contents:"
    ls -la dist/
else
    echo "❌ Build failed - dist directory not found"
    exit 1
fi

echo "🎉 Render build process completed!"