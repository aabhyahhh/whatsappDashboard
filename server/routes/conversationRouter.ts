import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import fetch from 'node-fetch';
import { Message } from '../models/Message.js';
import { Contact } from '../models/Contact.js';
import { User } from '../models/User.js';
import LoanReplyLog from '../models/LoanReplyLog.js';
import SupportCallLog from '../models/SupportCallLog.js';
import { sendTemplateMessage, sendTextMessage, areMetaCredentialsAvailable } from '../meta.js';
import { toE164, variants } from '../utils/phone.js';

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

/**
 * Normalize WhatsApp ID to E.164 format
 * waId from Meta is digits without '+'. Prepend '+' for E.164
 * e.g. '918130026321' -> '+918130026321'
 */
function normalizeE164(waId: string): string {
  return `+${waId}`;
}

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
    console.log('🔍 Request headers:', {
      'content-type': req.get('content-type'),
      'x-hub-signature-256': req.get('x-hub-signature-256') ? 'present' : 'missing',
      'user-agent': req.get('user-agent')
    });
    
    // Check if we have the required environment variables
    if (!META_APP_SECRET) {
      console.log('⚠️ META_APP_SECRET not set, skipping signature verification');
      console.log('🔍 Environment check:', {
        hasAppSecret: !!META_APP_SECRET,
        hasAccessToken: !!process.env.META_ACCESS_TOKEN,
        hasPhoneNumberId: !!process.env.META_PHONE_NUMBER_ID,
        hasVerifyToken: !!process.env.META_VERIFY_TOKEN
      });
    } else {
      // 1) Verify Meta signature using raw body
      if (!verifyMetaSignature(req)) {
        console.log('❌ Meta signature verification failed');
        console.log('🔍 Signature verification details:', {
          hasSignature: !!req.get('x-hub-signature-256'),
          hasAppSecret: !!META_APP_SECRET,
          bodyType: typeof req.body,
          bodyLength: req.body?.length || 0,
          signature: req.get('x-hub-signature-256')?.substring(0, 20) + '...'
        });
        return res.sendStatus(403);
      }
      console.log('✅ Meta signature verification successful');
    }
    
    // 2) ACK Meta immediately (don't block Meta)
    const ackTime = Date.now() - startTime;
    console.log(`⚡ ACK sent in ${ackTime}ms`);
    res.status(200).send('OK');
    
    // 3) Parse and process AFTER responding
    let body;
    try {
      body = JSON.parse(req.body.toString('utf8'));
      console.log('🔍 Parsed webhook body successfully');
      console.log('🔍 Body structure:', {
        hasObject: !!body.object,
        hasEntry: !!body.entry,
        entryLength: body.entry?.length || 0
      });
    } catch (parseError) {
      console.error('❌ Error parsing webhook body:', parseError);
      console.error('🔍 Raw body:', req.body.toString('utf8'));
      return; // Exit early if we can't parse the body
    }
    
    // 4) Offload work (setImmediate is the minimum)
    setImmediate(() => handleInbound(body));
    
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    console.error('🔍 Error details:', {
      message: error.message,
      stack: error.stack,
      headersSent: res.headersSent
    });
    // Do NOT throw; Meta already got 200 or 403
    if (!res.headersSent) {
      res.status(500).send('Internal server error');
    }
  }
});

/**
 * Handle inbound webhook data asynchronously
 * Process messages directly since Admin Dashboard is the only consumer
 */
