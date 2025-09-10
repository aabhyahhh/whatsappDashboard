import 'dotenv/config';
import mongoose from 'mongoose';

// Database connection
const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
    console.error('❌ MONGODB_URI is not defined');
    process.exit(1);
}

// Import User model
const { User } = await import('../server/models/User.js');

async function verifyWhatsAppConsent() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        console.log('\n📊 Verifying WhatsApp consent status...');

        // Get comprehensive stats
        const totalVendors = await User.countDocuments();
        const vendorsWithConsent = await User.countDocuments({ whatsappConsent: true });
        const vendorsWithoutConsent = await User.countDocuments({ whatsappConsent: { $ne: true } });
        const vendorsWithNullConsent = await User.countDocuments({ whatsappConsent: null });
        const vendorsWithFalseConsent = await User.countDocuments({ whatsappConsent: false });

        console.log(`📈 WhatsApp Consent Status:`);
        console.log(`   - Total vendors: ${totalVendors}`);
        console.log(`   - Vendors with consent (true): ${vendorsWithConsent}`);
        console.log(`   - Vendors without consent (false/null): ${vendorsWithoutConsent}`);
        console.log(`   - Vendors with null consent: ${vendorsWithNullConsent}`);
        console.log(`   - Vendors with false consent: ${vendorsWithFalseConsent}`);

        // Calculate percentage
        const consentPercentage = totalVendors > 0 ? ((vendorsWithConsent / totalVendors) * 100).toFixed(2) : 0;
        console.log(`   - Consent rate: ${consentPercentage}%`);

        if (vendorsWithoutConsent === 0) {
            console.log('✅ All vendors have WhatsApp consent enabled!');
        } else {
            console.log(`⚠️  ${vendorsWithoutConsent} vendors still need consent`);
            
            // Show vendors without consent
            console.log('\n📋 Vendors without consent:');
            const vendorsNeedingConsent = await User.find({ whatsappConsent: { $ne: true } })
                .select('name contactNumber whatsappConsent createdAt')
                .sort({ createdAt: -1 })
                .limit(10)
                .lean();

            vendorsNeedingConsent.forEach((vendor, index) => {
                console.log(`   ${index + 1}. ${vendor.name} (${vendor.contactNumber}) - Consent: ${vendor.whatsappConsent}`);
            });

            if (vendorsNeedingConsent.length > 10) {
                console.log(`   ... and ${vendorsNeedingConsent.length - 10} more vendors`);
            }
        }

        // Show recent vendors with consent
        console.log('\n📋 Recent vendors with consent:');
        const recentVendorsWithConsent = await User.find({ whatsappConsent: true })
            .select('name contactNumber whatsappConsent updatedAt')
            .sort({ updatedAt: -1 })
            .limit(5)
            .lean();

        recentVendorsWithConsent.forEach((vendor, index) => {
            const updatedDate = vendor.updatedAt ? new Date(vendor.updatedAt).toLocaleDateString() : 'Unknown';
            console.log(`   ${index + 1}. ${vendor.name} (${vendor.contactNumber}) - Updated: ${updatedDate}`);
        });

        // Check for vendors with phone numbers (required for WhatsApp)
        const vendorsWithPhone = await User.countDocuments({ 
            contactNumber: { $exists: true, $ne: null, $ne: '' } 
        });
        const vendorsWithoutPhone = totalVendors - vendorsWithPhone;

        console.log(`\n📱 Phone Number Status:`);
        console.log(`   - Vendors with phone numbers: ${vendorsWithPhone}`);
        console.log(`   - Vendors without phone numbers: ${vendorsWithoutPhone}`);

        if (vendorsWithoutPhone > 0) {
            console.log('\n⚠️  Vendors without phone numbers (cannot receive WhatsApp):');
            const vendorsNoPhone = await User.find({ 
                $or: [
                    { contactNumber: { $exists: false } },
                    { contactNumber: null },
                    { contactNumber: '' }
                ]
            })
            .select('name contactNumber whatsappConsent')
            .limit(5)
            .lean();

            vendorsNoPhone.forEach((vendor, index) => {
                console.log(`   ${index + 1}. ${vendor.name} - Phone: ${vendor.contactNumber || 'Missing'}`);
            });
        }

        console.log('\n🎯 Summary:');
        if (vendorsWithoutConsent === 0 && vendorsWithoutPhone === 0) {
            console.log('✅ All vendors are ready for WhatsApp messaging!');
        } else if (vendorsWithoutConsent === 0) {
            console.log('✅ All vendors have consent, but some lack phone numbers');
        } else {
            console.log('⚠️  Some vendors still need consent or phone numbers');
        }

    } catch (error) {
        console.error('❌ Error verifying WhatsApp consent:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

verifyWhatsAppConsent();
