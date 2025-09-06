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
    
    // Define Meta message types with multiple detection patterns
    const metaMessageTypes = {
      'Meta Location Update': {
        bodyPatterns: ['Template: update_location_cron', 'update_location_cron_util'],
        metaPatterns: ['vendor_location_open', 'vendor_location_15min', 'update_location_cron'],
        templateNames: ['update_location_cron_util', 'update_location_cron']
      },
      'Meta Support Prompt': {
        bodyPatterns: ['Template: inactive_vendors_support_prompt_util', 'inactive_vendors_support_prompt_util'],
        metaPatterns: ['support_prompt', 'inactive_vendors_support_prompt'],
        templateNames: ['inactive_vendors_support_prompt_util']
      },
      'Meta Support Confirmation': {
        bodyPatterns: ['Support request received', 'inactive_vendors_reply_to_yes_support_call_util'],
        metaPatterns: ['support_confirmation', 'inactive_vendors_reply_to_yes_support_call'],
        templateNames: ['inactive_vendors_reply_to_yes_support_call_util']
      },
      'Meta Greeting Response': {
        bodyPatterns: ['Namaste from Laari Khojo', 'default_hi_and_loan_prompt'],
        metaPatterns: ['greeting_response', 'default_hi_and_loan_prompt'],
        templateNames: ['default_hi_and_loan_prompt']
      },
      'Meta Loan Prompt': {
        bodyPatterns: ['Loan support response sent', 'reply_to_default_hi_loan_ready_to_verify_aadhar_or_not_util'],
        metaPatterns: ['loan_response', 'reply_to_default_hi_loan_ready_to_verify_aadhar_or_not'],
        templateNames: ['reply_to_default_hi_loan_ready_to_verify_aadhar_or_not_util']
      },
      'Meta Welcome Message': {
        bodyPatterns: ['welcome_message_for_onboarding_util'],
        metaPatterns: ['welcome_message_for_onboarding'],
        templateNames: ['welcome_message_for_onboarding_util']
      }
    };
    
    // Categorize Meta messages
    const metaCategorizedMessages = {};
    const metaUnknownMessages = [];
    
    for (const message of outboundMessages) {
      let categorized = false;
      
      // Check if message is from Meta integration
      if (message.from === process.env.META_PHONE_NUMBER_ID || 
          (message.meta && message.meta.type && message.meta.type.includes('meta'))) {
        
        // Check message against all patterns for each type
        for (const [type, patterns] of Object.entries(metaMessageTypes)) {
          const typePatterns = patterns as any;
          
          // Check body patterns
          const bodyMatch = typePatterns.bodyPatterns.some((pattern: string) => 
            message.body && message.body.includes(pattern)
          );
          
          // Check meta patterns
          const metaMatch = typePatterns.metaPatterns.some((pattern: string) => 
            (message.meta && message.meta.reminderType && message.meta.reminderType.includes(pattern)) ||
            (message.meta && message.meta.type && message.meta.type.includes(pattern)) ||
            (message.meta && message.meta.template && message.meta.template.includes(pattern))
          );
          
          // Check template names
          const templateMatch = typePatterns.templateNames.some((templateName: string) => 
            message.body === templateName || 
            (message.meta && message.meta.template === templateName)
          );
          
          if (bodyMatch || metaMatch || templateMatch) {
            if (!metaCategorizedMessages[type]) {
              metaCategorizedMessages[type] = [];
            }
            metaCategorizedMessages[type].push({
              to: message.to,
              timestamp: message.timestamp,
              body: message.body,
              meta: message.meta,
              vendorName: message.meta?.vendorName || 'Unknown'
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
    
    // Get support call reminder logs
    const metaSupportReminderLogs = await SupportCallReminderLog.find({
      sentAt: { $gte: fortyEightHoursAgo }
    }).sort({ sentAt: -1 });
    
    // Enhance categorized messages with vendor names
    for (const [type, messages] of Object.entries(metaCategorizedMessages)) {
      for (const message of messages as any[]) {
        if (!message.vendorName || message.vendorName === 'Unknown') {
          try {
            const vendor = await User.findOne({ contactNumber: message.to });
            if (vendor) {
              message.vendorName = vendor.name;
            }
          } catch (error) {
            console.error('Error fetching vendor name:', error);
          }
        }
      }
    }
    
    // Calculate Meta statistics
    const metaStats = {
      totalMetaMessages: Object.values(metaCategorizedMessages).reduce((sum, messages: any) => sum + messages.length, 0),
      totalSupportCalls: metaSupportCallLogs.length,
      totalLoanReplies: metaLoanReplyLogs.length,
      totalSupportReminders: metaSupportReminderLogs.length,
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
      supportReminderLogs: metaSupportReminderLogs.slice(0, 10),
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
