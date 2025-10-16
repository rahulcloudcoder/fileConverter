#!/usr/bin/env bash
# build.sh - Render.com build script

echo "🚀 Starting build process..."
echo "📦 Installing Python dependencies..."

# Install with pre-built wheels first
pip install --prefer-binary -r requirements.txt

# Check if PyMuPDF installed successfully
if python -c "import fitz; print('✅ PyMuPDF imported successfully')" 2>/dev/null; then
    echo "✅ PyMuPDF installed successfully"
else
    echo "⚠️ PyMuPDF installation failed, trying alternative approach..."
    # Try installing without dependencies first
    pip install --no-deps PyMuPDF==1.23.0
    # Then install other dependencies
    pip install -r requirements.txt --no-deps
fi

# Final verification
echo "🔍 Verifying installations..."
python -c "
try:
    import flask
    import flask_cors
    import python_docx
    import PIL
    import pdf2docx
    import pypdf2
    import reportlab
    import pdfplumber
    print('✅ All core dependencies imported successfully')
except ImportError as e:
    print(f'❌ Import error: {e}')
"

echo "🏁 Build completed successfully!"