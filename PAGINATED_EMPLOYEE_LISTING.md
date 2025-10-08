# Paginated Employee Listing API

## Overview
The employee listing endpoint now supports comprehensive pagination with sorting, filtering, and search capabilities. This allows frontend developers to efficiently handle large datasets with proper pagination controls.

## Endpoint Details

**URL**: `GET /api/employees/admin/all`  
**Access**: Admin Only (requires JWT token)  
**Base URL**: `http://localhost:5004`

## Query Parameters

### Pagination Parameters
| Parameter | Type | Default | Description | Example |
|-----------|------|---------|-------------|---------|
| `page` | number | `1` | Page number (must be ≥ 1) | `1`, `2`, `3` |
| `limit` | number | `10` | Items per page (1-100) | `10`, `25`, `50` |

### Sorting Parameters
| Parameter | Type | Default | Description | Valid Values |
|-----------|------|---------|-------------|--------------|
| `sortBy` | string | `createdAt` | Field to sort by | `createdAt`, `updatedAt`, `firstName`, `lastName`, `email`, `salary`, `status` |
| `sortOrder` | string | `desc` | Sort direction | `asc`, `desc` |

### Filtering Parameters
| Parameter | Type | Default | Description | Valid Values |
|-----------|------|---------|-------------|--------------|
| `includeDeleted` | boolean | `false` | Include soft-deleted employees | `true`, `false` |
| `status` | string | `all` | Filter by employee status | `pending`, `active`, `inactive`, `terminated` |
| `search` | string | `null` | Search across multiple fields | Any text string |

## Response Structure

```json
{
  "success": true,
  "count": 10,
  "totalCount": 150,
  "totalPages": 15,
  "currentPage": 1,
  "hasNextPage": true,
  "hasPrevPage": false,
  "nextPage": 2,
  "prevPage": null,
  "data": [
    {
      "id": "employee_id",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phone": "1234567890",
      "address": "123 Main St",
      "gender": "Male",
      "dateOfBirth": "1990-01-01T00:00:00.000Z",
      "age": 34,
      "aadharCardNumber": "123456789012",
      "employeeType": "advocate",
      "advocateLicenseNumber": "ABC123",
      "salary": 50000,
      "department": "Legal",
      "position": "Senior Advocate",
      "startDate": "2024-01-01T00:00:00.000Z",
      "emergencyContactName": "Jane Doe",
      "emergencyContactPhone": "0987654321",
      "emergencyContactRelation": "Spouse",
      "organization": "organization_id",
      "adminId": {
        "id": "admin_id",
        "firstName": "Admin",
        "lastName": "User",
        "email": "admin@example.com"
      },
      "status": "active",
      "isDeleted": false,
      "deletedAt": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "filters": {
    "includeDeleted": false,
    "status": "all",
    "search": null
  },
  "pagination": {
    "page": 1,
    "limit": 10,
    "sortBy": "createdAt",
    "sortOrder": "desc"
  }
}
```

## Frontend Implementation Examples

### 1. Basic Pagination Hook (React)

```javascript
import { useState, useEffect, useCallback } from 'react';

const usePaginatedEmployees = (token, initialFilters = {}) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalCount: 0,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    includeDeleted: false,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    limit: 10,
    ...initialFilters
  });

  const fetchEmployees = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      
      // Pagination
      params.append('page', page);
      params.append('limit', filters.limit);
      
      // Sorting
      params.append('sortBy', filters.sortBy);
      params.append('sortOrder', filters.sortOrder);
      
      // Filtering
      if (filters.includeDeleted) params.append('includeDeleted', 'true');
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      
      const url = `http://localhost:5004/api/employees/admin/all?${params.toString()}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch employees');
      }
      
      const data = await response.json();
      
      setEmployees(data.data);
      setPagination({
        currentPage: data.currentPage,
        totalPages: data.totalPages,
        totalCount: data.totalCount,
        hasNextPage: data.hasNextPage,
        hasPrevPage: data.hasPrevPage
      });
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, filters]);

  useEffect(() => {
    if (token) {
      fetchEmployees(1);
    }
  }, [fetchEmployees]);

  const goToPage = (page) => {
    fetchEmployees(page);
  };

  const updateFilters = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const resetFilters = () => {
    setFilters({
      status: 'all',
      search: '',
      includeDeleted: false,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      limit: 10
    });
  };

  return {
    employees,
    loading,
    error,
    pagination,
    filters,
    goToPage,
    updateFilters,
    resetFilters,
    refetch: () => fetchEmployees(pagination.currentPage)
  };
};