function handleInbound(body: any) {
  try {
    console.log('🔄 Processing webhook data asynchronously...');
    console.log('🔍 Webhook body structure:', {
      hasEntry: !!body?.entry,
      entryLength: body?.entry?.length || 0,
      hasChanges: !!body?.entry?.[0]?.changes,
      changesLength: body?.entry?.[0]?.changes?.length || 0
    });
    
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value || {};
    
    console.log('🔍 Webhook value structure:', {
      hasMessages: !!value.messages,
      messagesLength: value.messages?.length || 0,
      hasStatuses: !!value.statuses,
      statusesLength: value.statuses?.length || 0,
      field: change?.field
    });
    
    const hasInbound = Array.isArray(value.messages) && value.messages.length > 0;
    const hasStatus = Array.isArray(value.statuses) && value.statuses.length > 0;
    const isAcctEvt = typeof change?.field === "string" &&
                     (change.field.startsWith("account_") || change.field.includes("quality"));
    
    console.log(`📊 Webhook data: ${hasInbound ? 'inbound messages' : ''} ${hasStatus ? 'statuses' : ''} ${isAcctEvt ? 'account events' : ''}`);
    
    // Process inbound messages directly
    if (hasInbound) {
      console.log('📨 Processing inbound messages directly...');
      const messages = value.messages || [];
      messages.forEach((message: any, index: number) => {
        console.log(`📨 Message ${index + 1} from ${message.from}: ${message.text?.body || '[interactive]'}`);
        console.log('🔍 Message details:', {
          id: message.id,
          type: message.type,
          timestamp: message.timestamp,
          hasText: !!message.text,
          hasInteractive: !!message.interactive,
          hasButton: !!message.button
        });
        // Process message directly
        processInboundMessage(message).catch(error => {
          console.error('❌ Error processing message:', error);
          console.error('🔍 Message that failed:', message);
        });
      });
    }
    
    // Process status updates
    if (hasStatus) {
      console.log('📊 Processing status updates...');
      const statuses = value.statuses || [];
      statuses.forEach((status: any) => {
        console.log(`📊 Status update: ${status.status} for message ${status.id}`);
        // TODO: Add status processing logic here
      });
    }
    
    // Process account events
    if (isAcctEvt) {
      console.log('🔔 Processing account events...');
      // TODO: Add account event processing logic here
    }
    
    console.log('✅ Webhook processing completed');
  } catch (error) {
    console.error('❌ Error in webhook processing:', error);
    console.error('🔍 Webhook body that failed:', body);
  }
}

/**
 * Process inbound message directly
 */
async function processInboundMessage(message: any) {
  try {
    console.log('🔍 Processing inbound message:', {
      id: message.id,
      from: message.from,
      type: message.type,
      timestamp: message.timestamp,
      hasText: !!message.text,
      hasInteractive: !!message.interactive,
      hasButton: !!message.button
    });
    
    const { from, timestamp, type, text, interactive, button, context } = message;
    
    // Normalize phone numbers
    const fromWaId = from;                    // '918130026321' (digits without '+')
    const fromE164 = normalizeE164(fromWaId); // '+918130026321' (E.164 format)
    
    console.log(`🔍 Processing message from ${fromE164}: "${text?.body || '[interactive]'}"`);
    
    // Save message to database
    try {
      await Message.create({
        from: fromE164, // Use E.164 format for consistency
        to: process.env.META_PHONE_NUMBER_ID,
        body: text?.body || '[interactive message]',
        direction: 'inbound',
        timestamp: new Date(parseInt(timestamp) * 1000),
        meta: {
          messageId: message.id,
          type: type,
          interactive: interactive,
          button: button,
          context: context,
          waId: fromWaId // Store original WhatsApp ID
        }
      });
      console.log('✅ Message saved to database');
    } catch (dbError) {
      console.error('❌ Error saving message to database:', dbError);
    }
    
    // Update contact information using correct schema field
    try {
      await Contact.findOneAndUpdate(
        { phone: fromE164 }, // Use E.164 format
        { 
          phone: fromE164,
          lastSeen: new Date()
        },
        { upsert: true, new: true }
      );
      console.log('✅ Contact updated');
    } catch (contactError) {
      console.error('❌ Error updating contact:', contactError);
    }
    
    // Find vendor using correct schema fields (contactNumber)
    try {
      const vendor = await User.findOneAndUpdate(
        { 
          $or: [
            { contactNumber: fromE164 },    // E.164 format: '+918130026321'
            { contactNumber: fromWaId }     // WhatsApp ID format: '918130026321'
          ]
        },
        { 
          $set: { 
            lastInboundAt: new Date(),
            lastInboundText: text?.body || ''
          }
        },
        { new: true, upsert: false } // Don't upsert - only update existing vendors
      ).lean();
      
      if (vendor) {
        console.log(`👤 Found vendor: ${vendor.name} (${vendor.contactNumber})`);
      } else {
        console.log(`❓ Message from unknown number: ${fromE164}`);
      }
    } catch (vendorError) {
      console.error('❌ Error finding/updating vendor:', vendorError);
    }
    
    // Handle text messages
    if (type === 'text' && text?.body) {
      const normalizedText = text.body.trim().toLowerCase();
      console.log(`🔍 Processing text message: "${text.body}" -> "${normalizedText}"`);
      
      // Check for greeting
      if (/^(hi+|hello+|hey+)$/.test(normalizedText)) {
        console.log(`✅ Detected greeting from ${fromE164}: "${normalizedText}"`);
        await handleGreetingResponse(fromWaId); // Use waId for Meta API
      } 
      // Check for loan reply
      else if (/\bloan\b/i.test(normalizedText)) {
        console.log(`✅ Detected loan reply from ${fromE164}: "${normalizedText}"`);
        await handleLoanReply(fromWaId, fromE164, text.body);
      }
      // Check for Aadhaar verification confirmation (text message)
      else if (/yes.*verify.*aadha?r/i.test(normalizedText) || /verify.*aadha?r/i.test(normalizedText)) {
        console.log(`✅ Detected Aadhaar verification confirmation from ${fromE164}: "${normalizedText}"`);
        console.log(`🔍 Regex test results:`, {
          pattern1: /yes.*verify.*aadha?r/i.test(normalizedText),
          pattern2: /verify.*aadha?r/i.test(normalizedText),
          normalizedText: normalizedText
        });
        await handleAadhaarVerificationButton(fromWaId, fromE164);
      } else {
        console.log(`❓ Unknown message from ${fromE164}: ${text.body}`);
        console.log(`🔍 Message analysis:`, {
          originalText: text.body,
          normalizedText: normalizedText,
          isGreeting: /^(hi+|hello+|hey+)$/.test(normalizedText),
          isLoan: /\bloan\b/i.test(normalizedText),
          isAadhaarVerification: /yes.*verify.*aadha?r/i.test(normalizedText) || /verify.*aadha?r/i.test(normalizedText)
        });
      }
    }
    
    // Handle button clicks for both interactive and button types
    const hasInteractiveBtn = type === 'interactive' && interactive?.button_reply;
    const hasLegacyBtn = type === 'button' && button;

    if (hasInteractiveBtn || hasLegacyBtn) {
      const btn = hasInteractiveBtn
        ? { id: interactive.button_reply.id, title: interactive.button_reply.title }
        : { id: button.id, title: button.title || button.text }; // some payloads use .text

      console.log(`🔘 Button click from ${fromE164}: ${btn.id} - ${btn.title}`);
      await handleButtonClick(fromWaId, fromE164, btn);
    }
    
    console.log(`✅ Processed message from ${fromE164}`);
  } catch (error) {
    console.error('❌ Error processing inbound message:', error);
    console.error('🔍 Message that failed:', message);
  }
}

