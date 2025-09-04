import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { Message } from '../models/Message.js';
import { Contact } from '../models/Contact.js';
import { User } from '../models/User.js';
import VendorLocation from '../models/VendorLocation.js';
import { sendTemplateMessage, sendTextMessage, sendInteractiveMessage, processWebhook } from '../meta.js';
import { checkMessageIdempotency, markMessageIdempotency, initializeRedis } from '../utils/idempotency.js';

// Extend Request interface to include rawBody
interface RequestWithRawBody extends Request {
  rawBody?: string;
}

const router = Router();

// Initialize Redis for idempotency
initializeRedis().catch(console.error);

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
 * POST: Conversation engine webhook consumer
 * Receives forwarded events from the router and processes them
 */
router.post('/', async (req: RequestWithRawBody, res: Response) => {
  try {
    // Verify relay signature (optional but recommended)
    const relaySig = req.header('X-Relay-Signature');
    const expectedSecret = process.env.RELAY_SECRET;
    
    if (expectedSecret && relaySig && req.rawBody) {
      const expected = "sha256=" + crypto.createHmac("sha256", expectedSecret)
        .update(req.rawBody)
        .digest("hex");
      
      if (!crypto.timingSafeEqual(Buffer.from(relaySig), Buffer.from(expected))) {
        console.log('❌ Invalid relay signature');
        return res.status(403).json({ error: 'Unauthorized' });
      }
    }
    
    console.log('📨 Conversation engine received webhook:', JSON.stringify(req.body, null, 2));
    
    // ACK immediately
    res.status(200).send('OK');
    
    const value = req.body?.entry?.[0]?.changes?.[0]?.value || {};
    
    // Process messages
    const messages = value?.messages || [];
    for (const message of messages) {
      await handleInboundMessage(message);
    }
    
    // Process statuses
    const statuses = value?.statuses || [];
    for (const status of statuses) {
      await handleMessageStatus(status);
    }
    
  } catch (error) {
    console.error('❌ Error in conversation engine:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

/**
 * Handle inbound messages with idempotency
 */
async function handleInboundMessage(message: any) {
  const messageId = message.id;
  
  // Check idempotency using Redis + fallback
  if (await checkMessageIdempotency(messageId)) {
    console.log(`⚠️ Message ${messageId} already processed, skipping duplicate`);
    return;
  }
  
  // Mark as processed
  await markMessageIdempotency(messageId, 24); // 24 hours TTL
  
  try {
    const { from, timestamp, type, text, interactive, button, context } = message;
    
    console.log(`📨 Processing inbound message from ${from}: ${text || '[interactive]'}`);
    
    // Save message to database
    const messageData = {
      from: from,
      to: process.env.META_PHONE_NUMBER_ID,
      body: text || '[interactive message]',
      direction: 'inbound',
      timestamp: new Date(parseInt(timestamp) * 1000),
      meta: {
        messageId: messageId,
        type: type,
        interactive: interactive,
        button: button,
        context: context
      }
    };

    const savedMessage = new Message(messageData);
    await savedMessage.save();
    console.log('✅ Saved inbound message:', savedMessage._id);

    // Update contact
    await Contact.findOneAndUpdate(
      { phone: from },
      {
        phone: from,
        lastSeen: new Date(),
        updatedAt: new Date()
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    // Route to appropriate conversation handler
    if (type === 'text' && text) {
      await handleTextConversation(from, text);
    } else if (type === 'interactive' && button) {
      await handleButtonConversation(from, button);
    } else if (type === 'location') {
      await handleLocationConversation(from, message);
    }
    
  } catch (error) {
    console.error('❌ Error handling inbound message:', error);
  }
}

/**
 * Handle text-based conversations
 */
async function handleTextConversation(from: string, text: string) {
  const normalizedText = text.trim().toLowerCase();
  
  // Support conversation flow
  if (await isSupportConversation(from, normalizedText)) {
    await handleSupportConversation(from, normalizedText);
    return;
  }
  
  // Loan conversation flow
  if (await isLoanConversation(from, normalizedText)) {
    await handleLoanConversation(from, normalizedText);
    return;
  }
  
  // Verification conversation flow
  if (await isVerificationConversation(from, normalizedText)) {
    await handleVerificationConversation(from, normalizedText);
    return;
  }
  
  // Onboarding conversation flow
  if (await isOnboardingConversation(from, normalizedText)) {
    await handleOnboardingConversation(from, normalizedText);
    return;
  }
  
  // Default greeting handler
  if (/^(hi+|hello+|hey+)$/.test(normalizedText)) {
    await handleGreetingConversation(from);
    return;
  }
  
  // Fallback: log unknown message
  console.log(`❓ Unknown message from ${from}: ${text}`);
}

/**
 * Handle button-based conversations
 */
async function handleButtonConversation(from: string, button: any) {
  const { id, title } = button;
  
  console.log(`🔘 Button conversation: ${id} - ${title}`);
  
  if (id === 'yes_verify_aadhar' || title === 'Yes, I will verify Aadhar') {
    await handleAadhaarVerificationButton(from);
  } else if (id === 'yes_support') {
    await handleSupportRequestButton(from);
  } else {
    console.log(`❓ Unknown button: ${id}`);
  }
}

/**
 * Handle location-based conversations
 */
async function handleLocationConversation(from: string, message: any) {
  try {
    const location = message.location;
    if (location) {
      const coordinates = {
        latitude: location.latitude,
        longitude: location.longitude
      };
      
      console.log('📍 Location conversation:', coordinates);
      
      // Update user's location
      const userNumbers = [from];
      if (from.startsWith('+91')) userNumbers.push(from.replace('+91', '91'));
      if (from.startsWith('+')) userNumbers.push(from.substring(1));
      userNumbers.push(from.slice(-10));
      
      const users = await User.find({ contactNumber: { $in: userNumbers } });
      for (const user of users) {
        user.location = {
          type: 'Point',
          coordinates: [coordinates.longitude, coordinates.latitude],
        };
        user.mapsLink = `https://maps.google.com/?q=${coordinates.latitude},${coordinates.longitude}`;
        await user.save();
        console.log(`✅ Updated user location for ${user.contactNumber}`);
      }
      
      // Update VendorLocation collection
      try {
        let vendorLocation = await VendorLocation.findOne({ phone: from });
        
        if (vendorLocation) {
          vendorLocation.location = {
            lat: coordinates.latitude,
            lng: coordinates.longitude
          };
          vendorLocation.updatedAt = new Date();
          await vendorLocation.save();
          console.log(`✅ Updated VendorLocation for ${from}`);
        } else {
          vendorLocation = new VendorLocation({
            phone: from,
            location: {
              lat: coordinates.latitude,
              lng: coordinates.longitude
            }
          });
          await vendorLocation.save();
          console.log(`✅ Created new VendorLocation for ${from}`);
        }
      } catch (vendorLocationErr) {
        console.error('❌ Failed to update VendorLocation:', vendorLocationErr);
      }
      
      // Send location confirmation
      await sendLocationConfirmation(from);
    }
  } catch (error) {
    console.error('❌ Failed to handle location conversation:', error);
  }
}

/**
 * Handle message status updates for analytics
 */
async function handleMessageStatus(status: any) {
  try {
    console.log('📊 Message status update:', status);
    
    // Log status for analytics
    const statusData = {
      messageId: status.id,
      status: status.status,
      timestamp: new Date(parseInt(status.timestamp) * 1000),
      recipientId: status.recipient_id,
      conversationId: status.conversation?.id,
      pricing: status.pricing
    };
    
    // You can save this to a separate status collection for analytics
    console.log('📈 Status logged for analytics:', statusData);
    
  } catch (error) {
    console.error('❌ Failed to process message status:', error);
  }
}

// Idempotency functions are now handled by the Redis utility

// Conversation flow handlers
async function isSupportConversation(from: string, text: string): Promise<boolean> {
  return text === 'yes' || text === 'हाँ' || text === 'हां' || text.includes('support');
}

async function isLoanConversation(from: string, text: string): Promise<boolean> {
  return /\bloan\b/i.test(text);
}

async function isVerificationConversation(from: string, text: string): Promise<boolean> {
  return /\b(?:yes|हाँ|हां).*?(?:verify|सत्यापित).*?(?:aadhaar|aadhar|आधार)\b/i.test(text);
}

async function isOnboardingConversation(from: string, text: string): Promise<boolean> {
  return text.includes('onboard') || text.includes('register') || text.includes('signup');
}

async function handleSupportConversation(from: string, text: string) {
  console.log('📞 Handling support conversation');
  
  try {
    // Check if this vendor recently received a support call reminder
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentSupportReminder = await Message.findOne({
      to: from,
      direction: 'outbound',
      body: { $regex: /inactive_vendors_support_prompt/ },
      timestamp: { $gte: oneHourAgo }
    });
    
    if (recentSupportReminder) {
      console.log('✅ Found recent support call reminder, processing "yes" response');
      
      // Find vendor details
      const userNumbers = [from];
      if (from.startsWith('+91')) userNumbers.push(from.replace('+91', '91'));
      if (from.startsWith('+')) userNumbers.push(from.substring(1));
      userNumbers.push(from.slice(-10));
      
      const vendor = await User.findOne({ contactNumber: { $in: userNumbers } });
      const vendorName = vendor ? vendor.name : 'Unknown Vendor';
      
      // Check if support call already exists for this vendor in the last hour
      const SupportCallLog = (await import('../models/SupportCallLog.js')).default;
      const existingSupportCall = await SupportCallLog.findOne({
        contactNumber: from,
        timestamp: { $gte: oneHourAgo }
      });
      
      if (!existingSupportCall) {
        // Create support call log entry
        await SupportCallLog.create({
          vendorName: vendorName,
          contactNumber: from,
          timestamp: new Date(),
          completed: false
        });
        
        console.log(`✅ Created support call log for ${vendorName} (${from}) via text response`);
        
        // Send confirmation message
        await sendTemplateMessage(from, 'inactive_vendors_reply_to_yes_support_call');
        
        // Save the confirmation message to database
        await Message.create({
          from: process.env.META_PHONE_NUMBER_ID,
          to: from,
          body: "✅ Support request received! Our team will contact you soon.",
          direction: 'outbound',
          timestamp: new Date(),
          meta: {
            type: 'support_confirmation',
            vendorName: vendorName,
            contactNumber: from,
            trigger: 'text_response'
          }
        });
      } else {
        console.log(`ℹ️ Support call already exists for ${from} within last hour`);
      }
    } else {
      console.log('ℹ️ No recent support call reminder found for this "yes" response');
    }
  } catch (err) {
    console.error('❌ Error handling support conversation:', err);
  }
}

async function handleLoanConversation(from: string, text: string) {
  console.log('💰 Handling loan conversation');
  
  try {
    // Log the loan reply
    const userNumbers = [from];
    if (from.startsWith('+91')) userNumbers.push(from.replace('+91', '91'));
    if (from.startsWith('+')) userNumbers.push(from.substring(1));
    userNumbers.push(from.slice(-10));
    
    // Find user/vendor name
    let vendorName = '';
    const user = await User.findOne({ contactNumber: { $in: userNumbers } });
    if (user && user.name) {
      vendorName = user.name;
    }
    
    // Check if already logged for this contactNumber and timestamp (within 1 minute)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const LoanReplyLogModel = (await import('../models/LoanReplyLog.js')).default;
    const existingLog = await LoanReplyLogModel.findOne({
      contactNumber: from,
      timestamp: { $gte: oneMinuteAgo }
    });
    
    if (!existingLog) {
      await LoanReplyLogModel.create({
        vendorName: vendorName || 'Unknown',
        contactNumber: from,
        timestamp: new Date(),
        aadharVerified: (user as any)?.aadharVerified ? true : false
      });
      console.log(`✅ Logged loan reply from ${vendorName || 'Unknown'} (${from})`);
    }
    
    // Send loan template with Aadhaar verification button
    await sendTemplateMessage(from, 'reply_to_default_hi_loan_ready_to_verify_aadhar_or_not');
    
    // Save the outbound message to database
    await Message.create({
      from: process.env.META_PHONE_NUMBER_ID,
      to: from,
      body: "Certainly! ✅ ज़रूर !\n\nWe're here to help you with loan support. To proceed, we need to verify your Aadhaar details.\nहम आपकी लोन सहायता के लिए यहाँ हैं। आगे बढ़ने के लिए, हमें आपके आधार विवरण की पुष्टि करनी होगी।\n\nPlease click the button below to confirm your Aadhaar verification:\nकृपया अपने आधार सत्यापन की पुष्टि करने के लिए नीचे दिए गए बटन पर क्लिक करें:",
      direction: 'outbound',
      timestamp: new Date(),
      meta: {
        type: 'loan_response',
        template: 'reply_to_default_hi_loan_ready_to_verify_aadhar_or_not'
      }
    });
    
  } catch (err) {
    console.error('❌ Error handling loan conversation:', err);
  }
}

async function handleVerificationConversation(from: string, text: string) {
  console.log('🔐 Handling verification conversation');
  
  try {
    // Update vendor's Aadhaar verification status
    const userNumbers = [from];
    if (from.startsWith('+91')) userNumbers.push(from.replace('+91', '91'));
    if (from.startsWith('+')) userNumbers.push(from.substring(1));
    userNumbers.push(from.slice(-10));
    
    // Find user/vendor
    const user = await User.findOne({ contactNumber: { $in: userNumbers } });
    if (user) {
      // Update Aadhaar verification status
      (user as any).aadharVerified = true;
      (user as any).aadharVerificationDate = new Date();
      await user.save();
      console.log(`✅ Updated Aadhaar verification status for ${user.name} (${from})`);
      
      // Update LoanReplyLog entry to show Aadhaar verification
      try {
        const LoanReplyLogModel = (await import('../models/LoanReplyLog.js')).default;
        await LoanReplyLogModel.findOneAndUpdate(
          { contactNumber: from },
          { aadharVerified: true },
          { new: true }
        );
        console.log(`✅ Updated LoanReplyLog Aadhaar verification status for ${from}`);
      } catch (logErr) {
        console.error('❌ Failed to update LoanReplyLog Aadhaar verification status:', logErr);
      }
    }
    
    // Send Aadhaar verification confirmation
    const confirmationText = `✅ *Aadhaar Verification Successful!*\n\n🎉 Your Aadhaar verification has been registered successfully!\n\n📅 Verified on: ${new Date().toLocaleDateString('en-IN')}\n⏰ Time: ${new Date().toLocaleTimeString('en-IN')}\n\n✅ Status: *VERIFIED*\n\nThank you for completing the verification process! 🙏\n\nआपका आधार सत्यापन सफलतापूर्वक पंजीकृत हो गया है! ✅`;
    
    await sendTextMessage(from, confirmationText);
    
    // Save the confirmation message to database
    await Message.create({
      from: process.env.META_PHONE_NUMBER_ID,
      to: from,
      body: confirmationText,
      direction: 'outbound',
      timestamp: new Date(),
      meta: {
        type: 'aadhaar_verification_confirmation',
        vendorPhone: from,
        verificationDate: new Date()
      }
    });
    
  } catch (err) {
    console.error('❌ Error handling verification conversation:', err);
  }
}

async function handleOnboardingConversation(from: string, text: string) {
  console.log('🚀 Handling onboarding conversation');
  
  // Send welcome message for onboarding
  await sendTemplateMessage(from, 'welcome_message_for_onboarding');
  
  // Save the outbound message to database
  await Message.create({
    from: process.env.META_PHONE_NUMBER_ID,
    to: from,
    body: "Welcome to Laari Khojo! We're excited to have you on board.",
    direction: 'outbound',
    timestamp: new Date(),
    meta: {
      type: 'onboarding_welcome',
      template: 'welcome_message_for_onboarding'
    }
  });
}

async function handleGreetingConversation(from: string) {
  console.log('👋 Handling greeting conversation');
  
  // Check if we've already sent a greeting response recently
  const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
  const existingGreetingResponse = await Message.findOne({
    from: process.env.META_PHONE_NUMBER_ID,
    to: from,
    direction: 'outbound',
    body: { $regex: /Namaste from Laari Khojo/ },
    timestamp: { $gte: thirtySecondsAgo }
  });
  
  if (existingGreetingResponse) {
    console.log('⚠️ Greeting response already sent recently, skipping duplicate');
    return;
  }
  
  // Send default hi and loan prompt template
  await sendTemplateMessage(from, 'default_hi_and_loan_prompt');
  
  // Save the outbound message to database
  await Message.create({
    from: process.env.META_PHONE_NUMBER_ID,
    to: from,
    body: "👋 Namaste from Laari Khojo!\n🙏 लारी खोजो की ओर से नमस्ते!\n\n📩 Thanks for reaching out!\n📞 संपर्क करने के लिए धन्यवाद!\n\nWe help you get discovered by more customers by showing your updates and services on our platform.\n🧺 हम आपके अपडेट्स और सेवाओं को अपने प्लेटफॉर्म पर दिखाकर आपको ज़्यादा ग्राहकों तक पहुँचाने में मदद करते हैं।\n\n💰 Interested in future loan support?\nJust reply with: *loan*\nभविष्य में लोन सहायता चाहिए?\n➡️ जवाब में भेजें: *loan*",
    direction: 'outbound',
    timestamp: new Date(),
    meta: {
      type: 'greeting_response',
      template: 'default_hi_and_loan_prompt'
    }
  });
}

async function handleAadhaarVerificationButton(from: string) {
  console.log('✅ Handling Aadhaar verification button');
  
  try {
    const userNumbers = [from];
    if (from.startsWith('+91')) userNumbers.push(from.replace('+91', '91'));
    if (from.startsWith('+')) userNumbers.push(from.substring(1));
    userNumbers.push(from.slice(-10));
    
    // Find user/vendor
    const user = await User.findOne({ contactNumber: { $in: userNumbers } });
    if (user) {
      // Update Aadhaar verification status
      (user as any).aadharVerified = true;
      (user as any).aadharVerificationDate = new Date();
      await user.save();
      console.log(`✅ Updated Aadhaar verification status for ${user.name} (${from}) via button click`);
      
      // Update LoanReplyLog entry to show Aadhaar verification
      try {
        const LoanReplyLogModel = (await import('../models/LoanReplyLog.js')).default;
        await LoanReplyLogModel.findOneAndUpdate(
          { contactNumber: from },
          { aadharVerified: true },
          { new: true }
        );
        console.log(`✅ Updated LoanReplyLog Aadhaar verification status for ${from}`);
      } catch (logErr) {
        console.error('❌ Failed to update LoanReplyLog Aadhaar verification status:', logErr);
      }
    }
    
    // Send visual confirmation message with tick mark
    const visualConfirmationText = `✅ *Aadhaar Verification Successful!*\n\n🎉 Your Aadhaar verification has been registered successfully!\n\n📅 Verified on: ${new Date().toLocaleDateString('en-IN')}\n⏰ Time: ${new Date().toLocaleTimeString('en-IN')}\n\n✅ Status: *VERIFIED*\n\nThank you for completing the verification process! 🙏\n\nआपका आधार सत्यापन सफलतापूर्वक पंजीकृत हो गया है! ✅`;
    
    await sendTextMessage(from, visualConfirmationText);
    
    // Save the visual confirmation message to database
    await Message.create({
      from: process.env.META_PHONE_NUMBER_ID,
      to: from,
      body: visualConfirmationText,
      direction: 'outbound',
      timestamp: new Date(),
      meta: {
        type: 'aadhaar_verification_button_confirmation',
        vendorPhone: from,
        verificationDate: new Date(),
        trigger: 'button_click'
      }
    });
    
  } catch (err) {
    console.error('❌ Error handling Aadhaar verification button:', err);
  }
}

async function handleSupportRequestButton(from: string) {
  console.log('📞 Handling support request button');
  
  try {
    // Find vendor details
    const userNumbers = [from];
    if (from.startsWith('+91')) userNumbers.push(from.replace('+91', '91'));
    if (from.startsWith('+')) userNumbers.push(from.substring(1));
    userNumbers.push(from.slice(-10));
    
    const vendor = await User.findOne({ contactNumber: { $in: userNumbers } });
    const vendorName = vendor ? vendor.name : 'Unknown Vendor';
    
    // Create support call log entry
    const SupportCallLog = (await import('../models/SupportCallLog.js')).default;
    await SupportCallLog.create({
      vendorName: vendorName,
      contactNumber: from,
      timestamp: new Date(),
      completed: false
    });
    
    console.log(`✅ Created support call log for ${vendorName} (${from})`);
    
    // Send confirmation message
    await sendTemplateMessage(from, 'inactive_vendors_reply_to_yes_support_call');
    
    // Save the confirmation message to database
    await Message.create({
      from: process.env.META_PHONE_NUMBER_ID,
      to: from,
      body: "✅ Support request received! Our team will contact you soon.",
      direction: 'outbound',
      timestamp: new Date(),
      meta: {
        type: 'support_confirmation',
        vendorName: vendorName,
        contactNumber: from
      }
    });
    
  } catch (err) {
    console.error('❌ Error handling support request:', err);
  }
}

async function sendLocationConfirmation(from: string) {
  try {
    const confirmationText = "✅ Location updated successfully! Thank you for sharing your location.";
    await sendTextMessage(from, confirmationText);
    
    await Message.create({
      from: process.env.META_PHONE_NUMBER_ID,
      to: from,
      body: confirmationText,
      direction: 'outbound',
      timestamp: new Date(),
      meta: {
        type: 'location_confirmation'
      }
    });
  } catch (error) {
    console.error('❌ Failed to send location confirmation:', error);
  }
}

export default router;
