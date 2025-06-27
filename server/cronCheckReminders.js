// cronCheckReminders.js
// HOW TO USE:
// 1. Install dependencies: npm install node-cron node-fetch
// 2. Run this script with: node server/cronCheckReminders.js
// 3. This will make a GET request to the endpoint every 15 minutes.

import cron from 'node-cron';
import fetch from 'node-fetch';

// Schedule the job to run every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  try {
    const response = await fetch('https://whatsappdashboard.onrender.com/api/vendor/check-vendor-reminders');
    const text = await response.text();
    console.log(`[${new Date().toISOString()}] Request sent. Status: ${response.status}. Response: ${text}`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error making request:`, err);
  }
});

console.log('Cron job started: Will check vendor reminders every 15 minutes.'); 