/**
 * Handle greeting response
 */
async function handleGreetingResponse(fromWaId: string) {
  try {
    const fromE164 = normalizeE164(fromWaId);
    console.log(`👋 Handling greeting response for ${fromE164}`);
    
    // Check if Meta credentials are available
    if (!areMetaCredentialsAvailable()) {
      console.log('⚠️ Meta credentials not available - logging greeting only');
      return;
    }
    
    const greetingMessage = "👋 Namaste from Laari Khojo!\n🙏 लारी खोजो की ओर से नमस्ते!\n\n📩 Thanks for reaching out!\n📞 संपर्क करने के लिए धन्यवाद!\n\nWe help you get discovered by more customers by showing your updates and services on our platform.\n🧺 हम आपके अपडेट्स और सेवाओं को अपने प्लेटफॉर्म पर दिखाकर आपको ज़्यादा ग्राहकों तक पहुँचाने में मदद करते हैं।\n\n💰 Interested in future loan support?\nJust reply with: *loan*\nभविष्य में लोन सहायता चाहिए?\n➡️ जवाब में भेजें: *loan*";
    
    // Try template first, fallback to text
    // Use waId (digits without '+') for Meta API calls
    try {
      await sendTemplateMessage(fromWaId, 'default_hi_and_loan_prompt');
      console.log('✅ Sent greeting via template');
    } catch (templateError) {
      console.log('⚠️ Template failed, sending text message');
      await sendTextMessage(fromWaId, greetingMessage);
      console.log('✅ Sent greeting via text');
    }
    
    // Save outbound message using E.164 format for consistency
    await Message.create({
      from: process.env.META_PHONE_NUMBER_ID,
      to: fromE164, // Use E.164 format for database consistency
      body: greetingMessage,
      direction: 'outbound',
      timestamp: new Date(),
      meta: {
        type: 'greeting_response',
        template: 'default_hi_and_loan_prompt',
        waId: fromWaId // Store original WhatsApp ID
      }
    });
    
    console.log(`✅ Greeting response sent to ${fromE164}`);
  } catch (error) {
    console.error('❌ Error handling greeting response:', error);
  }
}

