// Debug script for employee listing issues
// This script helps identify why no employees are returned

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
        console.log('👤 Admin data:', {
            id: response.data.user.id,
            email: response.data.user.email,
            role: response.data.user.role,
            organization: response.data.user.organization
        });
        return true;
    } catch (error) {
        console.log('❌ Admin login failed:', error.response?.data?.message || error.message);
        return false;
    }
}

async function debugEmployeeListing() {
    console.log('\n🔍 Debugging: Employee listing query');
    
    try {
        // Test basic employee listing
        const response = await axios.get(`${API_URL}/admin/all?page=1&limit=10`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        
        console.log('📊 API Response:');
        console.log(`   - Success: ${response.data.success}`);
        console.log(`   - Count: ${response.data.count}`);
        console.log(`   - Total Count: ${response.data.totalCount}`);
        console.log(`   - Total Pages: ${response.data.totalPages}`);
        console.log(`   - Current Page: ${response.data.currentPage}`);
        console.log(`   - Data Length: ${response.data.data.length}`);
        
        if (response.data.data.length > 0) {
            console.log('👤 Sample Employee:');
            const employee = response.data.data[0];
            console.log(`   - ID: ${employee.id}`);
            console.log(`   - Name: ${employee.firstName} ${employee.lastName}`);
            console.log(`   - Email: ${employee.email}`);
            console.log(`   - Organization: ${employee.organization}`);
            console.log(`   - Status: ${employee.status}`);
            console.log(`   - Is Deleted: ${employee.isDeleted}`);
        } else {
            console.log('⚠️ No employees found in response');
        }
        
        return response.data;
    } catch (error) {
        console.log('❌ Employee listing failed:', error.response?.data?.message || error.message);
        if (error.response?.data) {
            console.log('📋 Error details:', error.response.data);
        }
        return null;
    }
}

async function testDifferentFilters() {
    console.log('\n🔍 Testing: Different filter combinations');
    
    const testCases = [
        { name: 'Basic query', params: '?page=1&limit=10' },
        { name: 'Include deleted', params: '?page=1&limit=10&includeDeleted=true' },
        { name: 'All statuses', params: '?page=1&limit=10&status=all' },
        { name: 'Active status', params: '?page=1&limit=10&status=active' },
        { name: 'Pending status', params: '?page=1&limit=10&status=pending' },
        { name: 'No filters', params: '' }
    ];
    
    for (const testCase of testCases) {
        try {
            console.log(`\n🧪 Testing: ${testCase.name}`);
            const response = await axios.get(`${API_URL}/admin/all${testCase.params}`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            
            console.log(`   - Count: ${response.data.count}`);
            console.log(`   - Total Count: ${response.data.totalCount}`);
            console.log(`   - Filters: ${JSON.stringify(response.data.filters)}`);
            
            if (response.data.count > 0) {
                console.log(`   ✅ Found ${response.data.count} employees with this filter`);
                break;
            }
        } catch (error) {
            console.log(`   ❌ Error: ${error.response?.data?.message || error.message}`);
        }
    }
}

async function testDatabaseConnection() {
    console.log('\n🗄️ Testing: Database connection and data');
    
    try {
        // Test if we can access the basic employees endpoint
        const response = await axios.get(`${API_URL}`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        
        console.log('📊 Basic employees endpoint:');
        console.log(`   - Success: ${response.data.success}`);
        console.log(`   - Count: ${response.data.count}`);
        console.log(`   - Data Length: ${response.data.data.length}`);
        
        if (response.data.data.length > 0) {
            console.log('👤 Sample Employee from basic endpoint:');
            const employee = response.data.data[0];
            console.log(`   - ID: ${employee.id}`);
            console.log(`   - Name: ${employee.firstName} ${employee.lastName}`);
            console.log(`   - Email: ${employee.email}`);
            console.log(`   - Organization: ${employee.organization}`);
        }
        
        return response.data;
    } catch (error) {
        console.log('❌ Basic employees endpoint failed:', error.response?.data?.message || error.message);
        return null;
    }
}

async function checkAdminOrganization() {
    console.log('\n🏢 Checking: Admin organization details');
    
    try {
        // Decode JWT token to see admin details
        const jwt = require('jsonwebtoken');
        const decoded = jwt.decode(adminToken);
        
        console.log('🔍 JWT Token Details:');
        console.log(`   - Admin ID: ${decoded.id}`);
        console.log(`   - Email: ${decoded.email}`);
        console.log(`   - Role: ${decoded.role}`);
        console.log(`   - Organization: ${decoded.organization}`);
        
        return decoded;
    } catch (error) {
        console.log('❌ JWT decode failed:', error.message);
        return null;
    }
}

async function testEmployeeStatusFilter() {
    console.log('\n📊 Testing: Employee status filters');
    
    const statuses = ['pending', 'active', 'inactive', 'terminated'];
    
    for (const status of statuses) {
        try {
            console.log(`\n🧪 Testing status: ${status}`);
            const response = await axios.get(`${API_URL}/admin/all?status=${status}&limit=5`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            
            console.log(`   - Count: ${response.data.count}`);
            console.log(`   - Total Count: ${response.data.totalCount}`);
            
            if (response.data.count > 0) {
                console.log(`   ✅ Found employees with status: ${status}`);
                const employee = response.data.data[0];
                console.log(`   - Sample: ${employee.firstName} ${employee.lastName} (${employee.status})`);
            }
        } catch (error) {
            console.log(`   ❌ Error for status ${status}: ${error.response?.data?.message || error.message}`);
        }
    }
}

async function runDebugTests() {
    console.log('🐛 Starting Employee Listing Debug');
    console.log('==================================');
    
    // Login as admin
    const loginSuccess = await loginAsAdmin();
    if (!loginSuccess) {
        console.log('❌ Cannot proceed without admin authentication');
        return;
    }
    
    // Check admin organization
    await checkAdminOrganization();
    
    // Test basic employee listing
    await debugEmployeeListing();
    
    // Test different filters
    await testDifferentFilters();
    
    // Test database connection
    await testDatabaseConnection();
    
    // Test employee status filters
    await testEmployeeStatusFilter();
    
    console.log('\n🏁 Debug completed!');
    console.log('\n📝 Possible Issues:');
    console.log('1. Employee organization does not match admin organization');
    console.log('2. Employees are soft deleted (isDeleted: true)');
    console.log('3. Employee status is not "active" or "pending"');
    console.log('4. Database connection issues');
    console.log('5. Query parameters not working correctly');
    console.log('\n🔧 Next Steps:');
    console.log('1. Check MongoDB directly for employee records');
    console.log('2. Verify organization IDs match between admin and employees');
    console.log('3. Check if employees have isDeleted: true');
    console.log('4. Verify employee status values');
}

// Run the debug tests
runDebugTests().catch(console.error);