export default usePaginatedEmployees;
```

### 2. Complete Employee List Component

```javascript
import React, { useState } from 'react';
import usePaginatedEmployees from './usePaginatedEmployees';

const EmployeeList = ({ token }) => {
  const {
    employees,
    loading,
    error,
    pagination,
    filters,
    goToPage,
    updateFilters,
    resetFilters
  } = usePaginatedEmployees(token);

  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    updateFilters({ search: searchTerm });
  };

  const handleStatusChange = (status) => {
    updateFilters({ status });
  };

  const handleSortChange = (sortBy) => {
    const newOrder = filters.sortBy === sortBy && filters.sortOrder === 'asc' ? 'desc' : 'asc';
    updateFilters({ sortBy, sortOrder: newOrder });
  };

  const handleLimitChange = (limit) => {
    updateFilters({ limit: parseInt(limit) });
  };

  const renderPagination = () => {
    const pages = [];
    const maxVisiblePages = 5;
    const startPage = Math.max(1, pagination.currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(pagination.totalPages, startPage + maxVisiblePages - 1);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => goToPage(i)}
          className={`px-3 py-1 mx-1 rounded ${
            i === pagination.currentPage
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {i}
        </button>
      );
    }

    return (
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => goToPage(pagination.currentPage - 1)}
            disabled={!pagination.hasPrevPage}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            Previous
          </button>
          
          {pages}
          
          <button
            onClick={() => goToPage(pagination.currentPage + 1)}
            disabled={!pagination.hasNextPage}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
        
        <div className="text-sm text-gray-600">
          Showing {employees.length} of {pagination.totalCount} employees
        </div>
      </div>
    );
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Employee Management</h2>
      
      {/* Filters */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex">
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-l"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-r hover:bg-blue-600"
            >
              Search
            </button>
          </form>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-3 py-2 border rounded"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="terminated">Terminated</option>
          </select>

          {/* Items per page */}
          <select
            value={filters.limit}
            onChange={(e) => handleLimitChange(e.target.value)}
            className="px-3 py-2 border rounded"
          >
            <option value="10">10 per page</option>
            <option value="25">25 per page</option>
            <option value="50">50 per page</option>
            <option value="100">100 per page</option>
          </select>

          {/* Include deleted */}
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.includeDeleted}
              onChange={(e) => updateFilters({ includeDeleted: e.target.checked })}
              className="mr-2"
            />
            Include Deleted
          </label>
        </div>

        <button
          onClick={resetFilters}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Reset Filters
        </button>
      </div>

      {/* Employee Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100"
                onClick={() => handleSortChange('firstName')}
              >
                Name {filters.sortBy === 'firstName' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100"
                onClick={() => handleSortChange('email')}
              >
                Email {filters.sortBy === 'email' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3 text-left">Department</th>
              <th className="px-4 py-3 text-left">Position</th>
              <th 
                className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100"
                onClick={() => handleSortChange('salary')}
              >
                Salary {filters.sortBy === 'salary' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100"
                onClick={() => handleSortChange('status')}
              >
                Status {filters.sortBy === 'status' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div>
                    <div className="font-medium">
                      {employee.firstName} {employee.lastName}
                    </div>
                    {employee.isDeleted && (
                      <span className="text-xs text-red-500">DELETED</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">{employee.email}</td>
                <td className="px-4 py-3">{employee.department}</td>
                <td className="px-4 py-3">{employee.position}</td>
                <td className="px-4 py-3">₹{employee.salary?.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    employee.status === 'active' ? 'bg-green-100 text-green-800' :
                    employee.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    employee.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {employee.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button className="text-blue-500 hover:text-blue-700 mr-2">
                    Edit
                  </button>
                  <button className="text-red-500 hover:text-red-700">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && renderPagination()}
    </div>
  );
};

export default EmployeeList;
```

### 3. Simple JavaScript Implementation

```javascript
class EmployeePagination {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl;
    this.token = token;
    this.currentPage = 1;
    this.filters = {
      status: 'all',
      search: '',
      includeDeleted: false,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      limit: 10
    };
  }

  async fetchEmployees(page = 1) {
    const params = new URLSearchParams();
    
    // Pagination
    params.append('page', page);
    params.append('limit', this.filters.limit);
    
    // Sorting
    params.append('sortBy', this.filters.sortBy);
    params.append('sortOrder', this.filters.sortOrder);
    
    // Filtering
    if (this.filters.includeDeleted) params.append('includeDeleted', 'true');
    if (this.filters.status !== 'all') params.append('status', this.filters.status);
    if (this.filters.search) params.append('search', this.filters.search);
    
    const url = `${this.baseUrl}/api/employees/admin/all?${params.toString()}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch employees');
      }
      
      const data = await response.json();
      this.currentPage = data.currentPage;
      
      return data;
    } catch (error) {
      console.error('Error fetching employees:', error);
      throw error;
    }
  }

  setFilters(newFilters) {
    this.filters = { ...this.filters, ...newFilters };
  }

  async goToPage(page) {
    return await this.fetchEmployees(page);
  }

  async nextPage() {
    return await this.fetchEmployees(this.currentPage + 1);
  }

  async prevPage() {
    return await this.fetchEmployees(this.currentPage - 1);
  }
}