/**
 * Handle loan reply
 */
async function handleLoanReply(fromWaId: string, fromE164: string, originalText: string) {
  try {
    console.log(`💰 Handling loan reply for ${fromE164}`);
    
    // Check if Meta credentials are available
    if (!areMetaCredentialsAvailable()) {
      console.log('⚠️ Meta credentials not available - logging loan reply only');
      return;
    }
    
    // Find vendor details
    const userNumbers = [fromE164];
    if (fromE164.startsWith('+91')) userNumbers.push(fromE164.replace('+91', '91'));
    if (fromE164.startsWith('+')) userNumbers.push(fromE164.substring(1));
    userNumbers.push(fromE164.slice(-10));
    
    const vendor = await User.findOne({ contactNumber: { $in: userNumbers } });
    const vendorName = vendor ? vendor.name : 'Unknown Vendor';
    
    // Log the loan reply
    const LoanReplyLog = (await import('../models/LoanReplyLog.js')).default;
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const existingLog = await LoanReplyLog.findOne({
      contactNumber: fromE164,
      timestamp: { $gte: oneMinuteAgo }
    });
    
    if (!existingLog) {
      await LoanReplyLog.create({
        vendorName: vendorName,
        contactNumber: fromE164,
        timestamp: new Date(),
        aadharVerified: false // Always start as false, will be updated when button is clicked
      });
      console.log(`✅ Logged loan reply from ${vendorName} (${fromE164}) with aadharVerified: false`);
    }
    
    // Send loan template with Aadhaar verification
    try {
      await sendTemplateMessage(fromWaId, 'reply_to_default_hi_loan_ready_to_verify_aadhar_or_not_util');
      console.log('✅ Sent loan reply template');
    } catch (templateError) {
      console.log('⚠️ Template failed, sending text message');
      const loanMessage = "Certainly! ✅ ज़रूर !\n\nWe're here to help you with loan support. To proceed, we need to verify your Aadhaar details.\nहम आपकी लोन सहायता के लिए यहाँ हैं। आगे बढ़ने के लिए, हमें आपके आधार विवरण की पुष्टि करनी होगी।\n\nPlease click the button below to confirm your Aadhaar verification:\nकृपया अपने आधार सत्यापन की पुष्टि करने के लिए नीचे दिए गए बटन पर क्लिक करें:";
      await sendTextMessage(fromWaId, loanMessage);
      console.log('✅ Sent loan reply via text');
    }
    
    // Save outbound message using E.164 format for consistency
    await Message.create({
      from: process.env.META_PHONE_NUMBER_ID,
      to: fromE164, // Use E.164 format for database consistency
      body: "Loan support response sent",
      direction: 'outbound',
      timestamp: new Date(),
      meta: {
        type: 'loan_response',
        template: 'reply_to_default_hi_loan_ready_to_verify_aadhar_or_not_util',
        vendorName: vendorName,
        waId: fromWaId // Store original WhatsApp ID
      }
    });
    
    console.log(`✅ Loan reply sent to ${fromE164}`);
  } catch (error) {
    console.error('❌ Error handling loan reply:', error);
  }
}

/**
 * Handle button clicks
 */
async function handleButtonClick(fromWaId: string, fromE164: string, button: any) {
  try {
    const { id, title } = button;
    console.log(`🔘 Handling button click: ${id} - ${title}`);
    console.log(`🔍 Button details:`, button);
    
    // Handle Aadhaar verification button - check multiple variations
    if (id === 'yes_verify_aadhar' || 
        title === 'Yes, I will verify Aadhar' || 
        title === "Yes, I'll verify Aadhar" ||
        title === "Yes, I'll very Aadhar" ||
        title === 'Yes, I will verify Aadhaar' ||
        title === "Yes, I'll verify Aadhaar" ||
        (title && /yes.*verify.*aadha?r/i.test(title))) {
      console.log(`✅ Detected Aadhaar verification button click`);
      await handleAadhaarVerificationButton(fromWaId, fromE164);
    } else {
      console.log(`❓ Unknown button: ${id} - ${title}`);
    }
  } catch (error) {
    console.error('❌ Error handling button click:', error);
  }
}

