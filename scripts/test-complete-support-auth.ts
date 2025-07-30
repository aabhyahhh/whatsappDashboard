import 'dotenv/config';
import jwt from 'jsonwebtoken';

async function testCompleteSupportWithAuth() {
    try {
        console.log('🧪 Testing support call completion with authentication...');
        
        // Create a test JWT token
        const JWT_SECRET = process.env.JWT_SECRET || '123';
        const testToken = jwt.sign(
            { 
                id: 'test-admin-id',
                username: 'test-admin',
                role: 'admin' 
            },
            JWT_SECRET,
            { expiresIn: '1h' }
        );
        
        console.log('🔑 Generated test token for admin user');
        
        // First, get the support call ID
        const supportCallsResponse = await fetch('http://localhost:5000/api/webhook/support-calls');
        const supportCalls = await supportCallsResponse.json();
        
        if (supportCalls.length === 0) {
            console.log('❌ No support calls found. Run the webhook test first.');
            return;
        }
        
        const supportCall = supportCalls[0];
        console.log('📋 Found support call:', supportCall._id);
        console.log('📋 Current status:', supportCall.completed ? 'Completed' : 'Pending');
        
        // Test completion
        const response = await fetch(`http://localhost:5000/api/webhook/support-calls/${supportCall._id}/complete`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${testToken}`,
            },
        });
        
        console.log('📡 Completion Response Status:', response.status);
        
        if (response.ok) {
            const updated = await response.json();
            console.log('✅ Support call completed successfully!');
            console.log('📋 Updated data:', updated);
            console.log('⏱️ Time taken:', updated.completedAt ? new Date(updated.completedAt).toLocaleString() : 'N/A');
        } else {
            const error = await response.text();
            console.log('❌ Completion failed:', error);
        }
        
    } catch (error) {
        console.error('❌ Error testing completion:', error);
    }
}

testCompleteSupportWithAuth(); 