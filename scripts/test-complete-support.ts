import 'dotenv/config';

async function testCompleteSupport() {
    try {
        console.log('🧪 Testing support call completion...');
        
        // First, get the support call ID
        const supportCallsResponse = await fetch('http://localhost:5000/api/webhook/support-calls');
        const supportCalls = await supportCallsResponse.json();
        
        if (supportCalls.length === 0) {
            console.log('❌ No support calls found. Run the webhook test first.');
            return;
        }
        
        const supportCall = supportCalls[0];
        console.log('📋 Found support call:', supportCall._id);
        
        // Test completion
        const token = 'test-token'; // For testing, we'll use a dummy token
        const response = await fetch(`http://localhost:5000/api/webhook/support-calls/${supportCall._id}/complete`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });
        
        console.log('📡 Completion Response Status:', response.status);
        
        if (response.ok) {
            const updated = await response.json();
            console.log('✅ Support call completed successfully!');
            console.log('📋 Updated data:', updated);
        } else {
            const error = await response.text();
            console.log('❌ Completion failed:', error);
        }
        
    } catch (error) {
        console.error('❌ Error testing completion:', error);
    }
}

testCompleteSupport(); 