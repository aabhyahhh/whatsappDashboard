#!/usr/bin/env node

/**
 * Diagnostic script to check API URL configuration issues
 * Run this script to help diagnose why the frontend is still using localhost
 */

console.log('🔍 API URL Configuration Diagnostic');
console.log('==================================');

// Check environment variables
console.log('\n📋 Environment Variables:');
console.log('VITE_API_BASE_URL:', process.env.VITE_API_BASE_URL || 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV || 'NOT SET');

// Check if we're in a build environment
console.log('\n🏗️ Build Environment Check:');
console.log('Current working directory:', process.cwd());
console.log('Process platform:', process.platform);

// Check for common issues
console.log('\n⚠️ Common Issues to Check:');
console.log('1. Make sure VITE_API_BASE_URL is set in Render dashboard');
console.log('2. Clear browser cache completely (Ctrl+Shift+Delete)');
console.log('3. Try incognito/private browsing mode');
console.log('4. Check if you\'re accessing the correct URL');
console.log('5. Verify Render deployment is complete');

// Check package.json scripts
import fs from 'fs';
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log('\n📦 Build Scripts:');
  console.log('Build command:', packageJson.scripts.build);
} catch (error) {
  console.log('\n❌ Could not read package.json');
}

console.log('\n🔧 Immediate Actions to Try:');
console.log('1. Go to Render dashboard and manually redeploy');
console.log('2. Check Render logs for build errors');
console.log('3. Verify environment variables in Render dashboard');
console.log('4. Clear browser cache and try incognito mode');
console.log('5. Wait 5-10 minutes for deployment to complete');

console.log('\n✅ Expected Result After Fix:');
console.log('- Browser console should show no localhost errors');
console.log('- API calls should go to https://whatsappdashboard-1.onrender.com');
console.log('- Login page should work without "Load failed" errors');
