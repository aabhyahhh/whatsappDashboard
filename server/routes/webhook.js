import { Router } from 'express';
import LoanReplyLog from '../models/LoanReplyLog.js';
import SupportCallLog from '../models/SupportCallLog.js';

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

export default router;