/**
 * Handle Aadhaar verification button click
 */
async function handleAadhaarVerificationButton(fromWaId: string, fromE164: string) {
  try {
    console.log(`✅ Handling Aadhaar verification button for ${fromE164}`);
    console.log(`🔍 Input parameters:`, { fromWaId, fromE164 });
    
    // Check if Meta credentials are available
    if (!areMetaCredentialsAvailable()) {
      console.log('⚠️ Meta credentials not available - logging Aadhaar verification only');
      return;
    }
    
    // Find vendor details
    const userNumbers = [fromE164];
    if (fromE164.startsWith('+91')) userNumbers.push(fromE164.replace('+91', '91'));
    if (fromE164.startsWith('+')) userNumbers.push(fromE164.substring(1));
    userNumbers.push(fromE164.slice(-10));
    
    console.log(`🔍 Searching for vendor with numbers:`, userNumbers);
    const vendor = await User.findOne({ contactNumber: { $in: userNumbers } });
    const vendorName = vendor ? vendor.name : 'Unknown Vendor';
    console.log(`🔍 Found vendor:`, { vendorName, vendorId: vendor?._id });
    
    if (vendor) {
      // Update vendor's Aadhaar verification status
      (vendor as any).aadharVerified = true;
      (vendor as any).aadharVerificationDate = new Date();
      await vendor.save();
      console.log(`✅ Updated Aadhaar verification status for ${vendor.name} (${fromE164}) via button click`);
    } else {
      console.log(`⚠️ No vendor found for ${fromE164}`);
    }
    
    // Update LoanReplyLog entry to show Aadhaar verification
    console.log(`🔍 Updating LoanReplyLog for ${fromE164}`);
    const LoanReplyLog = (await import('../models/LoanReplyLog.js')).default;
    const updateResult = await LoanReplyLog.findOneAndUpdate(
      { contactNumber: { $in: variants(fromE164) } },
      { $set: { contactNumber: fromE164, aadharVerified: true } },
      { upsert: false, new: true }
    );
    console.log(`✅ Updated LoanReplyLog Aadhaar verification status for ${fromE164}:`, updateResult);
    
    // Send template confirmation message
    try {
      console.log('[DEBUG] Sent from PNID:', process.env.META_PHONE_NUMBER_ID, 'to:', fromWaId);
      await sendTemplateMessage(fromWaId, 'reply_to_yes_to_aadhar_verification_util');
      console.log('✅ Sent Aadhaar verification template message');
    } catch (templateError) {
      console.log('⚠️ Template failed, sending text message fallback');
      const visualConfirmationText = `✅ *Aadhaar Verification Successful!*\n\n🎉 Your Aadhaar verification has been registered successfully!\n\n📅 Verified on: ${new Date().toLocaleDateString('en-IN')}\n⏰ Time: ${new Date().toLocaleTimeString('en-IN')}\n\n✅ Status: *VERIFIED*\n\nThank you for completing the verification process! 🙏\n\nआपका आधार सत्यापन सफलतापूर्वक पंजीकृत हो गया है! ✅`;
      await sendTextMessage(fromWaId, visualConfirmationText);
      console.log('✅ Sent Aadhaar verification text message fallback');
    }
    
    // Save the confirmation message to database
    await Message.create({
      from: process.env.META_PHONE_NUMBER_ID,
      to: fromE164, // Use E.164 format for database consistency
      body: "Aadhaar verification confirmation sent",
      direction: 'outbound',
      timestamp: new Date(),
      meta: {
        type: 'aadhaar_verification_button_confirmation',
        template: 'reply_to_yes_to_aadhar_verification_util',
        vendorPhone: fromE164,
        verificationDate: new Date(),
        trigger: 'button_click',
        waId: fromWaId // Store original WhatsApp ID
      }
    });
    
    console.log(`✅ Aadhaar verification completed for ${fromE164}`);
  } catch (error) {
    console.error('❌ Error handling Aadhaar verification button:', error);
  }
}

/**
 * Verify Meta webhook signature using raw body
 */
