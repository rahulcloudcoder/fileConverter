// scripts/setup-local.js
const { execSync } = require('child_process');
const { platform } = require('os');

console.log('🔧 Setting up local development environment...');

function runCommand(command, description) {
  try {
    console.log(`📝 ${description}`);
    execSync(command, { stdio: 'inherit', shell: true });
    console.log(`✅ ${description} - Success`);
    return true;
  } catch (error) {
    console.log(`❌ ${description} - Failed: ${error.message}`);
    return false;
  }
}

// Check Node.js
console.log('\n📦 Checking Node.js...');
try {
  const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  console.log(`✅ Node.js: ${nodeVersion}`);
  console.log(`✅ npm: ${npmVersion}`);
} catch (error) {
  console.log('❌ Node.js is not installed. Please install Node.js from https://nodejs.org/');
  process.exit(1);
}

// Check Pandoc with universal detection
console.log('\n📄 Checking Pandoc (universal detection)...');
try {
  execSync('pandoc --version', { encoding: 'utf8' });
  console.log('✅ Pandoc is available in PATH');
} catch (error) {
  console.log('❌ Pandoc not found in PATH.');
  
  const isWindows = platform() === 'win32';
  const isMac = platform() === 'darwin';
  
  if (isWindows) {
    console.log('🪟 Installing Pandoc on Windows...');
    
    // Try winget first (Windows 11/10)
    const wingetSuccess = runCommand(
      'winget install JohnMacFarlane.Pandoc --silent --accept-package-agreements',
      'Installing Pandoc via Winget'
    );
    
    if (!wingetSuccess) {
      console.log('💡 Winget failed. The app will use fallback methods.');
      console.log('   For better conversions, install Pandoc manually from:');
      console.log('   https://github.com/jgm/pandoc/releases/');
    }
    
  } else if (isMac) {
    console.log('🍎 Installing Pandoc on macOS...');
    runCommand('brew install pandoc', 'Installing Pandoc via Homebrew');
    
  } else {
    console.log('🐧 Installing Pandoc on Linux...');
    runCommand('sudo apt-get update && sudo apt-get install -y pandoc', 'Installing Pandoc via apt');
  }
}

console.log('\n🎉 Local setup completed!');
console.log('💡 The app uses universal Pandoc detection - no manual PATH setup needed');
console.log('🚀 Run "npm run check-deps" to verify all dependencies');
console.log('🚀 Run "npm run start:dev" to start development server');