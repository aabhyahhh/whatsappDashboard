// Test script for location update reminders
import { checkAndSendReminders } from '../server/vendorRemindersCron.js';

console.log('🧪 Testing location update reminder functionality...');
console.log('This will check all vendors and show what reminders would be sent');
console.log('');

// Run the reminder check
await checkAndSendReminders();

console.log('');
console.log('✅ Test completed!');
