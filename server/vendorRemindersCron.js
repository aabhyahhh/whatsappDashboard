import cron from 'node-cron';
import moment from 'moment-timezone';
import { Message } from './models/Message.js';
import { User } from './models/User.js';
import { client, createFreshClient } from './twilio.js';

const TEMPLATE_SID = 'HXbdb716843483717790c45c951b71701e';

// Validate required environment variables
if (!process.env.TWILIO_PHONE_NUMBER) {
  console.error('❌ TWILIO_PHONE_NUMBER environment variable is not set');
  process.exit(1);
}

if (!client) {
  console.error('❌ Twilio client is not initialized');
  process.exit(1);
}

// Helper: Check if a location was received from user today
async function hasLocationToday(contactNumber) {
  const since = moment().tz('Asia/Kolkata').startOf('day').toDate();
  const messages = await Message.find({
    from: { $in: [contactNumber, `whatsapp:${contactNumber}`] },
    timestamp: { $gte: since },
    $or: [
      { 'location.latitude': { $exists: true } }, // Location shared
      { body: { $regex: /location|shared|updated/i } } // Text response about location
    ]
  });
  return messages.length > 0;
}

// Helper: Check if a reminder was sent today
async function hasReminderSentToday(contactNumber, reminderType) {
  const since = moment().tz('Asia/Kolkata').startOf('day').toDate();
  const messages = await Message.find({
    to: { $in: [contactNumber, `whatsapp:${contactNumber}`] },
    $or: [
      { body: TEMPLATE_SID }, // Exact template SID match
      { 'meta.reminderType': reminderType } // Meta data match
    ],
    timestamp: { $gte: since }
  });
  return messages.length > 0;
}

// Helper: Check if vendor responded to 15-min reminder
async function hasRespondedTo15MinReminder(contactNumber) {
  const since = moment().tz('Asia/Kolkata').startOf('day').toDate();
  
  // Check if 15-min reminder was sent today
  const reminderSent = await Message.findOne({
    to: { $in: [contactNumber, `whatsapp:${contactNumber}`] },
    'meta.reminderType': 'vendor_location_15min',
    timestamp: { $gte: since }
  }).sort({ timestamp: -1 });
  
  if (!reminderSent) return false;
  
  // Check if vendor responded after the reminder was sent
  const response = await Message.findOne({
    from: { $in: [contactNumber, `whatsapp:${contactNumber}`] },
    timestamp: { $gte: reminderSent.timestamp },
    $or: [
      { 'location.latitude': { $exists: true } }, // Location shared
      { body: { $regex: /location|shared|updated/i } } // Text response
    ]
  });
  
  return !!response;
}

