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
const META_APP_SECRET = process.env.META_APP_SECRET;           // from Meta App
const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;       // must match what you typed in Meta UI
const RELAY_SECRET = process.env.RELAY_SECRET;                 // shared with LK (same as above)

// Target services to forward webhook payloads to
const LK_URL = process.env.LK_URL || "https://laari-khojo-backend.onrender.com/api/webhook";
const DASH_URL = process.env.DASH_URL || "https://whatsappdashboard-1.onrender.com/api/conversation";

// Store for idempotency - in production, use Redis or database
const processedMessages = new Set<string>();

// Middleware to capture raw body for signature verification
router.use((req: RequestWithRawBody, res, next) => {
  if (req.method === 'POST' && !req.rawBody) {
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
 * POST: Main webhook handler
 * Verifies Meta signature, ACKs immediately, and conditionally forwards to targets
 */
router.post('/', async (req: RequestWithRawBody, res: Response) => {
  const startTime = Date.now();
  
  try {
    console.log('📨 Incoming Meta webhook payload');
    console.log('🔍 Request headers:', {
      'content-type': req.get('content-type'),
      'x-hub-signature-256': req.get('x-hub-signature-256'),
      'user-agent': req.get('user-agent')
    });
    console.log('🔍 Request body preview:', JSON.stringify(req.body, null, 2).substring(0, 500));
    
    // 1) Verify Meta signature
    if (!verifyMetaSignature(req)) {
      console.log('❌ Meta signature verification failed');
      console.log('🔍 Debug info:');
      console.log('- META_APP_SECRET available:', !!META_APP_SECRET);
      console.log('- X-Hub-Signature-256 header:', req.get("X-Hub-Signature-256"));
      console.log('- Raw body length:', req.rawBody?.length || 0);
      return res.sendStatus(403);
    }
    
    console.log('✅ Meta signature verification successful');
    
    // 2) ACK Meta immediately (don't block Meta)
    const ackTime = Date.now() - startTime;
    console.log(`⚡ ACK sent in ${ackTime}ms`);
    res.status(200).send('OK');
    
    // 3) Process the webhook data asynchronously (don't await)
    processWebhookAsync(req.body, req.rawBody).catch(error => {
      console.error('❌ Error in async webhook processing:', error);
    });
    
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

/**
 * Process webhook data asynchronously
 */
async function processWebhookAsync(body: any, rawBody: string | undefined) {
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
    // Avoid duplicate forwarding by filtering:
    const uniqueTargets = Array.from(new Set(targets));
    console.log(`🎯 Forwarding to ${uniqueTargets.length} targets:`, uniqueTargets);
    
    // Forward to target services (fire-and-forget)
    if (uniqueTargets.length > 0 && rawBody) {
      const sig = relaySignature(rawBody);
      
      // Create forward promises with improved AbortController support
      const forwardPromises = uniqueTargets.map(url => {
        // Check AbortController support and create manual timeout
        let controller: AbortController | undefined = undefined;
        let signal: AbortSignal | undefined = undefined;
        
        try {
          if (typeof AbortController !== "undefined") {
            controller = new AbortController();
            signal = controller.signal;
            // Manual timeout after 5 seconds
            setTimeout(() => controller?.abort(), 5000);
          }
        } catch (error) {
          console.log(`⚠️ AbortController not supported for ${url}, using fallback`);
        }
        
        return fetch(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-relay-signature": sig,
            "x-forwarded-from": "conversation-router",
            "x-message-id": value?.messages?.[0]?.id || value?.statuses?.[0]?.id || 'unknown'
          },
          body: JSON.stringify(body),
          ...(signal ? { signal } : {})
        }).then(response => {
          if (response.ok) {
            console.log(`✅ Successfully forwarded to ${url}`);
          } else {
            console.log(`❌ Failed to forward to ${url}: ${response.status} ${response.statusText}`);
          }
        }).catch(error => {
          if (error.name === 'AbortError') {
            console.error(`⏰ Timeout forwarding to ${url}`);
          } else {
            console.error(`❌ Error forwarding to ${url}:`, error.message);
          }
        });
      });
      
      // Fire-and-forget: don't await, just start the promises
      Promise.allSettled(forwardPromises).then(results => {
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        console.log(`📊 Forwarding complete: ${successful} successful, ${failed} failed`);
      }).catch(error => {
        console.error('❌ Error in forwarding batch:', error);
      });
    }
    
    console.log('✅ Webhook processing completed');
  } catch (error) {
    console.error('❌ Error in webhook processing:', error);
  }
}

/**
 * Verify Meta webhook signature
 */
function verifyMetaSignature(req: RequestWithRawBody): boolean {
  const sig = req.get("X-Hub-Signature-256");
  if (!sig || !META_APP_SECRET) {
    return false;
  }
  
  const expected = "sha256=" + crypto.createHmac("sha256", META_APP_SECRET)
    .update(req.rawBody || '')
    .digest("hex");
  
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
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
