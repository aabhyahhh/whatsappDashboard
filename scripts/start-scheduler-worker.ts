#!/usr/bin/env tsx

/**
 * Standalone Scheduler Worker
 * 
 * This script runs the scheduler as a separate worker process.
 * Use this for production deployments to ensure the scheduler runs independently
 * from the web server.
 * 
 * Usage:
 *   Development: tsx scripts/start-scheduler-worker.ts
 *   Production: node dist/scripts/start-scheduler-worker.js
 *   PM2: pm2 start dist/scripts/start-scheduler-worker.js --name lk-scheduler
 */

import 'dotenv/config';

// Set timezone before any imports
process.env.TZ = process.env.TZ || 'Asia/Kolkata';

console.log('🚀 Starting WhatsApp Scheduler Worker...');
console.log(`📅 Timezone: ${process.env.TZ}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

// Import the scheduler (this will start the cron jobs)
import '../server/scheduler/metaSchedulerFixed.ts';

// Keep the process alive
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down scheduler worker...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down scheduler worker...');
  process.exit(0);
});

// Log startup completion
console.log('✅ Scheduler worker started successfully');
console.log('📊 Monitoring for:');
console.log('   - Location update reminders (every minute)');
console.log('   - Inactive vendor support prompts (daily at 10 AM IST)');
console.log('   - Heartbeat logs (every 5 minutes)');
console.log('💡 Use Ctrl+C to stop the worker');
