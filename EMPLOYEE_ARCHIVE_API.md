# Employee Archive API Documentation

## Overview
This document describes the employee archiving system implemented for managing employees who have stopped working. The archive system preserves all employee data while hiding archived employees from default search results.

## Key Concepts

### Two Separate Systems

1. **Soft Delete (`isDeleted`)** - For mistakes and errors
   - Use when: Wrong employee added, data entry error, test records
   - Purpose: Quickly hide and restore mistakes
   - Endpoints: `DELETE /admin/:id` and `PUT /admin/:id/restore`

2. **Archive (`employmentStatus`)** - For employees who stopped working
   - Use when: Employee resigned, retired, contract ended
   - Purpose: Keep historical records but hide from active employee list
   - Endpoints: `POST /admin/:id/archive` and `PUT /admin/:id/unarchive`

### Employment Status
- `employed` - Active employees (default)
- `archived` - Former employees (stopped working)

---

## Database Schema Changes

### New Fields in Employee Model

```javascript
// Employment Status (for archiving old employees)
employmentStatus: {
    type: String,
    enum: ['employed', 'archived'],
    default: 'employed'
},
archivedAt: {
    type: Date,
    default: null
},
archivedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    default: null
},
archiveReason: {
    type: String,
    maxlength: [200, 'Archive reason cannot exceed 200 characters'],
    default: null
}
```

---

## API Endpoints

### 1. Archive Employee
**POST** `/api/employees/admin/:id/archive`

Archives an employee who has stopped working. All data is preserved.

**Access**: Admin only (requires authentication and 'admin' role)

**URL Parameters**:
- `id` - Employee ID to archive

**Request Body** (optional):
```json
{
  "reason": "Resigned from position",
  "notes": "Last working day: 2024-01-15"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Employee archived successfully. Employee data is preserved and can be unarchived if needed.",
  "data": {
    "id": "employee_id",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "employmentStatus": "archived",
    "status": "terminated",
    "archivedAt": "2024-01-15T10:30:00.000Z",
    "archivedBy": "admin_id",
    "archiveReason": "Resigned from position"
  }
}
```

**What it does**:
- Sets `employmentStatus: 'archived'`
- Sets `status: 'terminated'` (if not already)
- Records `archivedAt` timestamp
- Records `archivedBy` (admin who archived)
- Stores `archiveReason` for audit trail
- Adds entry to `statusHistory` for audit
- Employee won't appear in default employee list

**Error Responses**:
- `400 Bad Request` - Employee is already archived
- `404 Not Found` - Employee not found or not in your organization
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not authorized (not an admin)

---

### 2. Unarchive Employee
**PUT** `/api/employees/admin/:id/unarchive`

Restores an archived employee back to active employment status.

**Access**: Admin only

**URL Parameters**:
- `id` - Employee ID to unarchive

**Request Body** (optional):
```json
{
  "notes": "Rehired for new project"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Employee unarchived successfully. Employee status set to pending for admin review.",
  "data": {
    "id": "employee_id",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "employmentStatus": "employed",
    "status": "pending",
    "unarchivedAt": "2024-02-01T10:30:00.000Z",
    "previousArchiveInfo": {
      "archivedAt": "2024-01-15T10:30:00.000Z",
      "archivedBy": "admin_id",
      "archiveReason": "Resigned from position"
    }
  }
}
```

**What it does**:
- Sets `employmentStatus: 'employed'`
- Sets `status: 'pending'` (for admin to review and activate)
- Clears archive-related fields
- Returns previous archive information
- Adds entry to `statusHistory` for audit
- Employee will appear in default employee list

**Error Responses**:
- `404 Not Found` - Archived employee not found
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not authorized (not an admin)

---

### 3. Get All Employees (Updated)
**GET** `/api/employees/admin/all`

Retrieves employees with pagination and filtering. Now excludes archived employees by default.

**Access**: Admin only