// Usage
const employeePagination = new EmployeePagination('http://localhost:5004', token);

// Fetch first page
const firstPage = await employeePagination.fetchEmployees(1);

// Set filters and fetch
employeePagination.setFilters({ status: 'active', search: 'john' });
const filteredResults = await employeePagination.fetchEmployees(1);

// Navigate pages
const nextPage = await employeePagination.nextPage();
const prevPage = await employeePagination.prevPage();
```

## API Usage Examples

### 1. Basic Pagination
```bash
GET /api/employees/admin/all?page=1&limit=10
```

### 2. With Sorting
```bash
GET /api/employees/admin/all?page=1&limit=25&sortBy=firstName&sortOrder=asc
```

### 3. With Filters
```bash
GET /api/employees/admin/all?page=2&limit=10&status=active&search=john
```

### 4. Complete Example
```bash
GET /api/employees/admin/all?page=1&limit=25&sortBy=salary&sortOrder=desc&status=active&includeDeleted=false&search=legal
```

## Error Handling

```javascript
const handleEmployeeFetch = async (page, filters) => {
  try {
    const response = await fetch(/* ... */);
    
    if (!response.ok) {
      const errorData = await response.json();
      
      switch (response.status) {
        case 400:
          throw new Error(`Invalid parameters: ${errorData.message}`);
        case 401:
          throw new Error('Authentication required');
        case 403:
          throw new Error('Admin access required');
        default:
          throw new Error('Failed to fetch employees');
      }
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
};
```

## Performance Considerations

1. **Limit Range**: Maximum 100 items per page to prevent performance issues
2. **Database Indexing**: Ensure proper indexes on frequently sorted fields
3. **Caching**: Consider implementing caching for frequently accessed data
4. **Debouncing**: Implement search debouncing to reduce API calls
5. **Lazy Loading**: Load additional data as needed

This paginated employee listing provides a robust foundation for managing large employee datasets with efficient navigation and filtering capabilities.
