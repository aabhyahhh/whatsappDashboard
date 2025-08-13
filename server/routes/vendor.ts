import express from 'express';
import type { Request, Response } from 'express';
// @ts-ignore
import { User } from '../models/User.js';
// @ts-ignore
import VendorLocation from '../models/VendorLocation.js';
// @ts-ignore
import { checkAndSendReminders } from '../vendorRemindersCron.js';
// @ts-ignore
import { Message } from '../models/Message.js';

const router = express.Router();

// GET /api/vendor/check-vendor-reminders
router.get('/check-vendor-reminders', async (_req: Request, res: Response) => {
  try {
    await checkAndSendReminders();
    res.send('Reminder check complete');
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vendor/trigger-weekly-campaign
router.post('/trigger-weekly-campaign', async (req: Request, res: Response) => {
  try {
    console.log('🚀 MANUAL TRIGGER: Weekly Vendor Message Campaign');
    console.log('===============================================');
    
    // Get campaign status first
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const existingMessages = await Message.find({
      'meta.type': 'weekly_vendor_message',
      timestamp: { $gte: today, $lt: tomorrow }
    });
    
    if (existingMessages.length > 0) {
      return res.json({
        success: false,
        message: `Campaign already sent today. ${existingMessages.length} messages sent.`,
        sentToday: existingMessages.length,
        messages: existingMessages.map(msg => ({
          to: msg.to,
          vendorName: msg.meta?.vendorName || 'Unknown',
          twilioSid: msg.twilioSid,
          timestamp: msg.timestamp
        }))
      });
    }
    
    // Get all vendors
    const vendors = await User.find({}).sort({ name: 1 });
    console.log(`📊 Found ${vendors.length} vendors to message`);
    
    if (vendors.length === 0) {
      return res.json({
        success: false,
        message: 'No vendors found in database'
      });
    }
    
    // Import Twilio client
    const { createFreshClient } = await import('../twilio.js');
    const twilioClient = createFreshClient();
    
    if (!twilioClient) {
      return res.status(500).json({
        success: false,
        message: 'Twilio client not available'
      });
    }
    
    const TEMPLATE_SID = 'HX5990e2eb62bbb374ac865ab6195fcfbe';
    const MESSAGE_TYPE = 'weekly_vendor_message';
    
    let successCount = 0;
    let errorCount = 0;
    const results: any[] = [];
    
    // Send messages to all vendors
    for (const vendor of vendors) {
      try {
        console.log(`📤 Sending message to ${vendor.name} (${vendor.contactNumber})...`);
        
        const result = await twilioClient.messages.create({
          from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
          to: `whatsapp:${vendor.contactNumber}`,
          contentSid: TEMPLATE_SID,
          contentVariables: JSON.stringify({}),
        });
        
        // Log the message to database
        await Message.create({
          from: process.env.TWILIO_PHONE_NUMBER,
          to: vendor.contactNumber,
          body: TEMPLATE_SID,
          direction: 'outbound',
          timestamp: new Date(),
          meta: { 
            type: MESSAGE_TYPE,
            vendorName: vendor.name,
            templateSid: TEMPLATE_SID,
            weekDay: new Date().getDay(),
            weekNumber: Math.ceil(new Date().getDate() / 7),
            campaignTrigger: 'manual'
          },
          twilioSid: result.sid
        });
        
        console.log(`✅ Sent successfully to ${vendor.name} - SID: ${result.sid}`);
        successCount++;
        results.push({
          success: true,
          phone: vendor.contactNumber,
          vendorName: vendor.name,
          twilioSid: result.sid
        });
        
      } catch (error: any) {
        console.error(`❌ Failed to send to ${vendor.name} (${vendor.contactNumber}):`, error.message);
        errorCount++;
        results.push({
          success: false,
          phone: vendor.contactNumber,
          vendorName: vendor.name,
          error: error.message
        });
        
        // Log error to database
        await Message.create({
          from: 'system',
          to: vendor.contactNumber,
          body: `Failed to send ${MESSAGE_TYPE}: ${error.message}`,
          direction: 'outbound',
          timestamp: new Date(),
          meta: { 
            type: 'error',
            originalType: MESSAGE_TYPE,
            error: error.message,
            vendorName: vendor.name,
            campaignTrigger: 'manual'
          },
          errorCode: error.code,
          errorMessage: error.message
        });
      }
      
      // Add a small delay between messages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Log campaign summary
    await Message.create({
      from: 'system',
      to: 'system',
      body: `Weekly vendor message campaign (MANUAL TRIGGER) summary: ${successCount} sent, ${errorCount} failed`,
      direction: 'outbound',
      timestamp: new Date(),
      meta: { 
        type: 'campaign_summary',
        campaignType: MESSAGE_TYPE,
        templateSid: TEMPLATE_SID,
        successCount,
        errorCount,
        totalCount: results.length,
        date: today.toISOString().split('T')[0],
        campaignTrigger: 'manual'
      }
    });
    
    console.log('\n📊 CAMPAIGN SUMMARY');
    console.log('==================');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(`📊 Total: ${results.length}`);
    
    res.json({
      success: true,
      message: `Weekly campaign completed: ${successCount} sent, ${errorCount} failed`,
      summary: {
        successful: successCount,
        failed: errorCount,
        total: results.length
      },
      results: results.slice(0, 10) // Return first 10 results to avoid large response
    });
    
  } catch (err: any) {
    console.error('❌ Error in weekly vendor message campaign:', err);
    res.status(500).json({
      success: false,
      message: 'Campaign failed',
      error: err.message
    });
  }
});

// GET /api/vendor/weekly-campaign-status
router.get('/weekly-campaign-status', async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get today's campaign messages
    const todayMessages = await Message.find({
      'meta.type': 'weekly_vendor_message',
      timestamp: { $gte: today, $lt: tomorrow }
    });
    
    // Get this week's campaign messages
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);
    
    const weekMessages = await Message.find({
      'meta.type': 'weekly_vendor_message',
      timestamp: { $gte: weekStart }
    });
    
    // Get total vendors
    const totalVendors = await User.countDocuments();
    
    // Get campaign summary
    const campaignSummary = await Message.findOne({
      'meta.type': 'campaign_summary',
      'meta.campaignType': 'weekly_vendor_message',
      timestamp: { $gte: today, $lt: tomorrow }
    });
    
    res.json({
      today: {
        sent: todayMessages.length,
        total: totalVendors,
        percentage: totalVendors > 0 ? Math.round((todayMessages.length / totalVendors) * 100) : 0
      },
      thisWeek: {
        sent: weekMessages.length,
        days: Math.ceil((Date.now() - weekStart.getTime()) / (1000 * 60 * 60 * 24))
      },
      lastCampaign: campaignSummary ? {
        timestamp: campaignSummary.timestamp,
        successCount: campaignSummary.meta?.successCount || 0,
        errorCount: campaignSummary.meta?.errorCount || 0,
        trigger: campaignSummary.meta?.campaignTrigger || 'unknown'
      } : null,
      messages: todayMessages.slice(0, 20).map(msg => ({
        to: msg.to,
        vendorName: msg.meta?.vendorName || 'Unknown',
        twilioSid: msg.twilioSid,
        timestamp: msg.timestamp,
        success: !!msg.twilioSid
      }))
    });
    
  } catch (err: any) {
    res.status(500).json({
      error: err.message
    });
  }
});

// POST /api/vendor/update-location
router.post('/update-location', async (req: Request, res: Response) => {
  try {
    const { contactNumber, mapsLink, lat, lng } = req.body;
    if (!contactNumber) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    let latitude = lat, longitude = lng;
    // If lat/lng not provided, try to extract from mapsLink
    if ((!latitude || !longitude) && mapsLink) {
      // Try to extract from Google Maps link
      const match = mapsLink.match(/@([-.\d]+),([-.\d]+)/);
      if (match) {
        latitude = match[1];
        longitude = match[2];
      } else {
        // Try to extract from ?q=lat,lng
        const qMatch = mapsLink.match(/[?&]q=([-.\d]+),([-.\d]+)/);
        if (qMatch) {
          latitude = qMatch[1];
          longitude = qMatch[2];
        }
      }
    }
    // If neither mapsLink nor coordinates are provided, just update other fields if any
    if (!mapsLink && !latitude && !longitude) {
      return res.status(400).json({ error: 'Nothing to update: provide at least one of mapsLink, lat, or lng' });
    }
    // Build update object
    const updateObj: any = { updatedAt: new Date() };
    if (mapsLink) updateObj.mapsLink = mapsLink;
    if (latitude && longitude) {
      updateObj.location = {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      };
    }
    const vendor = await User.findOneAndUpdate(
      { contactNumber },
      updateObj,
      { new: true }
    );
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    res.json({ success: true, vendor });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vendor/update-location-both - Update both User and VendorLocation models
router.post('/update-location-both', async (req: Request, res: Response) => {
  try {
    const { contactNumber, mapsLink, lat, lng } = req.body;
    if (!contactNumber) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    let latitude = lat, longitude = lng;
    
    // If lat/lng not provided, try to extract from mapsLink
    if ((!latitude || !longitude) && mapsLink) {
      // Try to extract from Google Maps link
      const match = mapsLink.match(/@([-.\d]+),([-.\d]+)/);
      if (match) {
        latitude = match[1];
        longitude = match[2];
      } else {
        // Try to extract from ?q=lat,lng
        const qMatch = mapsLink.match(/[?&]q=([-.\d]+),([-.\d]+)/);
        if (qMatch) {
          latitude = qMatch[1];
          longitude = qMatch[2];
        }
      }
    }
    
    // If neither mapsLink nor coordinates are provided, return error
    if (!mapsLink && !latitude && !longitude) {
      return res.status(400).json({ error: 'Nothing to update: provide at least one of mapsLink, lat, or lng' });
    }
    
    const results: any = {};
    
    // Update User model
    try {
      const updateObj: any = { updatedAt: new Date() };
      if (mapsLink) updateObj.mapsLink = mapsLink;
      if (latitude && longitude) {
        updateObj.location = {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        };
      }
      
      const vendor = await User.findOneAndUpdate(
        { contactNumber },
        updateObj,
        { new: true }
      );
      
      if (vendor) {
        results.user = { success: true, vendor };
        console.log(`✅ Updated User model for ${contactNumber}`);
      } else {
        results.user = { success: false, error: 'Vendor not found in User collection' };
      }
    } catch (userErr) {
      results.user = { success: false, error: userErr.message };
      console.error('❌ Failed to update User model:', userErr);
    }
    
    // Update VendorLocation model
    try {
      if (latitude && longitude) {
        let vendorLocation = await VendorLocation.findOne({ phone: contactNumber });
        
        if (vendorLocation) {
          // Update existing record
          vendorLocation.location = {
            lat: parseFloat(latitude),
            lng: parseFloat(longitude)
          };
          vendorLocation.updatedAt = new Date();
          await vendorLocation.save();
          results.vendorLocation = { success: true, updated: true };
          console.log(`✅ Updated VendorLocation for ${contactNumber}`);
        } else {
          // Create new record
          vendorLocation = new VendorLocation({
            phone: contactNumber,
            location: {
              lat: parseFloat(latitude),
              lng: parseFloat(longitude)
            }
          });
          await vendorLocation.save();
          results.vendorLocation = { success: true, created: true };
          console.log(`✅ Created new VendorLocation for ${contactNumber}`);
        }
      } else {
        results.vendorLocation = { success: false, error: 'No coordinates provided for VendorLocation update' };
      }
    } catch (vendorLocationErr) {
      results.vendorLocation = { success: false, error: vendorLocationErr.message };
      console.error('❌ Failed to update VendorLocation:', vendorLocationErr);
    }
    
    res.json({ 
      success: results.user.success || results.vendorLocation.success,
      results 
    });
    
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vendor - Get all vendors (now users)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vendor/open-count - Get count of open vendors (now users)
router.get('/open-count', async (_req: Request, res: Response) => {
  try {
    const users = await User.find({});
    function isOpenNow(user: any): boolean {
      if (!user.operatingHours || !user.operatingHours.openTime || !user.operatingHours.closeTime || !user.operatingHours.days) {
        return false;
      }
      const now = new Date();
      const day = now.getDay();
      const yesterday = (day + 6) % 7;
      function parseTime(str: string): number {
        const [time, period] = str.split(' ');
        let [h, m] = time.split(':').map(Number);
        if (period === 'PM' && h !== 12) h += 12;
        if (period === 'AM' && h === 12) h = 0;
        return h * 60 + m;
      }
      const openMinutes = parseTime(user.operatingHours.openTime);
      const closeMinutes = parseTime(user.operatingHours.closeTime);
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const daysArr = user.operatingHours.days;
      let result;
      if (openMinutes < closeMinutes) {
        result = daysArr.includes(day) && nowMinutes >= openMinutes && nowMinutes < closeMinutes;
      } else {
        if (nowMinutes >= openMinutes) {
          result = daysArr.includes(day);
        } else if (nowMinutes < closeMinutes) {
          result = daysArr.includes(yesterday);
        } else {
          result = false;
        }
      }
      return result;
    }
    const openCount = users.filter(isOpenNow).length;
    res.json({ count: openCount });
  } catch (err) {
    console.error('Error counting open vendors:', err);
    res.status(500).json({ error: 'Failed to count open vendors' });
  }
});

export default router; 