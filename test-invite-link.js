// Test script for invite link functionality
// This script helps debug invite link issues

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
        return true;
    } catch (error) {
        console.log('❌ Admin login failed:', error.response?.data?.message || error.message);
        return false;
    }
}

async function testInviteEmployee() {
    console.log('\n📧 Testing: Send employee invitation');
    
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
        
        console.log('✅ Employee invitation sent successfully');
        console.log('📊 Response:', {
            success: response.data.success,
            message: response.data.message,
            employeeId: response.data.data.employee.id,
            invitationLink: response.data.data.invitationLink
        });
        
        // Extract token from invitation link
        const invitationLink = response.data.data.invitationLink;
        const tokenMatch = invitationLink.match(/token=([^&]+)/);
        const invitationToken = tokenMatch ? tokenMatch[1] : null;
        
        console.log('🔑 Extracted invitation token:', invitationToken);
        
        return { invitationToken, employeeId: response.data.data.employee.id };
    } catch (error) {
        console.log('❌ Employee invitation failed:', error.response?.data?.message || error.message);
        return null;
    }
}

async function testGetEmployeeByToken(invitationToken) {
    console.log('\n🔍 Testing: Get employee by invitation token');
    
    if (!invitationToken) {
        console.log('❌ No invitation token provided');
        return null;
    }
    
    try {
        const response = await axios.get(`${API_URL}/register/${invitationToken}`);
        
        console.log('✅ Employee found by invitation token');
        console.log('📊 Employee data:', {
            id: response.data.data.employee.id,
            name: `${response.data.data.employee.firstName} ${response.data.data.employee.lastName}`,
            email: response.data.data.employee.email,
            salary: response.data.data.employee.salary
        });
        
        return response.data.data.employee;
    } catch (error) {
        console.log('❌ Get employee by token failed:', error.response?.data?.message || error.message);
        if (error.response?.data) {
            console.log('📋 Error details:', error.response.data);
        }
        return null;
    }
}

async function testCompleteRegistration(invitationToken) {
    console.log('\n📝 Testing: Complete employee registration');
    
    if (!invitationToken) {
        console.log('❌ No invitation token provided');
        return null;
    }
    
    const registrationData = {
        phone: '1234567890',
        address: '123 Main St, City',
        gender: 'Male',
        dateOfBirth: '1990-01-01',
        age: 34,
        aadharCardNumber: '123456789012',
        employeeType: 'advocate',
        advocateLicenseNumber: 'ABC123',
        salary: 50000,
        department: 'Legal',
        position: 'Senior Advocate',
        startDate: '2024-01-01',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '0987654321',
        emergencyContactRelation: 'Spouse',
        password: 'employee123',
        confirmPassword: 'employee123'
    };
    
    try {
        const response = await axios.post(`${API_URL}/register/${invitationToken}`, registrationData, {
            headers: { 'Content-Type': 'application/json' }
        });
        
        console.log('✅ Employee registration completed successfully');
        console.log('📊 Registration response:', {
            success: response.data.success,
            message: response.data.message,
            employeeId: response.data.data.employee.id,
            token: response.data.token ? 'JWT token received' : 'No token'
        });
        
        return response.data;
    } catch (error) {
        console.log('❌ Employee registration failed:', error.response?.data?.message || error.message);
        if (error.response?.data) {
            console.log('📋 Error details:', error.response.data);
        }
        return null;
    }
}

async function testEmployeeLogin() {
    console.log('\n🔐 Testing: Employee login after registration');
    
    try {
        const response = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'john.doe@example.com',
            password: 'employee123'
        });
        
        console.log('✅ Employee login successful');
        console.log('📊 Login response:', {
            success: response.data.success,
            userRole: response.data.user.role,
            employeeId: response.data.user.id,
            name: `${response.data.user.firstName} ${response.data.user.lastName}`
        });
        
        return response.data;
    } catch (error) {
        console.log('❌ Employee login failed:', error.response?.data?.message || error.message);
        return null;
    }
}

async function runInviteTests() {
    console.log('🚀 Starting Invite Link Tests');
    console.log('==============================');
    
    // Login as admin
    const loginSuccess = await loginAsAdmin();
    if (!loginSuccess) {
        console.log('❌ Cannot proceed without admin authentication');
        return;
    }
    
    // Test invite employee
    const inviteResult = await testInviteEmployee();
    if (!inviteResult) {
        console.log('❌ Cannot proceed without successful invitation');
        return;
    }
    
    const { invitationToken, employeeId } = inviteResult;
    
    // Test get employee by token
    const employeeData = await testGetEmployeeByToken(invitationToken);
    if (!employeeData) {
        console.log('❌ Cannot proceed without successful token lookup');
        return;
    }
    
    // Test complete registration
    const registrationResult = await testCompleteRegistration(invitationToken);
    if (!registrationResult) {
        console.log('❌ Cannot proceed without successful registration');
        return;
    }
    
    // Test employee login
    const loginResult = await testEmployeeLogin();
    if (!loginResult) {
        console.log('❌ Employee login failed after registration');
        return;
    }
    
    console.log('\n🏁 All invite link tests completed successfully!');
    console.log('\n📝 Summary:');
    console.log('- ✅ Employee invitation sent');
    console.log('- ✅ Invitation token generated');
    console.log('- ✅ Employee found by token');
    console.log('- ✅ Employee registration completed');
    console.log('- ✅ Employee can login');
    console.log('\n🎯 Invite link functionality is working correctly!');
}

// Run the tests
runInviteTests().catch(console.error);
