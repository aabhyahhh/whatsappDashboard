import path from 'path';
import dotenv from 'dotenv';

// Load .env file explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function testContactsAPI() {
  try {
    console.log('🧪 TESTING CONTACTS API ENDPOINT');
    console.log('==================================');

    const apiBaseUrl = process.env.VITE_API_BASE_URL || 'https://whatsappdashboard-1.onrender.com';
    console.log(`🌐 Testing contacts API at: ${apiBaseUrl}/api/contacts`);

    const response = await fetch(`${apiBaseUrl}/api/contacts`);
    
    console.log(`Status: ${response.status}`);
    
    if (response.ok) {
      const contacts = await response.json();
      console.log(`✅ Contacts API working! Found ${contacts.length} contacts`);
      
      if (contacts.length > 0) {
        console.log('\n📋 Sample contacts:');
        contacts.slice(0, 5).forEach((contact: any, index: number) => {
          console.log(`${index + 1}. ${contact.name || 'Unknown'} (${contact.phone})`);
          console.log(`   Last seen: ${contact.lastSeen ? new Date(contact.lastSeen).toLocaleString() : 'Never'}`);
        });
      }
    } else {
      const errorText = await response.text();
      console.log(`❌ Contacts API failed: ${errorText}`);
    }

  } catch (error) {
    console.error('❌ Error testing contacts API:', error);
  }
}

testContactsAPI();
