const cron = require('node-cron');
const { exec } = require('child_process');
const path = require('path');

// Configuration
const CAMPAIGN_DURATION_DAYS = 7;
const MESSAGE_INTERVAL_HOURS = 24;

console.log('🚀 WEEKLY VENDOR MESSAGE CRON JOB');
console.log('==================================');
console.log(`📅 Campaign Duration: ${CAMPAIGN_DURATION_DAYS} days`);
console.log(`⏰ Message Interval: Every ${MESSAGE_INTERVAL_HOURS} hours`);
console.log(`📋 Template SID: HX5990e2eb62bbb374ac865ab6195fcfbe`);
console.log(`🕐 Started at: ${new Date().toLocaleString()}`);

// Calculate end date
const endDate = new Date();
endDate.setDate(endDate.getDate() + CAMPAIGN_DURATION_DAYS);
console.log(`📅 Campaign ends: ${endDate.toLocaleString()}`);

let messageCount = 0;
const maxMessages = CAMPAIGN_DURATION_DAYS;

// Function to run the message campaign
function runMessageCampaign() {
  const currentDate = new Date();
  
  if (currentDate >= endDate) {
    console.log('🎉 Campaign completed! Stopping cron job.');
    process.exit(0);
  }
  
  messageCount++;
  console.log(`\n📤 RUNNING MESSAGE CAMPAIGN #${messageCount}/${maxMessages}`);
  console.log(`📅 Date: ${currentDate.toLocaleString()}`);
  console.log('==========================================');
  
  // Run the TypeScript script
  const scriptPath = path.join(__dirname, 'send-weekly-message-to-vendors.ts');
  const command = `npx tsx "${scriptPath}"`;
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Error running campaign: ${error.message}`);
      return;
    }
    
    if (stderr) {
      console.error(`⚠️  Campaign stderr: ${stderr}`);
    }
    
    console.log(`✅ Campaign #${messageCount} completed successfully`);
    console.log('📋 Output:');
    console.log(stdout);
    
    // Check if campaign should continue
    if (messageCount >= maxMessages) {
      console.log('🎉 All messages sent! Campaign completed.');
      process.exit(0);
    }
  });
}

// Schedule the cron job to run every 24 hours
// Cron format: 0 */24 * * * (every 24 hours at minute 0)
// For testing, you can use: '*/5 * * * *' (every 5 minutes)
const cronSchedule = '0 */24 * * *'; // Every 24 hours at midnight

console.log(`⏰ Scheduling cron job: ${cronSchedule}`);
console.log('🔄 Cron job will run every 24 hours until campaign ends...\n');

// Start the cron job
const job = cron.schedule(cronSchedule, () => {
  runMessageCampaign();
}, {
  scheduled: false,
  timezone: "Asia/Kolkata" // Indian timezone
});

// Run the first campaign immediately
console.log('🚀 Running first campaign immediately...');
runMessageCampaign();

// Start the scheduled job
job.start();

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT. Stopping cron job...');
  job.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM. Stopping cron job...');
  job.stop();
  process.exit(0);
});

console.log('✅ Cron job started successfully!');
console.log('💡 Press Ctrl+C to stop the campaign early.');