function verifyMetaSignature(req: any): boolean {
  try {
    const sig = req.get("x-hub-signature-256"); // "sha256=..."
    if (!sig || !META_APP_SECRET) {
      console.log('🔍 Signature verification failed - missing signature or app secret');
      return false;
    }
    
    if (!req.body || typeof req.body !== 'object') {
      console.log('🔍 Signature verification failed - invalid body type:', typeof req.body);
      return false;
    }
    
    const hmac = crypto
      .createHmac("sha256", META_APP_SECRET)
      .update(req.body) // Buffer from express.raw
      .digest("hex");
    
    const expectedSignature = `sha256=${hmac}`;
    const isValid = crypto.timingSafeEqual(
      Buffer.from(sig),
      Buffer.from(expectedSignature)
    );
    
    if (!isValid) {
      console.log('🔍 Signature verification failed - signatures do not match');
      console.log('🔍 Expected:', expectedSignature.substring(0, 20) + '...');
      console.log('🔍 Received:', sig.substring(0, 20) + '...');
    }
    
    return isValid;
  } catch (error) {
    console.error('❌ Error in signature verification:', error);
    return false;
  }
}

/**
 * Create relay signature for forwarding
 */
function relaySignature(raw: string): string {
  return "sha256=" + crypto.createHmac("sha256", RELAY_SECRET)
    .update(raw)
    .digest("hex");
}

/**
 * GET: Loan replies endpoint
 */
