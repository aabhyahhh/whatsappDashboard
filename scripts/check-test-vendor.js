import 'dotenv/config';
import mongoose from 'mongoose';
import moment from 'moment-timezone';

// Database connection
const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
    console.error('❌ MONGODB_URI is not defined');
    process.exit(1);
}

// Import models
const { User } = await import('../server/models/User.js');
const { Message } = await import('../server/models/Message.js');

async function checkTestVendor() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const testPhone = '+918130026321';
        console.log(`\n🔍 Checking test vendor: ${testPhone}`);

        // Find the test vendor
        const vendor = await User.findOne({ contactNumber: testPhone }).lean();
        
        if (!vendor) {
            console.log('❌ Test vendor not found in database');
            return;
        }

        console.log('\n📋 Vendor Details:');
        console.log(`   Name: ${vendor.name}`);
        console.log(`   Phone: ${vendor.contactNumber}`);
        console.log(`   WhatsApp Consent: ${vendor.whatsappConsent}`);
        console.log(`   Status: ${vendor.status}`);
        console.log(`   Created: ${vendor.createdAt}`);
        console.log(`   Updated: ${vendor.updatedAt}`);

        // Check operating hours
        if (vendor.operatingHours) {
            console.log('\n🕐 Operating Hours:');
            console.log(`   Open Time: ${vendor.operatingHours.openTime}`);
            console.log(`   Close Time: ${vendor.operatingHours.closeTime}`);
            console.log(`   Days: ${vendor.operatingHours.days}`);
            
            // Check if vendor is open today
            const now = moment().tz('Asia/Kolkata');
            const today = now.day();
            const isOpenToday = vendor.operatingHours.days && vendor.operatingHours.days.includes(today);
            console.log(`   Open Today (${today}): ${isOpenToday}`);
            
            // Calculate time until opening
            if (vendor.operatingHours.openTime) {
                const openTime = moment.tz(vendor.operatingHours.openTime, ['h:mm A', 'HH:mm', 'H:mm'], 'Asia/Kolkata');
                if (openTime.isValid()) {
                    openTime.set({
                        year: now.year(),
                        month: now.month(),
                        date: now.date(),
                    });
                    const diff = openTime.diff(now, 'minutes');
                    console.log(`   Minutes until opening: ${diff}`);
                    console.log(`   Opening time today: ${openTime.format('HH:mm')}`);
                }
            }
        } else {
            console.log('\n❌ No operating hours configured');
        }

        // Check recent messages
        console.log('\n💬 Recent Messages (last 7 days):');
        const sevenDaysAgo = moment().subtract(7, 'days').toDate();
        const messages = await Message.find({
            $or: [
                { from: testPhone },
                { from: `whatsapp:${testPhone}` },
                { to: testPhone },
                { to: `whatsapp:${testPhone}` }
            ],
            timestamp: { $gte: sevenDaysAgo }
        })
        .sort({ timestamp: -1 })
        .limit(10)
        .lean();

        if (messages.length === 0) {
            console.log('   No messages found in last 7 days');
        } else {
            messages.forEach((msg, index) => {
                const direction = msg.direction === 'inbound' ? '📥' : '📤';
                const time = moment(msg.timestamp).format('MM/DD HH:mm');
                const body = msg.body ? msg.body.substring(0, 50) + '...' : 'No body';
                console.log(`   ${index + 1}. ${direction} ${time} - ${body}`);
            });
        }

        // Check for location reminders specifically
        console.log('\n📍 Location Reminders (last 7 days):');
        const locationReminders = await Message.find({
            to: { $in: [testPhone, `whatsapp:${testPhone}`] },
            $or: [
                { body: 'HXbdb716843483717790c45c951b71701e' },
                { 'meta.reminderType': { $exists: true } }
            ],
            timestamp: { $gte: sevenDaysAgo }
        })
        .sort({ timestamp: -1 })
        .lean();

        if (locationReminders.length === 0) {
            console.log('   No location reminders sent in last 7 days');
        } else {
            locationReminders.forEach((msg, index) => {
                const time = moment(msg.timestamp).format('MM/DD HH:mm');
                const reminderType = msg.meta?.reminderType || 'unknown';
                console.log(`   ${index + 1}. ${time} - ${reminderType}`);
            });
        }

        // Check if vendor has shared location today
        console.log('\n📍 Location Sharing Today:');
        const today = moment().tz('Asia/Kolkata').startOf('day').toDate();
        const locationMessages = await Message.find({
            from: { $in: [testPhone, `whatsapp:${testPhone}`] },
            timestamp: { $gte: today },
            $or: [
                { 'location.latitude': { $exists: true } },
                { body: { $regex: /location|shared|updated/i } }
            ]
        }).lean();

        if (locationMessages.length === 0) {
            console.log('   No location shared today');
        } else {
            console.log(`   ${locationMessages.length} location messages today`);
            locationMessages.forEach((msg, index) => {
                const time = moment(msg.timestamp).format('HH:mm');
                console.log(`   ${index + 1}. ${time} - ${msg.body || 'Location data'}`);
            });
        }

        // Check if vendor should receive reminders
        console.log('\n🎯 Reminder Eligibility:');
        const shouldReceiveReminders = vendor.whatsappConsent && 
                                     vendor.contactNumber && 
                                     vendor.operatingHours && 
                                     vendor.operatingHours.openTime;
        
        console.log(`   WhatsApp Consent: ${vendor.whatsappConsent ? '✅' : '❌'}`);
        console.log(`   Has Phone Number: ${vendor.contactNumber ? '✅' : '❌'}`);
        console.log(`   Has Operating Hours: ${vendor.operatingHours ? '✅' : '❌'}`);
        console.log(`   Has Open Time: ${vendor.operatingHours?.openTime ? '✅' : '❌'}`);
        console.log(`   Should Receive Reminders: ${shouldReceiveReminders ? '✅' : '❌'}`);

    } catch (error) {
        console.error('❌ Error checking test vendor:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

checkTestVendor();