**Query Parameters**:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100)
- `sortBy` - Sort field (default: 'createdAt')
- `sortOrder` - 'asc' or 'desc' (default: 'desc')
- `status` - Filter by status: 'pending', 'active', 'inactive', 'terminated'
- `search` - Search term (searches name, email, department, position)
- `includeDeleted` - Include soft-deleted employees: 'true' or 'false' (default: false)
- **`includeArchived`** - Include archived employees: 'true' or 'false' (default: false) ⭐ NEW

**Examples**:

1. **Get only active (employed) employees** (default behavior):
```
GET /api/employees/admin/all
GET /api/employees/admin/all?includeArchived=false
```

2. **Get all employees including archived**:
```
GET /api/employees/admin/all?includeArchived=true
```

3. **Get only archived employees**:
```
GET /api/employees/admin/all?includeArchived=true&status=terminated
```
(Then filter by `employmentStatus: 'archived'` in your frontend)

4. **Get employed employees with search**:
```
GET /api/employees/admin/all?search=john&includeArchived=false
```

**Response (200 OK)**:
```json
{
  "success": true,
  "count": 10,
  "totalCount": 45,
  "totalPages": 5,
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
      "employmentStatus": "employed",
      "status": "active",
      // ... other fields
    }
  ],
  "filters": {
    "includeDeleted": false,
    "includeArchived": false,
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

---

## Usage Examples

### Example 1: Archive an Employee (Backend API Call)

```javascript
const axios = require('axios');

