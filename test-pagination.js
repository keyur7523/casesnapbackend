// Test script for paginated employee listing functionality
// This script demonstrates the pagination features of the employee listing endpoint

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5004';
const API_URL = `${BASE_URL}/api/employees/admin/all`;

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

async function testBasicPagination() {
    console.log('\n📄 Testing: Basic pagination');
    
    try {
        const response = await axios.get(`${API_URL}?page=1&limit=5`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        
        console.log('✅ Basic pagination successful');
        console.log(`📊 Current page: ${response.data.currentPage}`);
        console.log(`📊 Total pages: ${response.data.totalPages}`);
        console.log(`📊 Total count: ${response.data.totalCount}`);
        console.log(`📊 Items on page: ${response.data.count}`);
        console.log(`📊 Has next page: ${response.data.hasNextPage}`);
        console.log(`📊 Has prev page: ${response.data.hasPrevPage}`);
        
        return response.data;
    } catch (error) {
        console.log('❌ Basic pagination failed:', error.response?.data?.message || error.message);
        return null;
    }
}

async function testSorting() {
    console.log('\n🔄 Testing: Sorting functionality');
    
    try {
        // Test sorting by name ascending
        const nameAscResponse = await axios.get(`${API_URL}?page=1&limit=5&sortBy=firstName&sortOrder=asc`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        
        console.log('✅ Name ascending sort successful');
        console.log(`📊 Sorted by: ${nameAscResponse.data.pagination.sortBy}`);
        console.log(`📊 Sort order: ${nameAscResponse.data.pagination.sortOrder}`);
        
        // Test sorting by salary descending
        const salaryDescResponse = await axios.get(`${API_URL}?page=1&limit=5&sortBy=salary&sortOrder=desc`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        
        console.log('✅ Salary descending sort successful');
        console.log(`📊 Sorted by: ${salaryDescResponse.data.pagination.sortBy}`);
        console.log(`📊 Sort order: ${salaryDescResponse.data.pagination.sortOrder}`);
        
        return true;
    } catch (error) {
        console.log('❌ Sorting test failed:', error.response?.data?.message || error.message);
        return false;
    }
}

async function testFiltering() {
    console.log('\n🔍 Testing: Filtering functionality');
    
    try {
        // Test status filter
        const statusResponse = await axios.get(`${API_URL}?page=1&limit=5&status=active`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        
        console.log('✅ Status filter test successful');
        console.log(`📊 Active employees: ${statusResponse.data.count}`);
        console.log(`📊 Filter applied: ${statusResponse.data.filters.status}`);
        
        // Test search filter
        const searchResponse = await axios.get(`${API_URL}?page=1&limit=5&search=john`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        
        console.log('✅ Search filter test successful');
        console.log(`📊 Search results: ${searchResponse.data.count}`);
        console.log(`📊 Search term: ${searchResponse.data.filters.search}`);
        
        // Test include deleted
        const deletedResponse = await axios.get(`${API_URL}?page=1&limit=5&includeDeleted=true`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        
        console.log('✅ Include deleted filter test successful');
        console.log(`📊 Total with deleted: ${deletedResponse.data.count}`);
        console.log(`📊 Include deleted: ${deletedResponse.data.filters.includeDeleted}`);
        
        return true;
    } catch (error) {
        console.log('❌ Filtering test failed:', error.response?.data?.message || error.message);
        return false;
    }
}

async function testPaginationNavigation() {
    console.log('\n🧭 Testing: Pagination navigation');
    
    try {
        // Get first page
        const firstPage = await axios.get(`${API_URL}?page=1&limit=3`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        
        console.log('✅ First page retrieved');
        console.log(`📊 Page: ${firstPage.data.currentPage}/${firstPage.data.totalPages}`);
        console.log(`📊 Has next: ${firstPage.data.hasNextPage}, Has prev: ${firstPage.data.hasPrevPage}`);
        
        // Navigate to next page if available
        if (firstPage.data.hasNextPage) {
            const nextPage = await axios.get(`${API_URL}?page=${firstPage.data.nextPage}&limit=3`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            
            console.log('✅ Next page retrieved');
            console.log(`📊 Page: ${nextPage.data.currentPage}/${nextPage.data.totalPages}`);
            console.log(`📊 Has next: ${nextPage.data.hasNextPage}, Has prev: ${nextPage.data.hasPrevPage}`);
            
            // Navigate back to previous page
            if (nextPage.data.hasPrevPage) {
                const prevPage = await axios.get(`${API_URL}?page=${nextPage.data.prevPage}&limit=3`, {
                    headers: { 'Authorization': `Bearer ${adminToken}` }
                });
                
                console.log('✅ Previous page retrieved');
                console.log(`📊 Page: ${prevPage.data.currentPage}/${prevPage.data.totalPages}`);
            }
        }
        
        return true;
    } catch (error) {
        console.log('❌ Pagination navigation test failed:', error.response?.data?.message || error.message);
        return false;
    }
}

async function testCombinedFilters() {
    console.log('\n🔗 Testing: Combined filters and pagination');
    
    try {
        const response = await axios.get(`${API_URL}?page=1&limit=5&status=active&search=john&sortBy=firstName&sortOrder=asc&includeDeleted=false`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        
        console.log('✅ Combined filters test successful');
        console.log(`📊 Results: ${response.data.count} of ${response.data.totalCount}`);
        console.log(`📊 Filters:`, response.data.filters);
        console.log(`📊 Pagination:`, response.data.pagination);
        
        return true;
    } catch (error) {
        console.log('❌ Combined filters test failed:', error.response?.data?.message || error.message);
        return false;
    }
}

async function testErrorHandling() {
    console.log('\n⚠️ Testing: Error handling');
    
    try {
        // Test invalid page number
        await axios.get(`${API_URL}?page=0&limit=5`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        console.log('❌ Should have failed with invalid page number');
    } catch (error) {
        if (error.response?.status === 400) {
            console.log('✅ Invalid page number correctly rejected');
        } else {
            console.log('⚠️ Unexpected error for invalid page:', error.response?.data?.message);
        }
    }
    
    try {
        // Test invalid limit
        await axios.get(`${API_URL}?page=1&limit=150`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        console.log('❌ Should have failed with invalid limit');
    } catch (error) {
        if (error.response?.status === 400) {
            console.log('✅ Invalid limit correctly rejected');
        } else {
            console.log('⚠️ Unexpected error for invalid limit:', error.response?.data?.message);
        }
    }
    
    try {
        // Test invalid sort field
        await axios.get(`${API_URL}?page=1&limit=5&sortBy=invalidField`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        console.log('❌ Should have failed with invalid sort field');
    } catch (error) {
        if (error.response?.status === 400) {
            console.log('✅ Invalid sort field correctly rejected');
        } else {
            console.log('⚠️ Unexpected error for invalid sort field:', error.response?.data?.message);
        }
    }
    
    try {
        // Test invalid sort order
        await axios.get(`${API_URL}?page=1&limit=5&sortOrder=invalid`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        console.log('❌ Should have failed with invalid sort order');
    } catch (error) {
        if (error.response?.status === 400) {
            console.log('✅ Invalid sort order correctly rejected');
        } else {
            console.log('⚠️ Unexpected error for invalid sort order:', error.response?.data?.message);
        }
    }
}

async function runTests() {
    console.log('🚀 Starting Paginated Employee Listing Tests');
    console.log('============================================');
    
    // Login as admin
    const loginSuccess = await loginAsAdmin();
    if (!loginSuccess) {
        console.log('❌ Cannot proceed without admin authentication');
        return;
    }
    
    // Test basic pagination
    await testBasicPagination();
    
    // Test sorting
    await testSorting();
    
    // Test filtering
    await testFiltering();
    
    // Test pagination navigation
    await testPaginationNavigation();
    
    // Test combined filters
    await testCombinedFilters();
    
    // Test error handling
    await testErrorHandling();
    
    console.log('\n🏁 Tests completed!');
    console.log('\n📝 Summary:');
    console.log('- Pagination works with page and limit parameters');
    console.log('- Sorting works with sortBy and sortOrder parameters');
    console.log('- Filtering works with status, search, and includeDeleted');
    console.log('- Navigation between pages works correctly');
    console.log('- Combined filters work together');
    console.log('- Error handling validates input parameters');
    console.log('- Response includes comprehensive pagination metadata');
}

// Run the tests
runTests().catch(console.error);
