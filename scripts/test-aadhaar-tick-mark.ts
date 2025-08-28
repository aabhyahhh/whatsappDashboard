import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Test Aadhaar verification tick mark functionality
async function testAadhaarTickMark() {
  try {
    const webhookUrl = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhook';
    const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
    
    console.log('🧪 Testing Aadhaar Verification Tick Mark');
    console.log('=========================================');
    console.log(`📡 Webhook URL: ${webhookUrl}`);
    console.log(`🌐 API Base URL: ${apiBaseUrl}`);
    
    // Test 1: Send button payload for Aadhaar verification
    console.log('\n📤 Test 1: Sending Aadhaar verification button click...');
    const buttonPayload = {
      From: 'whatsapp:+918130026321', // Test vendor number
      To: 'whatsapp:+15557897194',    // Twilio number
      Body: '',
      ButtonPayload: 'Yes, I will verify Aadhar'
    };

    const response1 = await axios.post(webhookUrl, buttonPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('✅ Button click response status:', response1.status);
    console.log('✅ Button click response data:', response1.data);
    
    // Wait 3 seconds
    console.log('\n⏳ Waiting 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 2: Send text message for Aadhaar verification
    console.log('\n📤 Test 2: Sending text Aadhaar verification message...');
    const textPayload = {
      From: 'whatsapp:+918130026321',
      To: 'whatsapp:+15557897194',
      Body: 'yes i will verify aadhar',
      ButtonPayload: null
    };

    const response2 = await axios.post(webhookUrl, textPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('✅ Text message response status:', response2.status);
    console.log('✅ Text message response data:', response2.data);
    
    // Wait 3 seconds
    console.log('\n⏳ Waiting 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 3: Check database for verification status
    console.log('\n📊 Test 3: Checking database for verification status...');
    try {
      // Check LoanReplyLog entries
      const loanRepliesResponse = await axios.get(`${apiBaseUrl}/api/webhook/loan-replies`);
      console.log('✅ Loan replies found:', loanRepliesResponse.data.length);
      
      const testVendorEntry = loanRepliesResponse.data.find((entry: any) => 
        entry.contactNumber === '+918130026321' || 
        entry.contactNumber === '918130026321' ||
        entry.contactNumber === '8130026321'
      );
      
      if (testVendorEntry) {
        console.log('✅ Found test vendor in LoanReplyLog:');
        console.log('   - Vendor Name:', testVendorEntry.vendorName);
        console.log('   - Contact Number:', testVendorEntry.contactNumber);
        console.log('   - Aadhaar Verified:', testVendorEntry.aadharVerified);
        console.log('   - Timestamp:', new Date(testVendorEntry.timestamp).toLocaleString());
        
        if (testVendorEntry.aadharVerified) {
          console.log('✅ SUCCESS: Aadhaar verification tick mark should appear in admin dashboard!');
        } else {
          console.log('❌ ISSUE: Aadhaar verification status is false in LoanReplyLog');
        }
      } else {
        console.log('❌ Test vendor not found in LoanReplyLog');
      }
      
    } catch (dbError) {
      console.error('❌ Failed to check database:', dbError);
    }
    
    // Test 4: Check User model verification status
    console.log('\n📊 Test 4: Checking User model verification status...');
    try {
      const usersResponse = await axios.get(`${apiBaseUrl}/api/users`);
      const testUser = usersResponse.data.find((user: any) => 
        user.contactNumber === '+918130026321' || 
        user.contactNumber === '918130026321' ||
        user.contactNumber === '8130026321'
      );
      
      if (testUser) {
        console.log('✅ Found test user in User model:');
        console.log('   - Name:', testUser.name);
        console.log('   - Contact Number:', testUser.contactNumber);
        console.log('   - Aadhaar Verified:', testUser.aadharVerified);
        console.log('   - Aadhaar Verification Date:', testUser.aadharVerificationDate ? new Date(testUser.aadharVerificationDate).toLocaleString() : 'Not set');
        
        if (testUser.aadharVerified) {
          console.log('✅ SUCCESS: User Aadhaar verification status is true!');
        } else {
          console.log('❌ ISSUE: User Aadhaar verification status is false');
        }
      } else {
        console.log('❌ Test user not found in User model');
      }
      
    } catch (userError) {
      console.error('❌ Failed to check User model:', userError);
    }

    console.log('\n📋 Summary:');
    console.log('   - Check server logs for Aadhaar verification processing');
    console.log('   - Verify visual confirmation message with tick mark is sent');
    console.log('   - Check if vendor Aadhaar verification status is updated');
    console.log('   - Verify both button click and text message triggers work');
    console.log('   - Look for ✅ emoji and "VERIFIED" status in messages');
    console.log('   - Check admin dashboard LoanReplyLog for tick mark');

  } catch (error) {
    console.error('❌ Test failed:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
    }
  }
}

// Run the test
testAadhaarTickMark();
