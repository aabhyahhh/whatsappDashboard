import { client, createFreshClient } from '../server/twilio.js';

console.log('🧪 Testing Twilio imports...');
console.log('================================');

console.log('📊 Client check:');
console.log('- client exists:', !!client);
console.log('- client type:', typeof client);

console.log('\n📊 createFreshClient check:');
console.log('- createFreshClient exists:', !!createFreshClient);
console.log('- createFreshClient type:', typeof createFreshClient);

if (createFreshClient) {
  console.log('\n🔧 Testing createFreshClient function...');
  const freshClient = createFreshClient();
  console.log('- freshClient created:', !!freshClient);
  console.log('- freshClient type:', typeof freshClient);
}

console.log('\n✅ Twilio imports test completed successfully!');