const archiveEmployee = async (employeeId, token) => {
  try {
    const response = await axios.post(
      `http://localhost:5004/api/employees/admin/${employeeId}/archive`,
      {
        reason: 'Resigned - Personal reasons',
        notes: 'Last working day: 2024-01-31. Exit interview completed.'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Employee archived:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Archive failed:', error.response?.data || error.message);
    throw error;
  }
};
```

### Example 2: Get Active Employees Only (Default)

```javascript
const getActiveEmployees = async (token) => {
  try {
    const response = await axios.get(
      'http://localhost:5004/api/employees/admin/all',
      {
        params: {
          page: 1,
          limit: 20,
          includeArchived: false  // Default behavior
        },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('✅ Active employees:', response.data.count);
    return response.data;
  } catch (error) {
    console.error('❌ Fetch failed:', error.message);
    throw error;
  }
};
```

### Example 3: Get All Employees (Including Archived)

```javascript
const getAllEmployees = async (token) => {
  try {
    const response = await axios.get(
      'http://localhost:5004/api/employees/admin/all',
      {
        params: {
          page: 1,
          limit: 20,
          includeArchived: true  // Include archived employees
        },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('✅ All employees (including archived):', response.data.count);
    return response.data;
  } catch (error) {
    console.error('❌ Fetch failed:', error.message);
    throw error;
  }
};
```

### Example 4: Unarchive an Employee

```javascript
const unarchiveEmployee = async (employeeId, token) => {
  try {
    const response = await axios.put(
      `http://localhost:5004/api/employees/admin/${employeeId}/unarchive`,
      {
        notes: 'Rehired for special project'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Employee unarchived:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Unarchive failed:', error.response?.data || error.message);
    throw error;
  }
};
```

---

## Workflow Examples

### Scenario 1: Employee Resigns

```
1. Employee submits resignation
2. Admin marks last working day
3. Admin archives employee:
   POST /api/employees/admin/:id/archive
   {
     "reason": "Resigned - Better opportunity",
     "notes": "Last day: 2024-01-31. Exit interview completed. Handed over projects to John Smith."
   }
4. Employee data is preserved but hidden from default list
5. Employee marked as 'terminated' status
6. Archive recorded in statusHistory for audit
```

### Scenario 2: Rehiring Archived Employee

```
1. Admin searches archived employees:
   GET /api/employees/admin/all?includeArchived=true&search=john
2. Find employee to rehire
3. Unarchive employee:
   PUT /api/employees/admin/:id/unarchive
   {
     "notes": "Rehired for new project starting 2024-03-01"
   }
4. Employee status set to 'pending'
5. Admin reviews and activates:
   POST /api/employees/:id/status
   {
     "status": "active",
     "notes": "Rehired employee activated"
   }
```

---

## Security & Access Control

### Authentication
- All endpoints require valid JWT token
- Token must be included in Authorization header: `Bearer <token>`

### Authorization
- Only users with 'admin' role can access these endpoints
- Admins can only archive/unarchive employees in their own organization

### Organization Scoping
- All operations are scoped to the admin's organization
- Cannot archive/unarchive employees from other organizations
- Organization ID is automatically extracted from JWT token

---

## Audit Trail

All archive operations are tracked:

1. **Archive Information**:
   - Who archived (`archivedBy`)
   - When archived (`archivedAt`)
   - Why archived (`archiveReason`)

2. **Status History**:
   - Each archive/unarchive adds entry to `statusHistory`
   - Complete audit trail of all status changes
   - Includes admin who made the change
   - Timestamps for all changes

3. **Previous Archive Info on Unarchive**:
   - When unarchiving, previous archive information is returned
   - Helps track rehiring and employee history

---

## Best Practices

### When to Archive
✅ Employee resigned
✅ Employee retired
✅ Contract ended
✅ Employee terminated (after proper process)
✅ Temporary employee's project completed

### When to Soft Delete
✅ Wrong employee added by mistake
✅ Duplicate entry
✅ Test data
✅ Data entry error

### Tips
1. **Always provide reason** when archiving for better audit trail
2. **Use includeArchived=false** (default) for active employee lists
3. **Use includeArchived=true** only when you need to see all employees
4. **Search archived employees** before creating new employee (avoid duplicates)
5. **Unarchive instead of creating new** if rehiring former employee
6. **Review status** after unarchiving before setting to 'active'

---

## Migration Notes

### For Existing Databases
If you have existing employees in your database, they will automatically have:
- `employmentStatus: 'employed'` (default value)
- All existing employees remain visible

No database migration required! The new fields have default values.

### Backward Compatibility
- All existing API calls continue to work
- Default behavior: Show only employed employees
- Explicitly set `includeArchived=true` to see archived employees

---

## Testing

### Test Archive Functionality

```bash
# 1. Login as admin
curl -X POST http://localhost:5004/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password123"}'

# Save the token from response

# 2. Get list of active employees
curl -X GET "http://localhost:5004/api/employees/admin/all" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Archive an employee
curl -X POST "http://localhost:5004/api/employees/admin/EMPLOYEE_ID/archive" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Test archive", "notes": "Testing archive functionality"}'

# 4. Verify employee is hidden from default list
curl -X GET "http://localhost:5004/api/employees/admin/all" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 5. Get all employees including archived
curl -X GET "http://localhost:5004/api/employees/admin/all?includeArchived=true" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 6. Unarchive the employee
curl -X PUT "http://localhost:5004/api/employees/admin/EMPLOYEE_ID/unarchive" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Test unarchive"}'

# 7. Verify employee is back in default list
curl -X GET "http://localhost:5004/api/employees/admin/all" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Summary

### What Changed
✅ Added `employmentStatus` field (employed/archived)
✅ Added archive metadata fields (archivedAt, archivedBy, archiveReason)
✅ Added 2 new endpoints (archive, unarchive)
✅ Updated employee list to exclude archived by default
✅ Added `includeArchived` query parameter

### What Stayed the Same
✅ All existing endpoints work unchanged
✅ Soft delete system remains separate
✅ Authentication and authorization unchanged
✅ Existing employee data not affected

### Data Preservation
✅ **Nothing is deleted** - all employee data is preserved
✅ Archived employees are just hidden from default view
✅ Can always unarchive and restore employees
✅ Complete audit trail maintained

---

## Support

For issues or questions about the archive feature:
1. Check this documentation
2. Review console logs (detailed logging with emojis)
3. Check status history in employee record
4. Verify JWT token and admin role
5. Ensure organization scoping is correct

The archive system is designed to safely preserve all employee data while keeping your active employee list clean and manageable! 🚀