router.get('/loan-replies', async (req: Request, res: Response) => {
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

/**
 * GET: Support calls endpoint
 */
router.get('/support-calls', async (req: Request, res: Response) => {
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

/**
 * GET: Inactive vendors endpoint (optimized for production)
 */
router.get('/inactive-vendors', async (req: Request, res: Response) => {
  try {
    console.log('📊 Fetching inactive vendors from users collection...');
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;
    
    // Calculate date 5 days ago
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    
    // Use a much simpler approach - just get users who haven't been updated recently
    // This is more reliable and faster than checking individual messages
    const inactiveUsers = await User.find({
      updatedAt: { $lt: fiveDaysAgo }
    })
    .select('name contactNumber updatedAt')
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit);
    
    const total = await User.countDocuments({
      updatedAt: { $lt: fiveDaysAgo }
    });
    
    console.log(`✅ Found ${inactiveUsers.length} inactive vendors (${total} total) - not updated in last 5 days`);
    
    const vendors = inactiveUsers.map(user => ({
      _id: user._id,
      name: user.name,
      contactNumber: user.contactNumber,
      updatedAt: user.updatedAt,
      lastInteractionDate: user.updatedAt,
      daysInactive: Math.floor((Date.now() - user.updatedAt.getTime()) / (1000 * 60 * 60 * 24))
    }));
    
    res.json({
      vendors,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching inactive vendors:', error);
    res.status(500).json({ error: 'Failed to fetch inactive vendors' });
  }
});

/**
 * GET: Simple inactive vendors endpoint (fallback)
 */
router.get('/inactive-vendors-simple', async (req: Request, res: Response) => {
  try {
    console.log('📊 Fetching inactive vendors (simple version)...');
    
    // Calculate date 5 days ago
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    
    // Get recent users who haven't been updated recently
    const inactiveUsers = await User.find({
      updatedAt: { $lt: fiveDaysAgo }
    })
    .select('name contactNumber updatedAt')
    .sort({ updatedAt: -1 })
    .limit(50);
    
    console.log(`✅ Found ${inactiveUsers.length} potentially inactive users`);
    
    res.json({
      vendors: inactiveUsers.map(user => ({
        _id: user._id,
        name: user.name,
        contactNumber: user.contactNumber,
        updatedAt: user.updatedAt,
        lastInteractionDate: user.updatedAt,
        daysInactive: Math.floor((Date.now() - user.updatedAt.getTime()) / (1000 * 60 * 60 * 24))
      })),
      pagination: {
        page: 1,
        limit: 50,
        total: inactiveUsers.length,
        pages: 1
      }
    });
  } catch (error) {
    console.error('❌ Error fetching inactive vendors (simple):', error);
    res.status(500).json({ error: 'Failed to fetch inactive vendors' });
  }
});

/**
 * GET: Message health endpoint
 */
router.get('/message-health', async (req: Request, res: Response) => {
  try {
    console.log('📊 Fetching message health data...');
    
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    
    // Get all outbound messages in the last 48 hours
    const outboundMessages = await Message.find({
      direction: 'outbound',
      timestamp: { $gte: fortyEightHoursAgo }
    }).sort({ timestamp: -1 });
    
    // Define Meta message types with multiple possible patterns
    const metaMessageTypes = {
      'Meta Location Update': ['update_location_cron', 'Template: update_location_cron'],
      'Meta Support Prompt': ['inactive_vendors_support_prompt_util', 'Template: inactive_vendors_support_prompt_util'],
      'Meta Support Confirmation': ['inactive_vendors_reply_to_yes_support_call_util', 'Template: inactive_vendors_reply_to_yes_support_call_util'],
      'Meta Greeting Response': ['default_hi_and_loan_prompt', 'Template: default_hi_and_loan_prompt'],
      'Meta Loan Prompt': ['reply_to_default_hi_loan_ready_to_verify_aadhar_or_not_util', 'Template: reply_to_default_hi_loan_ready_to_verify_aadhar_or_not_util'],
      'Meta Welcome Message': ['welcome_message_for_onboarding_util', 'Template: welcome_message_for_onboarding_util'],
      'Meta Support Call': ['Support call message sent to'],
      'Meta Loan Support': ['Loan support response sent'],
      'Meta Aadhaar Verification': ['Aadhaar verification confirmation sent']
    };
    
    // Categorize Meta messages
    const metaCategorizedMessages: any = {};
    const metaUnknownMessages: any[] = [];
    
    for (const message of outboundMessages) {
      let categorized = false;
      
      // Check if message is from Meta integration
      if (message.from === process.env.META_PHONE_NUMBER_ID || 
          (message.meta && message.meta.type && message.meta.type.includes('meta'))) {
        
        // Special case for location update messages
        if (message.body?.includes('update_location_cron') || 
            (message.meta && message.meta.reminderType && message.meta.reminderType.includes('location'))) {
          if (!metaCategorizedMessages['Meta Location Update']) {
            metaCategorizedMessages['Meta Location Update'] = [];
          }
          metaCategorizedMessages['Meta Location Update'].push({
            to: message.to,
            timestamp: message.timestamp,
            body: message.body,
            meta: message.meta
          });
          categorized = true;
        } else {
          // Check message body for other template names
          for (const [type, templateNames] of Object.entries(metaMessageTypes)) {
            const isMatch = templateNames.some(templateName => 
              message.body === templateName || 
              message.body?.includes(templateName) ||
              (message.meta && message.meta.template === templateName)
            );
            
            if (isMatch) {
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
      totalMetaMessages: Object.values(metaCategorizedMessages).reduce((sum: number, messages: any) => sum + messages.length, 0),
      totalSupportCalls: metaSupportCallLogs.length,
      totalLoanReplies: metaLoanReplyLogs.length,
      messageTypes: Object.keys(metaCategorizedMessages).map(type => ({
        type,
        count: metaCategorizedMessages[type]?.length || 0
      })),
      unknownMessagesCount: metaUnknownMessages.length
    };
    
    console.log(`✅ Found ${metaStats.totalMetaMessages} Meta messages, ${metaStats.totalSupportCalls} support calls, ${metaStats.totalLoanReplies} loan replies`);
    
    // Format support call logs for display
    const formattedSupportCallLogs = metaSupportCallLogs.map(log => ({
      vendorName: log.vendorName,
      contactNumber: log.contactNumber,
      timestamp: log.timestamp,
      completed: log.completed,
      completedBy: log.completedBy,
      completedAt: log.completedAt
    }));
    
    // Format loan reply logs for display
    const formattedLoanReplyLogs = metaLoanReplyLogs.map(log => ({
      vendorName: log.vendorName,
      contactNumber: log.contactNumber,
      timestamp: log.timestamp,
      aadharVerified: log.aadharVerified
    }));
    
    res.json({
      stats: metaStats,
      categorizedMessages: metaCategorizedMessages,
      unknownMessages: metaUnknownMessages.slice(0, 10),
      supportCallLogs: formattedSupportCallLogs.slice(0, 10),
      loanReplyLogs: formattedLoanReplyLogs.slice(0, 10),
      timeRange: {
        from: fortyEightHoursAgo,
        to: new Date()
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching message health data:', error);
    res.status(500).json({ error: 'Failed to fetch message health data' });
  }
});

export default router;
