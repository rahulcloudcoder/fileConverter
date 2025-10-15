// scripts/check-dependencies.js
const { execSync } = require('child_process');
const { platform } = require('os');
const { existsSync } = require('fs');

console.log('🔍 Checking dependencies...\n');

function checkPandocUniversal() {
  console.log('📄 Checking Pandoc (universal detection)...');
  
  const possiblePaths = [
    // Render.com path
    '/usr/local/bin/pandoc',
    // Windows paths
    'C:\\Program Files\\Pandoc\\pandoc.exe',
    'C:\\Program Files (x86)\\Pandoc\\pandoc.exe',
    `${process.env.LOCALAPPDATA}\\Pandoc\\pandoc.exe`,
    `${process.env.APPDATA}\\Pandoc\\pandoc.exe`,
    // Linux paths
    '/usr/bin/pandoc',
    '/bin/pandoc',
    // macOS paths
    '/usr/local/bin/pandoc',
    '/opt/homebrew/bin/pandoc',
    // Fallback
    'pandoc'
  ];

  let foundPath = null;
  let version = null;

  // Check each possible path
  for (const path of possiblePaths) {
    if (existsSync(path)) {
      try {
        const output = execSync(`"${path}" --version`, { encoding: 'utf8' });
        version = output.split('\n')[0];
        foundPath = path;
        console.log(`✅ Pandoc: ${version}`);
        console.log(`   Location: ${path}`);
        return true;
      } catch (error) {
        // Continue to next path
      }
    }
  }

  // Try PATH as fallback
  try {
    const output = execSync('pandoc --version', { encoding: 'utf8' });
    version = output.split('\n')[0];
    console.log(`✅ Pandoc: ${version}`);
    console.log(`   Location: PATH`);
    return true;
  } catch (error) {
    console.log('❌ Pandoc: Not installed or not found in common locations');
    console.log('💡 The app will use fallback methods for conversions');
    return false;
  }
}

function checkDependency(name, command) {
  try {
    const output = execSync(command, { encoding: 'utf8' }).trim();
    const version = output.split('\n')[0];
    console.log(`✅ ${name}: ${version}`);
    return true;
  } catch (error) {
    console.log(`❌ ${name}: Not installed`);
    return false;
  }
}

// Check dependencies
const nodeOk = checkDependency('Node.js', 'node --version');
const npmOk = checkDependency('npm', 'npm --version');
const pandocOk = checkPandocUniversal();

console.log('\n' + '='.repeat(60));
if (nodeOk && npmOk) {
  if (pandocOk) {
    console.log('🎉 All dependencies are installed and ready!');
    console.log('🚀 The app will use Pandoc for enhanced conversions');
  } else {
    console.log('⚠️ Pandoc not found, but the app will work with fallbacks');
    console.log('💡 For better conversions, install Pandoc:');
    
    if (platform() === 'win32') {
      console.log('   Run in PowerShell as Admin: winget install JohnMacFarlane.Pandoc');
    } else if (platform() === 'darwin') {
      console.log('   Run: brew install pandoc');
    } else {
      console.log('   Run: sudo apt-get install pandoc');
    }
  }
  console.log('🚀 Run "npm run start:dev" to start the server');
} else {
  console.log('❌ Required dependencies are missing');
  console.log('💡 Run "npm run setup-local" to install missing dependencies');
}
console.log('='.repeat(60));