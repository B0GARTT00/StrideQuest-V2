#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read app.json
const appJsonPath = path.join(__dirname, '..', 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// Get current version
const currentVersion = appJson.expo.version;
const [major, minor, patch] = currentVersion.split('.').map(Number);

// Get bump type from command line argument (default to patch)
const bumpType = process.argv[2] || 'patch';

let newVersion;
switch (bumpType) {
  case 'major':
    newVersion = `${major + 1}.0.0`;
    break;
  case 'minor':
    newVersion = `${major}.${minor + 1}.0`;
    break;
  case 'patch':
  default:
    newVersion = `${major}.${minor}.${patch + 1}`;
    break;
}

// Update version in app.json
appJson.expo.version = newVersion;

// Write back to app.json
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf8');

console.log(`✅ Version bumped from ${currentVersion} to ${newVersion}`);
console.log(`📝 Updated app.json`);
