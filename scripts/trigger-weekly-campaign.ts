import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const API_BASE_URL = process.env.VITE_API_BASE_URL || 'https://whatsappdashboard-1.onrender.com';

async function triggerWeeklyCampaign() {
  try {
    console.log('🚀 TRIGGERING WEEKLY VENDOR MESSAGE CAMPAIGN');
    console.log('============================================');
    console.log(`📡 API Base URL: ${API_BASE_URL}`);
    console.log(`⏰ Time: ${new Date().toLocaleString()}`);
    
    // First, check current status
    console.log('\n📊 Checking current campaign status...');
    try {
      const statusResponse = await axios.get(`${API_BASE_URL}/api/vendor/weekly-campaign-status`);
      console.log('✅ Current status:', statusResponse.data);
      
      if (statusResponse.data.today.sent > 0) {
        console.log(`⚠️  Campaign already sent today: ${statusResponse.data.today.sent}/${statusResponse.data.today.total} messages`);
        console.log('💡 Use the API endpoint to view details or force re-send');
        return;
      }
    } catch (statusError) {
      console.log('⚠️  Could not check status, proceeding with campaign...');
    }
    
    // Trigger the campaign
    console.log('\n📤 Triggering weekly campaign...');
    const response = await axios.post(`${API_BASE_URL}/api/vendor/trigger-weekly-campaign`);
    
    console.log('✅ Campaign triggered successfully!');
    console.log('📋 Response:', response.data);
    
    if (response.data.success) {
      console.log('\n📊 CAMPAIGN RESULTS:');
      console.log('==================');
      console.log(`✅ Successful: ${response.data.summary.successful}`);
      console.log(`❌ Failed: ${response.data.summary.failed}`);
      console.log(`📊 Total: ${response.data.summary.total}`);
      
      if (response.data.results && response.data.results.length > 0) {
        console.log('\n📋 Sample Results (first 10):');
        response.data.results.forEach((result: any, index: number) => {
          const status = result.success ? '✅' : '❌';
          console.log(`${index + 1}. ${status} ${result.vendorName} (${result.phone})`);
          if (!result.success) {
            console.log(`   Error: ${result.error}`);
          }
        });
      }
    } else {
      console.log('❌ Campaign failed:', response.data.message);
    }
    
  } catch (error) {
    console.error('❌ Error triggering campaign:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
    }
  }
}

// Run the campaign trigger
triggerWeeklyCampaign();
