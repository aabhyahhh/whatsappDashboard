import express from 'express';
import type { Request, Response } from 'express';
import { Message } from '../models/Message.js';
import { User } from '../models/User.js';
import moment from 'moment-timezone';

const router = express.Router();

// GET /api/message-health/recent-activity - Get recent support call reminders and location updates
router.get('/recent-activity', async (req: Request, res: Response) => {
  try {
    const now = moment().tz('Asia/Kolkata');
    const last24Hours = now.subtract(24, 'hours').toDate();
    
    console.log(`[MessageHealth] Fetching recent activity since: ${last24Hours.toISOString()}`);
    
    // Fetch support call reminders (inactive_vendors_support_prompt_util)
    const supportCallReminders = await Message.find({
      direction: 'outbound',
      body: { $regex: /inactive_vendors_support_prompt_util/i },
      timestamp: { $gte: last24Hours }
    }).sort({ timestamp: -1 }).lean();
    
    console.log(`[MessageHealth] Found ${supportCallReminders.length} support call reminders`);
    
    // Fetch vendor update location messages (update_location_cron_util)
    const locationUpdateMessages = await Message.find({
      direction: 'outbound',
      body: { $regex: /update_location_cron_util/i },
      timestamp: { $gte: last24Hours }
    }).sort({ timestamp: -1 }).lean();
    
    console.log(`[MessageHealth] Found ${locationUpdateMessages.length} location update messages`);
    
    // Get unique contact numbers for vendor name lookup
    const allContactNumbers = [
      ...new Set([
        ...supportCallReminders.map(msg => msg.to),
        ...locationUpdateMessages.map(msg => msg.to)
      ])
    ];
    
    // Fetch vendor names
    const vendors = await User.find({
      contactNumber: { $in: allContactNumbers }
    }).select('contactNumber name').lean();
    
    const vendorMap = new Map(vendors.map(v => [v.contactNumber, v.name]));
    
    // Process support call reminders
    const processedSupportReminders = supportCallReminders.map(msg => ({
      contactNumber: msg.to,
      vendorName: vendorMap.get(msg.to) || 'Unknown Vendor',
      timestamp: msg.timestamp,
      messageId: (msg as any).messageId || msg._id?.toString(),
      meta: msg.meta
    }));
    
    // Process location update messages
    const processedLocationUpdates = locationUpdateMessages.map(msg => ({
      contactNumber: msg.to,
      vendorName: vendorMap.get(msg.to) || 'Unknown Vendor',
      timestamp: msg.timestamp,
      messageId: (msg as any).messageId || msg._id?.toString(),
      reminderType: msg.meta?.reminderType || 'unknown',
      dispatchType: msg.meta?.dispatchType || 'unknown',
      openTime: msg.meta?.openTime || 'Unknown',
      meta: msg.meta
    }));
    
    res.json({
      success: true,
      timeRange: {
        from: last24Hours.toISOString(),
        to: new Date().toISOString()
      },
      supportCallReminders: processedSupportReminders,
      locationUpdateMessages: processedLocationUpdates,
      summary: {
        totalSupportReminders: processedSupportReminders.length,
        totalLocationUpdates: processedLocationUpdates.length,
        uniqueVendorsContacted: allContactNumbers.length
      }
    });
    
  } catch (error) {
    console.error('[MessageHealth] Error fetching recent activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent activity data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
