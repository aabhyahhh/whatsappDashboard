import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import fetch from 'node-fetch';

// No interface needed - using express.raw() middleware

const router = Router();

// Environment variables
const META_APP_SECRET = process.env.META_APP_SECRET;           // from Meta App
const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;       // must match what you typed in Meta UI
const RELAY_SECRET = process.env.RELAY_SECRET;                 // shared with LK (same as above)

// Target services to forward webhook payloads to
const LK_URL = process.env.LK_URL || "https://laari-khojo-backend.onrender.com/api/webhook";
const DASH_URL = process.env.DASH_URL || "https://whatsappdashboard-1.onrender.com/api/conversation";

// Store for idempotency - in production, use Redis or database
const processedMessages = new Set<string>();

// No middleware needed - express.raw() in auth.ts handles this

/**
 * GET: Meta webhook verification
 * This endpoint is called by Meta to verify the webhook URL
 */
router.get('/', (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  
  if (mode === "subscribe" && token === META_VERIFY_TOKEN) {
    console.log('✅ Meta webhook verification successful');
    return res.status(200).send(challenge);
  }
  
  console.log('❌ Meta webhook verification failed');
  return res.sendStatus(403);
});

/**
 * POST: Ping endpoint for testing (bypasses signature verification)
 */
router.post('/ping', (req: any, res: Response) => {
  console.log('🏓 Ping received');
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * POST: Main webhook handler
 * Verifies Meta signature, ACKs immediately, and conditionally forwards to targets
 */
router.post('/', (req: any, res: Response) => {
  const startTime = Date.now();
  
  try {
    console.log('📨 Incoming Meta webhook payload');
    
    // 1) Verify Meta signature using raw body
    if (!verifyMetaSignature(req)) {
      console.log('❌ Meta signature verification failed');
      return res.sendStatus(403);
    }
    
    console.log('✅ Meta signature verification successful');
    
    // 2) ACK Meta immediately (don't block Meta)
    const ackTime = Date.now() - startTime;
    console.log(`⚡ ACK sent in ${ackTime}ms`);
    res.status(200).send('OK');
    
    // 3) Parse and process AFTER responding
    const body = JSON.parse(req.body.toString('utf8'));
    
    // 4) Offload work (setImmediate is the minimum)
    setImmediate(() => handleInbound(body));
    
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    // Do NOT throw; Meta already got 200 or 403
    if (!res.headersSent) {
      res.status(500).send('Internal server error');
    }
  }
});

/**
 * Handle inbound webhook data asynchronously
 */
function handleInbound(body: any) {
  try {
    console.log('🔄 Processing webhook data asynchronously...');
    
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value || {};
    
    const hasInbound = Array.isArray(value.messages) && value.messages.length > 0;
    const hasStatus = Array.isArray(value.statuses) && value.statuses.length > 0;
    const isAcctEvt = typeof change?.field === "string" &&
                     (change.field.startsWith("account_") || change.field.includes("quality"));
    
    // Determine forwarding targets based on message type
    const targets = [];
    if (hasInbound) {
      targets.push(DASH_URL); // Only dashboard for inbound messages
    }
    if (hasStatus || isAcctEvt) {
      if (!targets.includes(DASH_URL)) targets.push(DASH_URL);
      targets.push(LK_URL); // Both for statuses/account events
    }
    
    const uniqueTargets = Array.from(new Set(targets));
    console.log(`🎯 Forwarding to ${uniqueTargets.length} targets:`, uniqueTargets);
    
    // Forward to target services (fire-and-forget)
    if (uniqueTargets.length > 0) {
      const rawBody = JSON.stringify(body);
      const sig = relaySignature(rawBody);
      
      uniqueTargets.forEach(url => {
        fetch(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-relay-signature": sig,
            "x-forwarded-from": "conversation-router",
            "x-message-id": value?.messages?.[0]?.id || value?.statuses?.[0]?.id || 'unknown'
          },
          body: rawBody
        }).then(response => {
          if (response.ok) {
            console.log(`✅ Successfully forwarded to ${url}`);
          } else {
            console.log(`❌ Failed to forward to ${url}: ${response.status} ${response.statusText}`);
          }
        }).catch(error => {
          console.error(`❌ Error forwarding to ${url}:`, error.message);
        });
      });
    }
    
    console.log('✅ Webhook processing completed');
  } catch (error) {
    console.error('❌ Error in webhook processing:', error);
  }
}

/**
 * Verify Meta webhook signature using raw body
 */
function verifyMetaSignature(req: any): boolean {
  const sig = req.get("x-hub-signature-256"); // "sha256=..."
  if (!sig || !META_APP_SECRET) {
    return false;
  }
  
  const hmac = crypto
    .createHmac("sha256", META_APP_SECRET)
    .update(req.body) // Buffer from express.raw
    .digest("hex");
  
  return crypto.timingSafeEqual(
    Buffer.from(sig),
    Buffer.from(`sha256=${hmac}`)
  );
}

/**
 * Create relay signature for forwarding
 */
function relaySignature(raw: string): string {
  return "sha256=" + crypto.createHmac("sha256", RELAY_SECRET)
    .update(raw)
    .digest("hex");
}

export default router;
