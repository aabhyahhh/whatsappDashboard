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
    
    // 1) Verify Meta signature
    if (!verifyMetaSignature(req)) {
      console.log('❌ Meta signature verification failed');
      return res.sendStatus(403);
    }
    
    console.log('✅ Meta signature verification successful');
    
    // 2) ACK Meta immediately (don't block Meta)
    const ackTime = Date.now() - startTime;
    console.log(`⚡ ACK sent in ${ackTime}ms`);
    res.status(200).send('OK');
    
    // 3) Process the webhook data
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value || {};
    
    const hasInbound = Array.isArray(value.messages) && value.messages.length > 0;
    const hasStatus = Array.isArray(value.statuses) && value.statuses.length > 0;
    const isAcctEvt = typeof change?.field === "string" &&
                     (change.field.startsWith("account_") || change.field.includes("quality"));
    
    // 4) Determine forwarding targets based on message type
    const targets = [];
    if (hasInbound) {
      targets.push(DASH_URL);        // inbound → Admin Dashboard only
    }
    if (hasStatus || isAcctEvt) {
      targets.push(DASH_URL, LK_URL); // statuses → both
    }
    
    console.log(`🎯 Forwarding to ${targets.length} targets:`, targets);
    
    // 5) Forward to target services (fire-and-forget)
    if (targets.length > 0 && req.rawBody) {
      const sig = relaySignature(req.rawBody);
      
      await Promise.allSettled(targets.map(url =>
        fetch(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-relay-signature": sig,
            "x-forwarded-from": "conversation-router",
            "x-message-id": value?.messages?.[0]?.id || value?.statuses?.[0]?.id || 'unknown'
          },
          body: JSON.stringify(req.body),
          signal: AbortSignal.timeout(5000) // 5 second timeout
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
        })
      ));
    }
    
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

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
