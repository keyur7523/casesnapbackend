# Admin Employee Management API

## Overview
This API provides comprehensive employee management functionality exclusively for administrators. These endpoints allow admins to list, view, edit, update, and soft delete employees within their organization.

## Security
- **Access Level**: Admin only
- **Authentication**: JWT token required
- **Authorization**: Must have 'admin' role
- **Organization Isolation**: Admins can only manage employees within their organization

## Endpoints

### 1. Get All Employees for Admin Management
**GET** `/api/employees/admin/all`

**Description**: Retrieve all employees with advanced filtering and search capabilities.

**Query Parameters**:
- `includeDeleted` (boolean, optional): Include soft-deleted employees (default: false)
- `status` (string, optional): Filter by employee status (pending, active, inactive, terminated)
- `search` (string, optional): Search by name, email, department, or position

**Example Request**:
```bash
GET /api/employees/admin/all?includeDeleted=true&status=active&search=john
```

**Response**:
```json
{
  "success": true,
  "count": 5,
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
    "includeDeleted": true,
    "status": "active",
    "search": "john"
  }
}
```

### 2. Update Employee by Admin
**PUT** `/api/employees/admin/:id`

**Description**: Update employee information. Admins can modify any employee field.

**Request Body** (all fields optional):
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "1234567890",
  "address": "123 Main St",
  "gender": "Male",
  "dateOfBirth": "1990-01-01",
  "age": 34,
  "aadharCardNumber": "123456789012",
  "employeeType": "advocate",
  "advocateLicenseNumber": "ABC123",
  "internYear": 2,
  "salary": 50000,
  "department": "Legal",
  "position": "Senior Advocate",
  "startDate": "2024-01-01",
  "emergencyContactName": "Jane Doe",
  "emergencyContactPhone": "0987654321",
  "emergencyContactRelation": "Spouse",
  "status": "active"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Employee updated successfully",
  "data": {
    "id": "employee_id",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    // ... all updated employee fields
  }
}
```

### 3. Soft Delete Employee by Admin
**DELETE** `/api/employees/admin/:id`

**Description**: Soft delete an employee (marks as deleted but preserves data).

**Response**:
```json
{
  "success": true,
  "message": "Employee deleted successfully",
  "data": {
    "id": "employee_id",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "deletedAt": "2024-01-15T10:30:00.000Z",
    "status": "terminated"
  }
}
```

### 4. Restore Soft Deleted Employee
**PUT** `/api/employees/admin/:id/restore`

**Description**: Restore a previously soft-deleted employee.

**Response**:
```json
{
  "success": true,
  "message": "Employee restored successfully",
  "data": {
    "id": "employee_id",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "status": "pending",
    "restoredAt": "2024-01-15T10:30:00.000Z"
  }
}
```

## Features

### Advanced Filtering
- **Status Filter**: Filter by pending, active, inactive, or terminated
- **Include Deleted**: Option to include soft-deleted employees
- **Search**: Search across name, email, department, and position fields

### Soft Delete System
- **Non-destructive**: Employees are marked as deleted but data is preserved
- **Status Update**: Soft-deleted employees are automatically marked as 'terminated'
- **Restoration**: Deleted employees can be restored with a single API call
- **Audit Trail**: Deletion timestamp is recorded

### Data Validation
- **Employee Type Validation**: Ensures required fields for advocate/intern types
- **Organization Isolation**: Admins can only manage their organization's employees
- **Field Validation**: All employee fields are validated according to schema rules

### Security Features
- **Admin Only**: All endpoints require admin authentication
- **Organization Scoped**: Admins can only access their organization's data
- **JWT Protection**: All requests require valid JWT tokens
- **Role Authorization**: Only users with 'admin' role can access these endpoints

## Error Handling

### Common Error Responses

**401 Unauthorized**:
```json
{
  "success": false,
  "error": "Not authorized to access this route"
}
```

**403 Forbidden**:
```json
{
  "success": false,
  "error": "User role employee is not authorized to access this route"
}
```

**404 Not Found**:
```json
{
  "success": false,
  "error": "Employee not found"
}
```

**400 Bad Request**:
```json
{
  "success": false,
  "error": "Advocate license number is required for advocate employees"
}
```

## Usage Examples

### Frontend Integration

```javascript
// Get all employees with filters
const getEmployees = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.includeDeleted) params.append('includeDeleted', 'true');
  if (filters.status) params.append('status', filters.status);
  if (filters.search) params.append('search', filters.search);
  
  const response = await fetch(`/api/employees/admin/all?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.json();
};

// Update employee
const updateEmployee = async (employeeId, updateData) => {
  const response = await fetch(`/api/employees/admin/${employeeId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(updateData)
  });
  
  return response.json();
};

// Soft delete employee
const deleteEmployee = async (employeeId) => {
  const response = await fetch(`/api/employees/admin/${employeeId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.json();
};

// Restore employee
const restoreEmployee = async (employeeId) => {
  const response = await fetch(`/api/employees/admin/${employeeId}/restore`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.json();
};
```

## Best Practices

1. **Always check user role** before displaying admin functions
2. **Implement confirmation dialogs** for delete operations
3. **Use pagination** for large employee lists
4. **Cache employee data** to reduce API calls
5. **Implement search debouncing** for better performance
6. **Show loading states** during API operations
7. **Handle errors gracefully** with user-friendly messages

This API provides comprehensive employee management capabilities while maintaining security and data integrity through proper authentication and authorization mechanisms.
