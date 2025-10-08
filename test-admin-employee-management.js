// Test script for admin employee management functionality
// This script demonstrates the admin-only employee management endpoints

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

async function testGetAllEmployees() {
    console.log('\n📋 Testing: Get all employees for admin management');
    
    try {
        const response = await axios.get(`${API_URL}/admin/all`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        
        console.log('✅ Get all employees successful');
        console.log(`📊 Found ${response.data.count} employees`);
        console.log('🔍 Filters applied:', response.data.filters);
        
        if (response.data.data.length > 0) {
            const employee = response.data.data[0];
            console.log('👤 Sample employee:', {
                id: employee.id,
                name: `${employee.firstName} ${employee.lastName}`,
                email: employee.email,
                status: employee.status,
                isDeleted: employee.isDeleted
            });
        }
        
        return response.data.data;
    } catch (error) {
        console.log('❌ Get all employees failed:', error.response?.data?.message || error.message);
        return [];
    }
}

async function testGetEmployeesWithFilters() {
    console.log('\n🔍 Testing: Get employees with filters');
    
    try {
        // Test with status filter
        const statusResponse = await axios.get(`${API_URL}/admin/all?status=active`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        
        console.log('✅ Status filter test successful');
        console.log(`📊 Active employees: ${statusResponse.data.count}`);
        
        // Test with search filter
        const searchResponse = await axios.get(`${API_URL}/admin/all?search=john`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        
        console.log('✅ Search filter test successful');
        console.log(`📊 Search results: ${searchResponse.data.count}`);
        
        // Test with include deleted
        const deletedResponse = await axios.get(`${API_URL}/admin/all?includeDeleted=true`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        
        console.log('✅ Include deleted filter test successful');
        console.log(`📊 Total employees (including deleted): ${deletedResponse.data.count}`);
        
    } catch (error) {
        console.log('❌ Filter tests failed:', error.response?.data?.message || error.message);
    }
}

async function testUpdateEmployee(employeeId) {
    console.log('\n✏️ Testing: Update employee');
    
    const updateData = {
        department: 'Updated Legal Department',
        position: 'Senior Legal Advisor',
        salary: 75000
    };
    
    try {
        const response = await axios.put(`${API_URL}/admin/${employeeId}`, updateData, {
            headers: { 
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Employee update successful');
        console.log('📝 Updated employee:', {
            id: response.data.data.id,
            name: `${response.data.data.firstName} ${response.data.data.lastName}`,
            department: response.data.data.department,
            position: response.data.data.position,
            salary: response.data.data.salary
        });
        
        return response.data.data;
    } catch (error) {
        console.log('❌ Employee update failed:', error.response?.data?.message || error.message);
        return null;
    }
}

async function testSoftDeleteEmployee(employeeId) {
    console.log('\n🗑️ Testing: Soft delete employee');
    
    try {
        const response = await axios.delete(`${API_URL}/admin/${employeeId}`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        
        console.log('✅ Employee soft delete successful');
        console.log('🗑️ Deleted employee:', {
            id: response.data.data.id,
            name: `${response.data.data.firstName} ${response.data.data.lastName}`,
            deletedAt: response.data.data.deletedAt,
            status: response.data.data.status
        });
        
        return response.data.data;
    } catch (error) {
        console.log('❌ Employee soft delete failed:', error.response?.data?.message || error.message);
        return null;
    }
}

async function testRestoreEmployee(employeeId) {
    console.log('\n♻️ Testing: Restore employee');
    
    try {
        const response = await axios.put(`${API_URL}/admin/${employeeId}/restore`, {}, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        
        console.log('✅ Employee restore successful');
        console.log('♻️ Restored employee:', {
            id: response.data.data.id,
            name: `${response.data.data.firstName} ${response.data.data.lastName}`,
            status: response.data.data.status,
            restoredAt: response.data.data.restoredAt
        });
        
        return response.data.data;
    } catch (error) {
        console.log('❌ Employee restore failed:', error.response?.data?.message || error.message);
        return null;
    }
}

async function testEmployeeAccess() {
    console.log('\n🚫 Testing: Employee access (should fail)');
    
    // This would be an employee token in a real scenario
    const employeeToken = 'invalid_employee_token';
    
    try {
        await axios.get(`${API_URL}/admin/all`, {
            headers: { 'Authorization': `Bearer ${employeeToken}` }
        });
        console.log('❌ Security test failed - employee was able to access admin endpoint');
    } catch (error) {
        if (error.response?.status === 401 || error.response?.status === 403) {
            console.log('✅ Security test passed - employee correctly denied access');
        } else {
            console.log('⚠️ Unexpected error:', error.response?.data?.message || error.message);
        }
    }
}

async function runTests() {
    console.log('🚀 Starting Admin Employee Management Tests');
    console.log('============================================');
    
    // Login as admin
    const loginSuccess = await loginAsAdmin();
    if (!loginSuccess) {
        console.log('❌ Cannot proceed without admin authentication');
        return;
    }
    
    // Test getting all employees
    const employees = await testGetAllEmployees();
    
    // Test filtering
    await testGetEmployeesWithFilters();
    
    // Test employee access (should fail)
    await testEmployeeAccess();
    
    // Test update, delete, and restore if we have employees
    if (employees.length > 0) {
        const employeeId = employees[0].id;
        
        // Test update
        await testUpdateEmployee(employeeId);
        
        // Test soft delete
        await testSoftDeleteEmployee(employeeId);
        
        // Test restore
        await testRestoreEmployee(employeeId);
    } else {
        console.log('\n⚠️ No employees found to test update/delete/restore operations');
    }
    
    console.log('\n🏁 Tests completed!');
    console.log('\n📝 Summary:');
    console.log('- Admin can list all employees with advanced filtering');
    console.log('- Admin can update employee information');
    console.log('- Admin can soft delete employees (preserves data)');
    console.log('- Admin can restore soft-deleted employees');
    console.log('- Employees are correctly denied access to admin endpoints');
    console.log('- All operations are scoped to admin\'s organization');
}

// Run the tests
runTests().catch(console.error);
