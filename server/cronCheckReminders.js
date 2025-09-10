// cronCheckReminders.js
// HOW TO USE:
// 1. Install dependencies: npm install node-cron node-fetch
// 2. Run this script with: node server/cronCheckReminders.js
// 3. This will make a GET request to the endpoint every 5 minutes as a backup system.

import cron from 'node-cron';
import fetch from 'node-fetch';

// Schedule the job to run every 5 minutes for better reliability
cron.schedule('*/5 * * * *', async () => {
  try {
    console.log(`[${new Date().toISOString()}] 🔄 Running backup vendor reminder check...`);
    const response = await fetch('https://whatsappdashboard-1.onrender.com/api/vendor/check-vendor-reminders');
    const text = await response.text();
    console.log(`[${new Date().toISOString()}] ✅ Request completed. Status: ${response.status}. Response: ${text}`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ❌ Error making request:`, err);
  }
});

// Also run a daily health check at 8 AM IST
cron.schedule('30 8 * * *', async () => {
  try {
    console.log(`[${new Date().toISOString()}] 🏥 Running daily health check for vendor reminders...`);
    const response = await fetch('https://whatsappdashboard-1.onrender.com/api/vendor/check-vendor-reminders');
    const text = await response.text();
    console.log(`[${new Date().toISOString()}] ✅ Daily health check completed. Status: ${response.status}. Response: ${text}`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ❌ Daily health check failed:`, err);
  }
});

console.log('✅ Backup cron job started: Will check vendor reminders every 5 minutes with daily health check at 8:30 AM IST.'); 