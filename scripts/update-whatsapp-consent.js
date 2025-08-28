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

async function updateWhatsAppConsent() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        console.log('\n📊 Updating WhatsApp consent for all vendors...');

        // Get current stats
        const totalVendors = await User.countDocuments();
        const vendorsWithConsent = await User.countDocuments({ whatsappConsent: true });
        const vendorsWithoutConsent = await User.countDocuments({ whatsappConsent: { $ne: true } });

        console.log(`📈 Current stats:`);
        console.log(`   - Total vendors: ${totalVendors}`);
        console.log(`   - Vendors with consent: ${vendorsWithConsent}`);
        console.log(`   - Vendors without consent: ${vendorsWithoutConsent}`);

        if (vendorsWithoutConsent === 0) {
            console.log('✅ All vendors already have WhatsApp consent enabled!');
            return;
        }

        // Update all vendors to have WhatsApp consent
        const result = await User.updateMany(
            { whatsappConsent: { $ne: true } }, // Update vendors that don't have consent
            { 
                $set: { 
                    whatsappConsent: true,
                    updatedAt: new Date()
                } 
            }
        );

        console.log(`✅ Successfully updated ${result.modifiedCount} vendors`);

        // Verify the update
        const updatedVendorsWithConsent = await User.countDocuments({ whatsappConsent: true });
        const remainingVendorsWithoutConsent = await User.countDocuments({ whatsappConsent: { $ne: true } });

        console.log(`\n📊 Updated stats:`);
        console.log(`   - Total vendors: ${totalVendors}`);
        console.log(`   - Vendors with consent: ${updatedVendorsWithConsent}`);
        console.log(`   - Vendors without consent: ${remainingVendorsWithoutConsent}`);

        if (remainingVendorsWithoutConsent === 0) {
            console.log('🎉 All vendors now have WhatsApp consent enabled!');
        } else {
            console.log(`⚠️  ${remainingVendorsWithoutConsent} vendors still don't have consent`);
        }

        // Show some sample vendors for verification
        console.log('\n📋 Sample vendors with updated consent:');
        const sampleVendors = await User.find({ whatsappConsent: true })
            .select('name contactNumber whatsappConsent updatedAt')
            .sort({ updatedAt: -1 })
            .limit(5)
            .lean();

        sampleVendors.forEach((vendor, index) => {
            console.log(`   ${index + 1}. ${vendor.name} (${vendor.contactNumber}) - Consent: ${vendor.whatsappConsent}`);
        });

    } catch (error) {
        console.error('❌ Error updating WhatsApp consent:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

updateWhatsAppConsent();
