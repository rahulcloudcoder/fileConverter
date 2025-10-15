// scripts/fix-pandoc-path.js
const { execSync, spawn } = require('child_process');
const { existsSync } = require('fs');
const { join } = require('path');

console.log('🔧 Fixing Pandoc PATH issues on Windows...');

// Common Pandoc installation paths on Windows
const possiblePaths = [
  'C:\\Program Files\\Pandoc\\pandoc.exe',
  'C:\\Program Files (x86)\\Pandoc\\pandoc.exe', 
  join(process.env.LOCALAPPDATA, 'Pandoc\\pandoc.exe'),
  join(process.env.APPDATA, 'Pandoc\\pandoc.exe'),
  'C:\\Users\\' + process.env.USERNAME + '\\AppData\\Local\\Pandoc\\pandoc.exe'
];

function findPandocPath() {
  console.log('🔍 Searching for Pandoc installation...');
  
  for (const path of possiblePaths) {
    if (existsSync(path)) {
      console.log(`✅ Found Pandoc at: ${path}`);
      return path;
    }
  }
  
  // Try using where command
  try {
    const whereResult = execSync('where pandoc', { encoding: 'utf8' }).trim();
    if (whereResult && existsSync(whereResult.split('\r\n')[0])) {
      console.log(`✅ Found Pandoc via where command: ${whereResult}`);
      return whereResult.split('\r\n')[0];
    }
  } catch (error) {
    // where command failed, continue
  }
  
  return null;
}

function addToSessionPath(pandocPath) {
  const pandocDir = pandocPath.replace('pandoc.exe', '');
  console.log(`📁 Adding to PATH: ${pandocDir}`);
  
  // Add to current session PATH
  process.env.Path += `;${pandocDir}`;
  
  console.log('✅ Added Pandoc to current session PATH');
  return true;
}

function testPandoc() {
  try {
    const version = execSync('pandoc --version', { encoding: 'utf8' }).split('\n')[0];
    console.log(`🎉 Pandoc is now accessible: ${version}`);
    return true;
  } catch (error) {
    console.log('❌ Pandoc still not accessible in PATH');
    return false;
  }
}

// Main execution
const pandocPath = findPandocPath();

if (!pandocPath) {
  console.log('❌ Pandoc not found in common locations.');
  console.log('💡 Try reinstalling Pandoc manually from:');
  console.log('   https://github.com/jgm/pandoc/releases/');
  console.log('   Make sure to check "Add to PATH" during installation');
  process.exit(1);
}

// Add to PATH and test
addToSessionPath(pandocPath);
const success = testPandoc();

if (success) {
  console.log('\n🎉 Pandoc PATH issue fixed!');
  console.log('💡 Note: This fix is for the current terminal session only.');
  console.log('   For permanent fix, add Pandoc to system PATH environment variable.');
} else {
  console.log('\n⚠️ Could not automatically fix PATH.');
  console.log('💡 You can still use the app with fallback methods.');
}