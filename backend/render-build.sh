#!/bin/bash

echo "🚀 Starting build process on Render..."

# Update package list
echo "📦 Updating package list..."
apt-get update

# Install LibreOffice with proper dependencies
echo "🔧 Installing LibreOffice..."
apt-get install -y libreoffice

# Install additional dependencies for better compatibility
echo "📥 Installing additional dependencies..."
apt-get install -y \
    libreoffice-writer \
    libreoffice-calc \
    libreoffice-impress \
    libreoffice-base \
    fonts-liberation \
    fonts-dejavu \
    poppler-utils

# Verify installation
echo "🔍 Verifying LibreOffice installation..."
if command -v soffice &> /dev/null; then
    echo "✅ LibreOffice command found"
    soffice --version
    echo "Testing conversion capability..."
    timeout 15s soffice --headless --help > /dev/null 2>&1 && echo "✅ LibreOffice is functional" || echo "⚠️ LibreOffice has startup issues"
else
    echo "❌ LibreOffice command not found"
    echo "Searching for LibreOffice..."
    find /usr -name "soffice" 2>/dev/null | head -5
    find /opt -name "soffice" 2>/dev/null | head -5
fi

# Install Node.js dependencies
echo "📥 Installing npm packages..."
npm install

# Build the project
echo "🔨 Building TypeScript project..."
npm run build

echo "✅ Build completed!"