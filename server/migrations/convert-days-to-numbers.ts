import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { connectDB } from '../db.js';

const dayNameToNumber: { [key: string]: number } = {
    'sunday': 0,
    'monday': 1,
    'tuesday': 2,
    'wednesday': 3,
    'thursday': 4,
    'friday': 5,
    'saturday': 6,
};

const migrateDays = async () => {
    // Establish DB connection
    await connectDB();
    console.log('Starting migration to convert operatingHours.days to numbers...');

    const users = await User.find({ 'operatingHours.days': { $type: 'string' } }).exec();

    if (users.length === 0) {
        console.log('No users found with string-based days. Migration not needed.');
        await mongoose.disconnect();
        return;
    }

    console.log(`Found ${users.length} users to migrate.`);
    let updatedCount = 0;

    for (const user of users) {
        if (user.operatingHours && Array.isArray(user.operatingHours.days)) {
            const originalDays = [...user.operatingHours.days];
            const newDays = (user.operatingHours.days as any[])
                .map(day => {
                    if (typeof day === 'string') {
                        return dayNameToNumber[day.toLowerCase()];
                    }
                    // if it's somehow already a number, keep it
                    if (typeof day === 'number') {
                        return day;
                    }
                    return undefined;
                })
                .filter((day): day is number => day !== undefined && day !== null);

            // Avoid saving if no change happened or if conversion resulted in an empty array from a non-empty one
            if (newDays.length > 0) {
                 // Mongoose needs a little help when changing array types
                (user.operatingHours.days as any) = newDays;
                try {
                    await user.save({ validateModifiedOnly: true });
                    console.log(`Successfully updated user: ${user.name} (${user._id})`);
                    updatedCount++;
                } catch (error) {
                    console.error(`Failed to update user ${user.name} (${user._id}):`, error);
                }
            } else {
                 console.log(`Skipping user ${user.name} (${user._id}) - conversion resulted in empty days.`);
            }
        }
    }

    console.log(`\nMigration Complete. Successfully updated ${updatedCount} out of ${users.length} users.`);
    
    // Disconnect from the database
    await mongoose.disconnect();
    console.log('Disconnected from database.');
};

migrateDays().catch(err => {
    console.error('Migration script failed:', err);
    mongoose.disconnect();
    process.exit(1);
});
