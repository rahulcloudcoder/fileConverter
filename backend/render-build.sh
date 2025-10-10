#!/bin/bash

echo "Ì∫Ä RENDER-BUILD.SH STARTED"

# Install LibreOffice with sudo
apt-get update
apt-get install -y libreoffice

# Verify installation
if command -v soffice &> /dev/null; then
    echo "‚úÖ LibreOffice installed"
    soffice --version
else
    echo "‚ùå LibreOffice failed"
    # Try alternative installation
    apt-get install -y libreoffice-core libreoffice-writer libreoffice-common
fi

# Build the app
npm install
npm run build

echo "‚úÖ BUILD COMPLETED"
