import { Router } from 'express';

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

export default router;
