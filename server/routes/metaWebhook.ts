import { Router } from 'express';
import { Message } from '../models/Message.js';
import { Contact } from '../models/Contact.js';
import { User } from '../models/User.js';
import VendorLocation from '../models/VendorLocation.js';
import { sendTemplateMessage, sendTextMessage, sendInteractiveMessage, verifyWebhook, processWebhook } from '../meta.js';

const router = Router();

// Webhook verification endpoint
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'] as string;
  const token = req.query['hub.verify_token'] as string;
  const challenge = req.query['hub.challenge'] as string;

  const result = verifyWebhook(mode, token, challenge);
  if (result) {
    res.status(200).send(result);
  } else {
    res.status(403).send('Forbidden');
  }
});

// Webhook endpoint to receive Meta messages
router.post('/', async (req, res) => {
  try {
    // Validate X-Relay-Secret header for security
    const relaySecret = req.header('X-Relay-Secret');
    const expectedSecret = process.env.RELAY_SECRET;
    
    if (expectedSecret && relaySecret !== expectedSecret) {
      console.log('❌ Invalid X-Relay-Secret header');
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    console.log('Incoming Meta webhook payload:', JSON.stringify(req.body, null, 2));
    
    const webhookData = processWebhook(req.body);
    if (!webhookData) {
      return res.status(200).send('OK');
    }

    const { messages, statuses } = webhookData;

    // Process incoming messages
    for (const message of messages) {
      await processIncomingMessage(message);
    }

    // Process message statuses
    for (const status of statuses) {
      await processMessageStatus(status);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Error processing Meta webhook:', error?.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Process incoming message
async function processIncomingMessage(message: any) {
  try {
    const { id, from, timestamp, type, text, interactive, button, context } = message;
    
    // Save message to database
    const messageData = {
      from: from,
      to: process.env.META_PHONE_NUMBER_ID,
      body: text || '[interactive message]',
      direction: 'inbound',
      timestamp: new Date(parseInt(timestamp) * 1000),
      meta: {
        messageId: id,
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

    // Handle different message types
    if (type === 'text' && text) {
      await handleTextMessage(from, text);
    } else if (type === 'interactive' && button) {
      await handleButtonResponse(from, button);
    } else if (type === 'location') {
      await handleLocationMessage(from, message);
    }

  } catch (error) {
    console.error('Error processing incoming message:', error);
  }
}

// Handle text messages
async function handleTextMessage(from: string, text: string) {
  const normalizedText = text.trim().toLowerCase();
  
  // Handle greetings (hi, hello, hey, etc.)
  if (/^(hi+|hello+|hey+)$/.test(normalizedText)) {
    console.log('Handling greeting message');
    
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
  
  // Handle loan keyword
  else if (/\bloan\b/i.test(text)) {
    console.log('Handling loan keyword');
    
    // Check if we've already sent a loan response recently
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
    const existingLoanResponse = await Message.findOne({
      from: process.env.META_PHONE_NUMBER_ID,
      to: from,
      direction: 'outbound',
      body: { $regex: /Certainly.*Aadhaar/ },
      timestamp: { $gte: thirtySecondsAgo }
    });
    
    if (existingLoanResponse) {
      console.log('⚠️ Loan response already sent recently, skipping duplicate');
      return;
    }
    
    // Log the loan reply
    try {
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
    } catch (err) {
      console.error('❌ Failed to log loan reply:', err);
    }
    
    // Send loan template with Aadhaar verification button
    await sendTemplateMessage(from, 'reply_to_default_hi_loan_ready_to_verify_aadhar_or_not_util');
    
    // Save the outbound message to database
    await Message.create({
      from: process.env.META_PHONE_NUMBER_ID,
      to: from,
      body: "Certainly! ✅ ज़रूर !\n\nWe're here to help you with loan support. To proceed, we need to verify your Aadhaar details.\nहम आपकी लोन सहायता के लिए यहाँ हैं। आगे बढ़ने के लिए, हमें आपके आधार विवरण की पुष्टि करनी होगी।\n\nPlease click the button below to confirm your Aadhaar verification:\nकृपया अपने आधार सत्यापन की पुष्टि करने के लिए नीचे दिए गए बटन पर क्लिक करें:",
      direction: 'outbound',
      timestamp: new Date(),
      meta: {
        type: 'loan_response',
        template: 'reply_to_default_hi_loan_ready_to_verify_aadhar_or_not_util'
      }
    });
  }
  
  // Handle Aadhaar verification response
  else if (/\b(?:yes|हाँ|हां).*?(?:verify|सत्यापित).*?(?:aadhaar|aadhar|आधार)\b/i.test(text)) {
    console.log('Handling Aadhaar verification response');
    
    // Check if we've already sent an Aadhaar verification response recently
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
    const existingAadhaarResponse = await Message.findOne({
      from: process.env.META_PHONE_NUMBER_ID,
      to: from,
      direction: 'outbound',
      body: { $regex: /Aadhaar Verification Successful/ },
      timestamp: { $gte: thirtySecondsAgo }
    });
    
    if (existingAadhaarResponse) {
      console.log('⚠️ Aadhaar verification response already sent recently, skipping duplicate');
      return;
    }
    
    // Update vendor's Aadhaar verification status
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
    } catch (err) {
      console.error('❌ Failed to update Aadhaar verification status:', err);
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
  }
  
  // Handle support call response (yes)
  else if (normalizedText === 'yes' || normalizedText === 'हाँ' || normalizedText === 'हां') {
    console.log('📞 Vendor responded "yes" to support call reminder');
    
    try {
      // Check if this vendor recently received a support call reminder
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentSupportReminder = await Message.findOne({
        to: from,
        direction: 'outbound',
        body: { $regex: /inactive_vendors_support_prompt_util/ },
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
          await sendTemplateMessage(from, 'inactive_vendors_reply_to_yes_support_call_util');
          
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
      console.error('❌ Error handling support call text response:', err);
    }
  }
}

// Handle button responses
async function handleButtonResponse(from: string, button: any) {
  const { id, title } = button;
  
  console.log(`🔘 Button pressed: ${id} - ${title}`);
  
  // Handle "yes_verify_aadhar" button response
  if (id === 'yes_verify_aadhar' || title === 'Yes, I will verify Aadhar') {
    console.log('✅ Vendor clicked Aadhaar verification button');
    
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
  
  // Handle "yes_support" button response
  else if (id === 'yes_support') {
    console.log('📞 Vendor requested support call');
    
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
      await sendTemplateMessage(from, 'inactive_vendors_reply_to_yes_support_call_util');
      
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
}

// Handle location messages
async function handleLocationMessage(from: string, message: any) {
  try {
    const location = message.location;
    if (location) {
      const coordinates = {
        latitude: location.latitude,
        longitude: location.longitude
      };
      
      console.log('📍 Received location:', coordinates);
      
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
    }
  } catch (error) {
    console.error('❌ Failed to handle location message:', error);
  }
}

// Process message status updates
async function processMessageStatus(status: any) {
  try {
    console.log('📊 Message status update:', status);
    // You can implement status tracking logic here if needed
  } catch (error) {
    console.error('❌ Failed to process message status:', error);
  }
}

export default router;

