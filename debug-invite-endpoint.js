// Debug script for invite endpoint authentication issue
// This script helps identify why the invite endpoint is failing

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5004';
const API_URL = `${BASE_URL}/api/employees`;

// Test data
const adminCredentials = {
    email: 'admin@example.com',
    password: 'admin123'
};

let adminToken = '';

async function loginAsAdmin() {
    console.log('🔐 Logging in as admin...');
    
    try {
        const response = await axios.post(`${BASE_URL}/api/auth/login`, adminCredentials);
        adminToken = response.data.token;
        console.log('✅ Admin login successful');
        console.log('🔑 JWT Token received:', adminToken ? 'Yes' : 'No');
        console.log('👤 Admin data:', {
            id: response.data.user.id,
            email: response.data.user.email,
            role: response.data.user.role,
            organization: response.data.user.organization
        });
        return true;
    } catch (error) {
        console.log('❌ Admin login failed:', error.response?.data?.message || error.message);
        if (error.response?.data) {
            console.log('📋 Error details:', error.response.data);
        }
        return false;
    }
}

async function testInviteWithoutToken() {
    console.log('\n🚫 Testing: Invite without token (should fail)');
    
    const inviteData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        salary: 50000
    };
    
    try {
        const response = await axios.post(`${API_URL}/invite`, inviteData);
        console.log('❌ This should have failed but succeeded:', response.data);
    } catch (error) {
        console.log('✅ Correctly failed without token');
        console.log('📋 Error:', error.response?.data?.message || error.message);
        console.log('📊 Status:', error.response?.status);
    }
}

async function testInviteWithInvalidToken() {
    console.log('\n🚫 Testing: Invite with invalid token (should fail)');
    
    const inviteData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        salary: 50000
    };
    
    try {
        const response = await axios.post(`${API_URL}/invite`, inviteData, {
            headers: { 'Authorization': 'Bearer invalid_token_123' }
        });
        console.log('❌ This should have failed but succeeded:', response.data);
    } catch (error) {
        console.log('✅ Correctly failed with invalid token');
        console.log('📋 Error:', error.response?.data?.message || error.message);
        console.log('📊 Status:', error.response?.status);
    }
}

async function testInviteWithValidToken() {
    console.log('\n✅ Testing: Invite with valid admin token');
    
    const inviteData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        salary: 50000
    };
    
    try {
        const response = await axios.post(`${API_URL}/invite`, inviteData, {
            headers: { 
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Invite successful with valid token');
        console.log('📊 Response:', {
            success: response.data.success,
            message: response.data.message,
            employeeId: response.data.data.employee.id,
            invitationLink: response.data.data.invitationLink ? 'Generated' : 'Not generated'
        });
        
        return response.data;
    } catch (error) {
        console.log('❌ Invite failed with valid token:', error.response?.data?.message || error.message);
        console.log('📊 Status:', error.response?.status);
        if (error.response?.data) {
            console.log('📋 Error details:', error.response.data);
        }
        return null;
    }
}

async function testTokenValidation() {
    console.log('\n🔍 Testing: Token validation');
    
    if (!adminToken) {
        console.log('❌ No admin token available for testing');
        return;
    }
    
    try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.decode(adminToken);
        
        console.log('🔍 JWT Token Details:');
        console.log(`   - Admin ID: ${decoded.id}`);
        console.log(`   - Email: ${decoded.email}`);
        console.log(`   - Role: ${decoded.role}`);
        console.log(`   - Organization: ${decoded.organization}`);
        console.log(`   - Expires: ${new Date(decoded.exp * 1000)}`);
        
        // Check if token is expired
        const now = Math.floor(Date.now() / 1000);
        if (decoded.exp < now) {
            console.log('⚠️ Token is expired!');
        } else {
            console.log('✅ Token is valid and not expired');
        }
        
    } catch (error) {
        console.log('❌ Token validation failed:', error.message);
    }
}

async function testDifferentAuthHeaders() {
    console.log('\n🔍 Testing: Different authorization header formats');
    
    const inviteData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        salary: 50000
    };
    
    const testCases = [
        { name: 'Bearer token', header: `Bearer ${adminToken}` },
        { name: 'Token without Bearer', header: adminToken },
        { name: 'Lowercase bearer', header: `bearer ${adminToken}` },
        { name: 'Extra spaces', header: `Bearer  ${adminToken}` }
    ];
    
    for (const testCase of testCases) {
        try {
            console.log(`\n🧪 Testing: ${testCase.name}`);
            const response = await axios.post(`${API_URL}/invite`, inviteData, {
                headers: { 'Authorization': testCase.header }
            });
            
            console.log(`   ✅ ${testCase.name} worked!`);
            break; // Stop on first success
        } catch (error) {
            console.log(`   ❌ ${testCase.name} failed: ${error.response?.data?.message || error.message}`);
        }
    }
}

async function runDebugTests() {
    console.log('🐛 Starting Invite Endpoint Debug');
    console.log('=================================');
    
    // Test admin login
    const loginSuccess = await loginAsAdmin();
    if (!loginSuccess) {
        console.log('❌ Cannot proceed without admin authentication');
        return;
    }
    
    // Test token validation
    await testTokenValidation();
    
    // Test invite without token
    await testInviteWithoutToken();
    
    // Test invite with invalid token
    await testInviteWithInvalidToken();
    
    // Test invite with valid token
    const inviteResult = await testInviteWithValidToken();
    
    // Test different auth header formats
    await testDifferentAuthHeaders();
    
    console.log('\n🏁 Debug completed!');
    console.log('\n📝 Common Issues:');
    console.log('1. Missing Authorization header');
    console.log('2. Invalid JWT token');
    console.log('3. Expired JWT token');
    console.log('4. Wrong authorization header format');
    console.log('5. Token belongs to non-admin user');
    console.log('\n🔧 Solutions:');
    console.log('1. Ensure you\'re logged in as admin');
    console.log('2. Include Authorization header: "Bearer YOUR_TOKEN"');
    console.log('3. Check if token is expired');
    console.log('4. Verify user has admin role');
}

// Run the debug tests
runDebugTests().catch(console.error);
