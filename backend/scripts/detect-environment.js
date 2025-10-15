// scripts/detect-environment.js
const { execSync } = require('child_process');
const { platform, arch } = require('os');
const { existsSync } = require('fs');

console.log('🔍 Detecting environment...');
console.log(`Platform: ${platform()}`);
console.log(`Architecture: ${arch()}`);

const isRender = process.env.RENDER === 'true' || process.env.NODE_ENV === 'production';
const isWindows = platform() === 'win32';
const isLinux = platform() === 'linux';
const isMac = platform() === 'darwin';

console.log(`Environment: ${isRender ? 'Render.com' : isWindows ? 'Windows' : isMac ? 'macOS' : 'Linux'}`);

// Test Pandoc detection (same logic as in the service)
function findPandocPath() {
  const possiblePaths = [
    '/usr/local/bin/pandoc',
    'C:\\Program Files\\Pandoc\\pandoc.exe',
    'C:\\Program Files (x86)\\Pandoc\\pandoc.exe',
    `${process.env.LOCALAPPDATA}\\Pandoc\\pandoc.exe`,
    `${process.env.APPDATA}\\Pandoc\\pandoc.exe`,
    '/usr/bin/pandoc',
    '/bin/pandoc',
    '/usr/local/bin/pandoc',
    '/opt/homebrew/bin/pandoc',
    'pandoc'
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }
  return null;
}

if (isRender) {
  console.log('🚀 Setting up for Render.com...');
  try {
    console.log('📥 Installing Pandoc for Render.com...');
    execSync('curl -L https://github.com/jgm/pandoc/releases/download/3.1.9/pandoc-3.1.9-linux-amd64.tar.gz | tar xvz --strip-components=1 -C /tmp/', { stdio: 'inherit' });
    execSync('mv /tmp/bin/pandoc /usr/local/bin/', { stdio: 'inherit' });
    
    // Verify the exact path we expect
    const pandocPath = '/usr/local/bin/pandoc';
    if (existsSync(pandocPath)) {
      const version = execSync(`"${pandocPath}" --version`, { encoding: 'utf8' }).split('\n')[0];
      console.log(`✅ Pandoc installed: ${version}`);
      console.log(`✅ Pandoc location: ${pandocPath}`);
    } else {
      console.log('⚠️ Pandoc installation may have issues');
    }
  } catch (error) {
    console.log('⚠️ Pandoc installation failed, but continuing with fallbacks...');
  }
} else {
  console.log('💻 Local environment detected');
  const pandocPath = findPandocPath();
  if (pandocPath) {
    try {
      const version = execSync(`"${pandocPath}" --version`, { encoding: 'utf8' }).split('\n')[0];
      console.log(`✅ Pandoc detected: ${version}`);
      console.log(`✅ Pandoc location: ${pandocPath}`);
    } catch (error) {
      console.log('⚠️ Pandoc found but not accessible');
    }
  } else {
    console.log('ℹ️ Pandoc not found - app will use fallback methods');
  }
}

console.log('\n✅ Environment detection completed!');
console.log('🚀 The app will auto-detect Pandoc on both local and Render.com');
console.log('📁 Using universal path detection in RenderConverterService');