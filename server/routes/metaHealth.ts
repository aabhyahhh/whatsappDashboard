import { Router } from 'express';
import { Message } from '../models/Message.js';
import { User } from '../models/User.js';
import SupportCallLog from '../models/SupportCallLog.js';
import LoanReplyLog from '../models/LoanReplyLog.js';
import SupportCallReminderLog from '../models/SupportCallReminderLog.js';

const router = Router();

// Meta WhatsApp message health endpoint
router.get('/meta-health', async (req, res) => {
  try {
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    
    // Get all outbound messages in the last 48 hours
    const outboundMessages = await Message.find({
      direction: 'outbound',
      timestamp: { $gte: fortyEightHoursAgo }
    }).sort({ timestamp: -1 });
    
    // Define Meta message types
    const metaMessageTypes = {
      'Meta Location Update': 'update_location_cron',
      'Meta Support Prompt': 'inactive_vendors_support_prompt',
      'Meta Support Confirmation': 'inactive_vendors_reply_to_yes_support_call',
      'Meta Greeting Response': 'default_hi_and_loan_prompt',
      'Meta Loan Prompt': 'reply_to_default_hi_loan_ready_to_verify_aadhar_or_not',
      'Meta Welcome Message': 'welcome_message_for_onboarding'
    };
    
    // Categorize Meta messages
    const metaCategorizedMessages = {};
    const metaUnknownMessages = [];
    
    for (const message of outboundMessages) {
      let categorized = false;
      
      // Check if message is from Meta integration
      if (message.from === process.env.META_PHONE_NUMBER_ID || 
          (message.meta && message.meta.type && message.meta.type.includes('meta'))) {
        
        // Check message body for template names
        for (const [type, templateName] of Object.entries(metaMessageTypes)) {
          if (message.body === templateName || 
              (message.meta && message.meta.template === templateName)) {
            if (!metaCategorizedMessages[type]) {
              metaCategorizedMessages[type] = [];
            }
            metaCategorizedMessages[type].push({
              to: message.to,
              timestamp: message.timestamp,
              body: message.body,
              meta: message.meta
            });
            categorized = true;
            break;
          }
        }
        
        if (!categorized) {
          metaUnknownMessages.push({
            to: message.to,
            timestamp: message.timestamp,
            body: message.body,
            meta: message.meta
          });
        }
      }
    }
    
    // Get Meta-specific logs
    const metaSupportCallLogs = await SupportCallLog.find({
      timestamp: { $gte: fortyEightHoursAgo }
    }).sort({ timestamp: -1 });
    
    const metaLoanReplyLogs = await LoanReplyLog.find({
      timestamp: { $gte: fortyEightHoursAgo }
    }).sort({ timestamp: -1 });
    
    // Calculate Meta statistics
    const metaStats = {
      totalMetaMessages: Object.values(metaCategorizedMessages).reduce((sum, messages: any) => sum + messages.length, 0),
      totalSupportCalls: metaSupportCallLogs.length,
      totalLoanReplies: metaLoanReplyLogs.length,
      messageTypes: Object.keys(metaCategorizedMessages).map(type => ({
        type,
        count: metaCategorizedMessages[type]?.length || 0
      })),
      unknownMessagesCount: metaUnknownMessages.length
    };
    
    res.json({
      stats: metaStats,
      categorizedMessages: metaCategorizedMessages,
      unknownMessages: metaUnknownMessages.slice(0, 10),
      supportCallLogs: metaSupportCallLogs.slice(0, 10),
      loanReplyLogs: metaLoanReplyLogs.slice(0, 10),
      timeRange: {
        from: fortyEightHoursAgo,
        to: new Date()
      }
    });
    
  } catch (error) {
    console.error('Error fetching Meta message health data:', error);
    res.status(500).json({ error: 'Failed to fetch Meta message health data' });
  }
});

// Meta support calls endpoint
router.get('/meta-support-calls', async (req, res) => {
  try {
    const supportCalls = await SupportCallLog.find({}).sort({ timestamp: -1 });
    res.json(supportCalls);
  } catch (error) {
    console.error('Error fetching Meta support calls:', error);
    res.status(500).json({ error: 'Failed to fetch Meta support calls' });
  }
});

// Meta loan replies endpoint
router.get('/meta-loan-replies', async (req, res) => {
  try {
    const loanReplies = await LoanReplyLog.find({}).sort({ timestamp: -1 });
    res.json(loanReplies);
  } catch (error) {
    console.error('Error fetching Meta loan replies:', error);
    res.status(500).json({ error: 'Failed to fetch Meta loan replies' });
  }
});

// Complete Meta support call
router.patch('/meta-support-calls/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { completedBy } = req.body;
    
    const supportCall = await SupportCallLog.findByIdAndUpdate(
      id,
      {
        completed: true,
        completedBy: completedBy || 'Unknown',
        completedAt: new Date()
      },
      { new: true }
    );
    
    if (!supportCall) {
      return res.status(404).json({ error: 'Support call not found' });
    }
    
    res.json(supportCall);
  } catch (error) {
    console.error('Error completing Meta support call:', error);
    res.status(500).json({ error: 'Failed to complete Meta support call' });
  }
});

export default router;
