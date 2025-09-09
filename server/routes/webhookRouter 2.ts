import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import fetch from 'node-fetch';

// Extend Request interface to include rawBody
interface RequestWithRawBody extends Request {
  rawBody?: string;
}

const router = Router();

// Environment variables
const APP_SECRET = process.env.META_APP_SECRET;           // from Meta app
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;       // set this in Meta UI
const RELAY_SECRET = process.env.RELAY_SECRET;            // your own secret

// Target services to forward webhook payloads to
const TARGETS = [
  "https://laari-khojo-backend.onrender.com/api/webhook",
];

// Store for idempotency - in production, use Redis or database
const processedMessages = new Set<string>();

// Middleware to capture raw body for signature verification
router.use((req: RequestWithRawBody, res, next) => {
  if (req.method === 'POST') {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      req.rawBody = data;
      try {
        req.body = JSON.parse(data);
      } catch (e) {
        req.body = {};
      }
      next();
    });
  } else {
    next();
  }
});

/** GET: Webhook verification */
router.get('/', (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
    res.status(200).send(challenge);  // 👈 must echo challenge as plain text
  } else {
    res.sendStatus(403);
  }
});

/** POST: Webhook events */
router.post('/', async (req: RequestWithRawBody, res: Response) => {
  const startTime = Date.now();
  
  try {
    console.log('📨 Incoming webhook payload:', JSON.stringify(req.body, null, 2));
    
    // 1) Verify signature
    const signature = req.header('X-Hub-Signature-256');
    if (!signature || !APP_SECRET) {
      console.log('❌ Missing signature or APP_SECRET');
      return res.sendStatus(403);
    }
    
    const expected = 'sha256=' + crypto
      .createHmac('sha256', APP_SECRET)
      .update(req.rawBody || '')
      .digest('hex');
    
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      console.log('❌ Signature verification failed');
      return res.sendStatus(403);
    }
    
    console.log('✅ Signature verification successful');
    
    // 2) Check for idempotency using messages[0].id
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages || [];
    
    if (messages.length > 0) {
      const messageId = messages[0].id;
      if (processedMessages.has(messageId)) {
        console.log(`⚠️ Message ${messageId} already processed, skipping duplicate`);
        return res.status(200).send('OK');
      }
      processedMessages.add(messageId);
      
      // Clean up old message IDs (keep only last 1000)
      if (processedMessages.size > 1000) {
        const messageIds = Array.from(processedMessages);
        processedMessages.clear();
        messageIds.slice(-500).forEach(id => processedMessages.add(id));
      }
    }
    
    // 3) ACK immediately (don't block Meta)
    const ackTime = Date.now() - startTime;
    console.log(`⚡ ACK sent in ${ackTime}ms`);
    res.status(200).send('OK');
    
    // 4) Fan-out to target services (fire-and-forget)
    const forwardPromises = TARGETS.map(async (url) => {
      try {
        console.log(`🔄 Forwarding to ${url}`);
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Relay-Secret': RELAY_SECRET,
            'X-Forwarded-From': 'webhook-router',
            'X-Message-Id': messages[0]?.id || 'unknown'
          },
          body: JSON.stringify(req.body)
        });
        
        if (response.ok) {
          console.log(`✅ Successfully forwarded to ${url}`);
        } else {
          console.log(`❌ Failed to forward to ${url}: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.error(`❌ Error forwarding to ${url}:`, error.message);
      }
    });
    
    // Don't wait for all forwards to complete
    Promise.allSettled(forwardPromises).then((results) => {
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      console.log(`📊 Forward results: ${successful} successful, ${failed} failed`);
    });
    
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

export default router;