const checkAndSendReminders = async () => {
    try {
        const now = moment().tz('Asia/Kolkata');
        console.log(`🕐 Running vendor reminders check at ${now.format('YYYY-MM-DD HH:mm:ss')}`);
        
        // Get a fresh Twilio client
        const twilioClient = createFreshClient();
        if (!twilioClient) {
          console.error('❌ Twilio client not available - skipping reminders');
          return;
        }
        
        const users = await User.find({ 
          whatsappConsent: true,
          contactNumber: { $exists: true, $ne: null },
          'operatingHours.openTime': { $exists: true, $ne: null }
        });
        
        console.log(`📊 Found ${users.length} vendors with WhatsApp consent and operating hours`);
        
        let sentCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        
        for (const user of users) {
          try {
            if (!user.operatingHours || !user.operatingHours.openTime) {
              console.log(`⏩ Skipping ${user.contactNumber} - no operating hours`);
              continue;
            }
            
            // Check if vendor is open today
            const today = now.day(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
            if (!user.operatingHours.days || !user.operatingHours.days.includes(today)) {
              console.log(`⏩ Skipping ${user.contactNumber} - not open today (day ${today})`);
              skippedCount++;
              continue;
            }
            
                        let diff;
            try {
              // Parse the open time with better error handling
              const openTime = moment.tz(user.operatingHours.openTime, ['h:mm A', 'HH:mm', 'H:mm'], 'Asia/Kolkata');
              
              if (!openTime.isValid()) {
                console.log(`⚠️ Invalid open time format for ${user.contactNumber}: ${user.operatingHours.openTime}`);
                skippedCount++;
                continue;
              }
              
              openTime.set({
                year: now.year(),
                month: now.month(),
                date: now.date(),
              });
              
              diff = openTime.diff(now, 'minutes');
              
              // Only log if the vendor is close to opening time (within 30 minutes)
              if (diff >= -10 && diff <= 30) {
                console.log(`📱 ${user.name} (${user.contactNumber}): Open at ${openTime.format('HH:mm')}, Diff: ${diff} minutes`);
              }
            } catch (timeError) {
              console.error(`❌ Error parsing time for ${user.contactNumber}:`, timeError.message);
              errorCount++;
              continue;
            }
            
            // Send reminder 15 minutes before opening time (expanded window: 14-16 minutes)
            if (diff >= 14 && diff <= 16) {
              if (!(await hasReminderSentToday(user.contactNumber, 'vendor_location_15min'))) {
                try {
                  const result = await twilioClient.messages.create({
                    from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
                    to: `whatsapp:${user.contactNumber}`,
                    contentSid: TEMPLATE_SID,
                    contentVariables: JSON.stringify({}),
                  });
                  
                  // Log the message with proper meta data
                  await Message.create({
                    from: process.env.TWILIO_PHONE_NUMBER,
                    to: user.contactNumber,
                    body: TEMPLATE_SID,
                    direction: 'outbound',
                    timestamp: new Date(),
                    meta: { 
                      minutesBefore: 15,
                      reminderType: 'vendor_location_15min',
                      vendorName: user.name,
                      openTime: user.operatingHours.openTime
                    },
                    twilioSid: result.sid
                  });
                  
                  console.log(`✅ Sent 15-min reminder to ${user.name} (${user.contactNumber}) - SID: ${result.sid}`);
                  sentCount++;
                } catch (error) {
                  console.error(`❌ Failed to send 15-min reminder to ${user.contactNumber}:`, error.message);
                  errorCount++;
                }
              } else {
                console.log(`⏩ Skipping 15-min reminder for ${user.contactNumber} - already sent today`);
                skippedCount++;
              }
            }

            // Send reminder at opening time (expanded window: -2 to +2 minutes) - only if vendor hasn't shared location yet
            if (diff >= -2 && diff <= 2) {
              // Check if vendor has already shared location today
              const hasLocation = await hasLocationToday(user.contactNumber);
              
              if (hasLocation) {
                console.log(`⏩ Skipping open-time reminder for ${user.contactNumber} - location already shared today`);
                skippedCount++;
              } else {
                // Check if vendor responded to 15-min reminder
                const respondedTo15Min = await hasRespondedTo15MinReminder(user.contactNumber);
                
                if (respondedTo15Min) {
                  console.log(`⏩ Skipping open-time reminder for ${user.contactNumber} - already responded to 15-min reminder`);
                  skippedCount++;
                } else if (!(await hasReminderSentToday(user.contactNumber, 'vendor_location_open'))) {
                  try {
                    const result = await twilioClient.messages.create({
                      from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
                      to: `whatsapp:${user.contactNumber}`,
                      contentSid: TEMPLATE_SID,
                      contentVariables: JSON.stringify({}),
                    });
                    
                    // Log the message with proper meta data
                    await Message.create({
                      from: process.env.TWILIO_PHONE_NUMBER,
                      to: user.contactNumber,
                      body: TEMPLATE_SID,
                      direction: 'outbound',
                      timestamp: new Date(),
                      meta: { 
                        minutesBefore: 0,
                        reminderType: 'vendor_location_open',
                        vendorName: user.name,
                        openTime: user.operatingHours.openTime,
                        followUp: true // Mark this as a follow-up reminder
                      },
                      twilioSid: result.sid
                    });
                    
                    console.log(`✅ Sent follow-up open-time reminder to ${user.name} (${user.contactNumber}) - SID: ${result.sid}`);
                    sentCount++;
                  } catch (error) {
                    console.error(`❌ Failed to send open-time reminder to ${user.contactNumber}:`, error.message);
                    errorCount++;
                  }
                } else {
                  console.log(`⏩ Skipping open-time reminder for ${user.contactNumber} - already sent today`);
                  skippedCount++;
                }
              }
            }
          } catch (userError) {
            console.error(`Error processing user ${user.contactNumber}:`, userError);
            errorCount++;
          }
        }
        
        console.log(`📊 Vendor reminders summary: ${sentCount} sent, ${skippedCount} skipped, ${errorCount} errors`);
        
        // Log summary to database for monitoring
        if (sentCount > 0 || errorCount > 0) {
          await Message.create({
            from: 'system',
            to: 'system',
            body: `Vendor reminder summary: ${sentCount} sent, ${skippedCount} skipped, ${errorCount} errors`,
            direction: 'outbound',
            timestamp: new Date(),
            meta: { 
              type: 'reminder_summary',
              sentCount,
              skippedCount,
              errorCount,
              checkTime: now.format('YYYY-MM-DD HH:mm:ss')
            }
          });
        }
        
      } catch (err) {
        console.error('❌ Error in WhatsApp reminder cron job:', err);
        
        // Log error to database
        try {
          await Message.create({
            from: 'system',
            to: 'system',
            body: `Vendor reminder cron error: ${err.message}`,
            direction: 'outbound',
            timestamp: new Date(),
            meta: { 
              type: 'reminder_error',
              error: err.message,
              stack: err.stack
            }
          });
        } catch (logError) {
          console.error('❌ Failed to log error to database:', logError.message);
        }
      }
};

// Schedule the cron job to run every 2 minutes for better coverage
cron.schedule('*/2 * * * *', checkAndSendReminders);

// Also schedule a daily backup check at 9 AM IST to ensure all vendors get reminded
cron.schedule('0 9 * * *', async () => {
  console.log('🔄 Running daily backup vendor reminder check at 9 AM IST');
  try {
    const now = moment().tz('Asia/Kolkata');
    const twilioClient = createFreshClient();
    
    if (!twilioClient) {
      console.error('❌ Twilio client not available for backup check');
      return;
    }
    
    const users = await User.find({ 
      whatsappConsent: true,
      contactNumber: { $exists: true, $ne: null }
    });
    
    console.log(`📊 Backup check: Found ${users.length} vendors with WhatsApp consent`);
    
    let sentCount = 0;
    let skippedCount = 0;
    
    for (const user of users) {
      // Check if vendor has already shared location today
      const hasLocation = await hasLocationToday(user.contactNumber);
      
      if (hasLocation) {
        console.log(`⏩ Skipping backup reminder for ${user.contactNumber} - location already shared today`);
        skippedCount++;
        continue;
      }
      
      // Check if vendor responded to any reminder today
      const respondedTo15Min = await hasRespondedTo15MinReminder(user.contactNumber);
      
      if (respondedTo15Min) {
        console.log(`⏩ Skipping backup reminder for ${user.contactNumber} - already responded to 15-min reminder`);
        skippedCount++;
        continue;
      }
      
      // Check if any reminder was sent today
      const hasReminder = await hasReminderSentToday(user.contactNumber, 'vendor_location_15min') || 
                          await hasReminderSentToday(user.contactNumber, 'vendor_location_open');
      
      if (hasReminder) {
        console.log(`⏩ Skipping backup reminder for ${user.contactNumber} - reminder already sent today`);
        skippedCount++;
        continue;
      }
      
      // Send backup reminder
      try {
        const result = await twilioClient.messages.create({
          from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
          to: `whatsapp:${user.contactNumber}`,
          contentSid: TEMPLATE_SID,
          contentVariables: JSON.stringify({}),
        });
        
        await Message.create({
          from: process.env.TWILIO_PHONE_NUMBER,
          to: user.contactNumber,
          body: TEMPLATE_SID,
          direction: 'outbound',
          timestamp: new Date(),
          meta: { 
            reminderType: 'vendor_location_backup',
            vendorName: user.name,
            backupCheck: true
          },
          twilioSid: result.sid
        });
        
        console.log(`✅ Sent backup reminder to ${user.name} (${user.contactNumber}) - SID: ${result.sid}`);
        sentCount++;
      } catch (error) {
        console.error(`❌ Failed to send backup reminder to ${user.contactNumber}:`, error.message);
      }
    }
    
    console.log(`📊 Backup reminder summary: ${sentCount} sent, ${skippedCount} skipped`);
    
  } catch (err) {
    console.error('❌ Error in backup vendor reminder check:', err);
  }
});

console.log('✅ Vendor reminder cron job started and scheduled to run every 2 minutes with daily backup at 9 AM IST.');

export { checkAndSendReminders }; 