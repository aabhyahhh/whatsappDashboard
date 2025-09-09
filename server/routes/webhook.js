import { Router } from 'express';
import LoanReplyLog from '../models/LoanReplyLog.js';
import SupportCallLog from '../models/SupportCallLog.js';
import User from '../models/User.js';
import Message from '../models/Message.js';
import { sendTemplateMessage } from '../meta.js';

const router = Router();

// Legacy Twilio webhook - now deprecated
// All WhatsApp functionality has been moved to Meta WhatsApp API
// This endpoint is kept for backward compatibility but does nothing

router.post('/', (req, res) => {
  console.log('⚠️ Legacy Twilio webhook called - functionality moved to Meta WhatsApp API');
  console.log('📡 Use /api/webhook for Meta WhatsApp webhooks instead');
  
  res.status(200).json({ 
    message: 'Legacy webhook - functionality moved to Meta WhatsApp API',
    redirect: 'Use /api/webhook for Meta WhatsApp webhooks'
  });
});

router.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Legacy Twilio webhook endpoint - deprecated',
    note: 'All WhatsApp functionality now uses Meta WhatsApp API at /api/webhook'
  });
});

// Loan replies endpoint for backward compatibility
router.get('/loan-replies', async (req, res) => {
    try {
    console.log('📋 Fetching loan reply logs...');
        const loanReplies = await LoanReplyLog.find({}).sort({ timestamp: -1 });
    console.log(`✅ Found ${loanReplies.length} loan reply logs`);
        res.json(loanReplies);
    } catch (error) {
    console.error('❌ Error fetching loan reply logs:', error);
    res.status(500).json({ error: 'Failed to fetch loan reply logs' });
  }
});

// Support calls endpoint for backward compatibility
router.get('/support-calls', async (req, res) => {
  try {
    console.log('📞 Fetching support call logs...');
    const supportCalls = await SupportCallLog.find({}).sort({ timestamp: -1 });
    console.log(`✅ Found ${supportCalls.length} support call logs`);
    res.json(supportCalls);
    } catch (error) {
    console.error('❌ Error fetching support call logs:', error);
    res.status(500).json({ error: 'Failed to fetch support call logs' });
    }
});

// Bulk messaging endpoint to send location update to all users
router.post('/send-location-update-to-all', async (req, res) => {
  try {
    console.log('🚀 Starting bulk location update message sending...');
    
    // Check Meta credentials
    if (!process.env.META_ACCESS_TOKEN || !process.env.META_PHONE_NUMBER_ID) {
      console.log('❌ Meta credentials not configured');
      return res.status(500).json({ 
        error: 'Meta WhatsApp API credentials not configured',
        success: false 
      });
    }
    
    // Get all users with WhatsApp consent and contact numbers
    const users = await User.find({ 
      whatsappConsent: true,
      contactNumber: { $exists: true, $nin: [null, ''] }
    }).select('_id name contactNumber').lean();
    
    console.log(`📊 Found ${users.length} users with WhatsApp consent and contact numbers`);
    
    if (users.length === 0) {
      return res.json({ 
        message: 'No users found to send messages to',
                    success: true, 
        sentCount: 0,
        errorCount: 0,
        totalUsers: 0
      });
    }
    
    let sentCount = 0;
    let errorCount = 0;
    const errors = [];
    const results = [];
    
    // Send messages to all users
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      console.log(`[${i + 1}/${users.length}] Processing ${user.name}...`);
      
      try {
        const result = await sendTemplateMessage(user.contactNumber, 'update_location_cron_util');
        
        if (result && result.success) {
          // Save the message to database
          await Message.create({
            from: process.env.META_PHONE_NUMBER_ID,
            to: user.contactNumber,
            body: 'Template: update_location_cron_util',
            direction: 'outbound',
            timestamp: new Date(),
            meta: {
              reminderType: 'manual_location_update',
              vendorName: user.name,
              template: 'update_location_cron_util',
              success: true
            },
            messageId: result.messageId
          });
          
          sentCount++;
          results.push({
            user: user.name,
            phone: user.contactNumber,
            status: 'success',
            messageId: result.messageId
          });
          
          console.log(`✅ Sent successfully to ${user.name} - ID: ${result.messageId}`);
        } else {
          errorCount++;
          const errorMsg = result?.error || 'Unknown error';
          errors.push(`${user.name} (${user.contactNumber}): ${errorMsg}`);
          results.push({
            user: user.name,
            phone: user.contactNumber,
            status: 'error',
            error: errorMsg
          });
          
          console.error(`❌ Failed to send to ${user.name}: ${errorMsg}`);
        }
      } catch (error) {
        errorCount++;
        const errorMsg = error.message || 'Unknown error';
        errors.push(`${user.name} (${user.contactNumber}): ${errorMsg}`);
        results.push({
          user: user.name,
          phone: user.contactNumber,
          status: 'error',
          error: errorMsg
        });
        
        console.error(`❌ Error sending to ${user.name}:`, errorMsg);
      }
      
      // Add a small delay to avoid rate limiting
      if (i < users.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
    }
    
    // Summary
    console.log(`📈 SUMMARY: ✅ ${sentCount} sent, ❌ ${errorCount} failed, 📊 ${users.length} total`);
        
        res.json({
      message: 'Bulk location update sending completed',
      success: true,
      sentCount,
      errorCount,
      totalUsers: users.length,
      errors: errors.slice(0, 10), // Limit errors in response
      results: results.slice(0, 20) // Limit results in response
        });
        
    } catch (error) {
    console.error('❌ Error during bulk sending:', error);
    res.status(500).json({ 
      error: 'Failed to send bulk messages',
      details: error.message,
      success: false 
    });
    }
});

export default router;
