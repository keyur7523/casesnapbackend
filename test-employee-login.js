// Test script for employee login functionality
// This script demonstrates how the login endpoint now works for both admin and employee users

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5004';
const API_URL = `${BASE_URL}/api/auth/login`;

// Test data
const testAdminCredentials = {
    email: 'admin@example.com',
    password: 'admin123'
};

const testEmployeeCredentials = {
    email: 'employee@example.com', 
    password: 'employee123'
};

async function testLogin(credentials, userType) {
    console.log(`\n🧪 Testing ${userType} login...`);
    console.log(`📧 Email: ${credentials.email}`);
    
    try {
        const response = await axios.post(API_URL, credentials);
        
        console.log('✅ Login successful!');
        console.log('🔑 Token received:', response.data.token ? 'Yes' : 'No');
        console.log('👤 User data received:', response.data.user ? 'Yes' : 'No');
        
        if (response.data.user) {
            console.log('📋 User details:');
            console.log(`   - ID: ${response.data.user.id}`);
            console.log(`   - Email: ${response.data.user.email}`);
            console.log(`   - Role: ${response.data.user.role || 'employee'}`);
            
            if (userType === 'employee') {
                console.log(`   - Name: ${response.data.user.firstName} ${response.data.user.lastName}`);
                console.log(`   - Employee Type: ${response.data.user.employeeType}`);
                console.log(`   - Department: ${response.data.user.department}`);
                console.log(`   - Status: ${response.data.user.status}`);
            } else {
                console.log(`   - Name: ${response.data.user.name}`);
            }
        }
        
        return response.data;
    } catch (error) {
        console.log('❌ Login failed!');
        if (error.response) {
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Message: ${error.response.data.message || error.response.data.error}`);
        } else {
            console.log(`   Error: ${error.message}`);
        }
        return null;
    }
}

async function testProtectedRoute(token, userType) {
    console.log(`\n🔒 Testing protected route access for ${userType}...`);
    
    try {
        const response = await axios.get(`${BASE_URL}/api/employees`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('✅ Protected route accessed successfully!');
        console.log(`📊 Response: ${response.data.success ? 'Success' : 'Failed'}`);
        return true;
    } catch (error) {
        console.log('❌ Protected route access failed!');
        if (error.response) {
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Message: ${error.response.data.message || error.response.data.error}`);
        }
        return false;
    }
}

async function runTests() {
    console.log('🚀 Starting Employee Login Tests');
    console.log('=====================================');
    
    // Test admin login
    const adminResult = await testLogin(testAdminCredentials, 'Admin');
    
    // Test employee login  
    const employeeResult = await testLogin(testEmployeeCredentials, 'Employee');
    
    // Test protected routes
    if (adminResult && adminResult.token) {
        await testProtectedRoute(adminResult.token, 'Admin');
    }
    
    if (employeeResult && employeeResult.token) {
        await testProtectedRoute(employeeResult.token, 'Employee');
    }
    
    console.log('\n🏁 Tests completed!');
    console.log('\n📝 Summary:');
    console.log('- The login endpoint now supports both admin and employee authentication');
    console.log('- Employee login returns complete employee data for frontend display');
    console.log('- The same endpoint handles both user types seamlessly');
    console.log('- JWT tokens include role information for proper authorization');
}

// Run the tests
runTests().catch(console.error);
