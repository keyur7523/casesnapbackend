# Frontend Integration Guide - Employee Archive Feature

## 🎯 Overview

This document provides all the information the frontend team needs to integrate the new employee archive feature. This feature allows admins to archive employees who have stopped working while preserving all their data.

---

## 🔑 Key Concepts

### What is Archiving?
- **Archive** = Employee who stopped working (resigned, retired, contract ended)
- **NOT Deleted** = All employee data is preserved
- **Hidden by Default** = Archived employees don't appear in normal employee lists
- **Reversible** = Archived employees can be unarchived (rehired)

### Archive vs Delete
- **Soft Delete** (`isDeleted`) = Mistakes, errors, test data (quick hide/restore)
- **Archive** (`employmentStatus`) = Former employees who stopped working ⭐ NEW

---

## 🌐 API Base URL

**Production:** `https://casesnapbackend.onrender.com`

---

## 📡 New API Endpoints

### 1. Get Employees (Updated with Archive Filter)

**Endpoint:** `GET /api/employees/admin/all`

**Purpose:** Get list of employees with optional archive filter

**Authentication:** Required (JWT Bearer token)

**Authorization:** Admin only

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 10 | Items per page (max: 100) |
| `includeArchived` | boolean | false | Include archived employees |
| `includeDeleted` | boolean | false | Include soft-deleted employees |
| `status` | string | null | Filter by status (pending, active, inactive, terminated) |
| `search` | string | null | Search by name, email, department, position |
| `sortBy` | string | createdAt | Field to sort by |
| `sortOrder` | string | desc | Sort order (asc, desc) |

**Request Example:**
```javascript
// Get only active (employed) employees - DEFAULT BEHAVIOR
GET /api/employees/admin/all

// Get all employees including archived
GET /api/employees/admin/all?includeArchived=true

// Get archived employees with search
GET /api/employees/admin/all?includeArchived=true&search=john
```

**Response:**
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
      "_id": "employee_id",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phone": "9876543210",
      "employmentStatus": "employed",  // ⭐ NEW: "employed" or "archived"
      "status": "active",
      "salary": 50000,
      "department": "Legal",
      "position": "Senior Advocate",
      "archivedAt": null,              // ⭐ NEW: Date when archived
      "archivedBy": null,              // ⭐ NEW: Admin who archived
      "archiveReason": null,           // ⭐ NEW: Reason for archiving
      "isDeleted": false,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T00:00:00.000Z"
    }
  ],
  "filters": {
    "includeDeleted": false,
    "includeArchived": false,         // ⭐ NEW
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

### 2. Archive Employee (NEW)

**Endpoint:** `POST /api/employees/admin/:id/archive`

**Purpose:** Archive an employee who has stopped working

**Authentication:** Required (JWT Bearer token)

**Authorization:** Admin only

**URL Parameters:**
- `:id` - Employee ID to archive

**Request Body:** (Optional but recommended)
```json
{
  "reason": "Employee resigned",
  "notes": "Last working day: 2024-01-31. Exit interview completed. Handed over all projects to team lead."
}
```

**Request Example:**
```javascript
POST /api/employees/admin/507f1f77bcf86cd799439011/archive
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "reason": "Employee resigned",
  "notes": "Last working day: 2024-01-31"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Employee archived successfully. Employee data is preserved and can be unarchived if needed.",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "employmentStatus": "archived",
    "status": "terminated",
    "archivedAt": "2024-01-15T10:30:00.000Z",
    "archivedBy": "admin_user_id",
    "archiveReason": "Employee resigned"
  }
}
```

**Error Responses:**

**400 Bad Request** - Employee already archived:
```json
{
  "success": false,
  "error": "Employee is already archived"
}
```

**404 Not Found** - Employee not found:
```json
{
  "success": false,
  "error": "Employee not found"
}
```

**401 Unauthorized** - Not authenticated:
```json
{
  "success": false,
  "error": "Not authorized to access this route"
}
```

**403 Forbidden** - Not an admin:
```json
{
  "success": false,
  "error": "User role employee is not authorized to access this route"
}
```

---

### 3. Unarchive Employee (NEW)

**Endpoint:** `PUT /api/employees/admin/:id/unarchive`

**Purpose:** Restore an archived employee back to employed status

**Authentication:** Required (JWT Bearer token)

**Authorization:** Admin only

**URL Parameters:**
- `:id` - Employee ID to unarchive

**Request Body:** (Optional)
```json
{
  "notes": "Rehired for new project starting March 1st, 2024"
}
```

**Request Example:**
```javascript
PUT /api/employees/admin/507f1f77bcf86cd799439011/unarchive
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "notes": "Rehired for new project"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Employee unarchived successfully. Employee status set to pending for admin review.",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "employmentStatus": "employed",
    "status": "pending",
    "unarchivedAt": "2024-02-01T10:30:00.000Z",
    "previousArchiveInfo": {
      "archivedAt": "2024-01-15T10:30:00.000Z",
      "archivedBy": "admin_user_id",
      "archiveReason": "Employee resigned"
    }
  }
}
```

**Error Responses:**

**404 Not Found** - Archived employee not found:
```json
{
  "success": false,
  "error": "Archived employee not found"
}
```

---

## 💻 Frontend Implementation Examples

### React/TypeScript Example

#### 1. API Service (employeeApi.ts)

```typescript
import axios from 'axios';

const API_BASE_URL = 'https://casesnapbackend.onrender.com';

// Get auth token from storage
const getAuthToken = () => {
  return localStorage.getItem('authToken') || localStorage.getItem('token');
};

// Get employees with archive filter
export const getEmployees = async (params: {
  page?: number;
  limit?: number;
  includeArchived?: boolean;
  includeDeleted?: boolean;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) => {
  const token = getAuthToken();
  
  const response = await axios.get(
    `${API_BASE_URL}/api/employees/admin/all`,
    {
      params,
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  
  return response.data;
};

// Archive employee
export const archiveEmployee = async (
  employeeId: string,
  data?: {
    reason?: string;
    notes?: string;
  }
) => {
  const token = getAuthToken();
  
  const response = await axios.post(
    `${API_BASE_URL}/api/employees/admin/${employeeId}/archive`,
    data,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  return response.data;
};

// Unarchive employee
export const unarchiveEmployee = async (
  employeeId: string,
  notes?: string
) => {
  const token = getAuthToken();
  
  const response = await axios.put(
    `${API_BASE_URL}/api/employees/admin/${employeeId}/unarchive`,
    { notes },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  return response.data;
};
```

#### 2. TypeScript Interfaces

```typescript
// Employee interface with archive fields
export interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  gender: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  dateOfBirth: string;
  age: number;
  aadharCardNumber: string;
  employeeType: 'advocate' | 'intern' | 'staff' | 'other';
  advocateLicenseNumber?: string;
  internYear?: number;
  salary: number;
  department: string;
  position: string;
  startDate: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  organization: string;
  adminId: string;
  status: 'pending' | 'active' | 'inactive' | 'terminated';
  
  // ⭐ NEW Archive fields
  employmentStatus: 'employed' | 'archived';
  archivedAt: string | null;
  archivedBy: string | null;
  archiveReason: string | null;
  
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeesResponse {
  success: boolean;
  count: number;
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage: number | null;
  prevPage: number | null;
  data: Employee[];
  filters: {
    includeDeleted: boolean;
    includeArchived: boolean;  // ⭐ NEW
    status: string;
    search: string | null;
  };
  pagination: {
    page: number;
    limit: number;
    sortBy: string;
    sortOrder: string;
  };
}

export interface ArchiveResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    employmentStatus: 'employed' | 'archived';
    status: string;
    archivedAt: string;
    archivedBy: string;
    archiveReason: string;
  };
}
```

#### 3. React Component Example

```typescript
import React, { useState } from 'react';
import { getEmployees, archiveEmployee, unarchiveEmployee } from './api/employeeApi';
import { Employee } from './types/employee';

export const EmployeeList: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load employees
  const loadEmployees = async () => {
    setLoading(true);
    try {
      const response = await getEmployees({
        page: 1,
        limit: 20,
        includeArchived: includeArchived,
      });
      setEmployees(response.data);
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setLoading(false);
    }
  };

  // Archive employee
  const handleArchive = async (employeeId: string) => {
    const confirmed = window.confirm(
      'Are you sure you want to archive this employee? They will be hidden from the active employee list.'
    );
    
    if (!confirmed) return;

    const reason = window.prompt('Reason for archiving:');
    const notes = window.prompt('Additional notes (optional):');

    try {
      await archiveEmployee(employeeId, { reason, notes });
      alert('Employee archived successfully!');
      loadEmployees(); // Reload list
    } catch (error) {
      console.error('Error archiving employee:', error);
      alert('Failed to archive employee');
    }
  };

  // Unarchive employee
  const handleUnarchive = async (employeeId: string) => {
    const confirmed = window.confirm(
      'Are you sure you want to unarchive this employee? They will be restored to the active employee list.'
    );
    
    if (!confirmed) return;

    const notes = window.prompt('Reason for unarchiving (optional):');

    try {
      await unarchiveEmployee(employeeId, notes || undefined);
      alert('Employee unarchived successfully!');
      loadEmployees(); // Reload list
    } catch (error) {
      console.error('Error unarchiving employee:', error);
      alert('Failed to unarchive employee');
    }
  };

  return (
    <div>
      <h1>Employee Management</h1>
      
      {/* Archive Filter Toggle */}
      <div>
        <label>
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
          />
          Show Archived Employees
        </label>
        <button onClick={loadEmployees}>Refresh</button>
      </div>

      {/* Employee List */}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>Status</th>
              <th>Employment Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee._id}>
                <td>{employee.firstName} {employee.lastName}</td>
                <td>{employee.email}</td>
                <td>{employee.department}</td>
                <td>
                  <span className={`status-${employee.status}`}>
                    {employee.status}
                  </span>
                </td>
                <td>
                  <span className={`employment-${employee.employmentStatus}`}>
                    {employee.employmentStatus}
                  </span>
                  {employee.employmentStatus === 'archived' && (
                    <div className="archive-info">
                      <small>
                        Archived: {new Date(employee.archivedAt!).toLocaleDateString()}
                        <br />
                        Reason: {employee.archiveReason}
                      </small>
                    </div>
                  )}
                </td>
                <td>
                  {employee.employmentStatus === 'employed' ? (
                    <button onClick={() => handleArchive(employee._id)}>
                      Archive
                    </button>
                  ) : (
                    <button onClick={() => handleUnarchive(employee._id)}>
                      Unarchive
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
```

#### 4. RTK Query Example (Redux Toolkit)

```typescript
// employeesApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const employeesApi = createApi({
  reducerPath: 'employeesApi',
  baseQuery: fetchBaseQuery({
    baseUrl: 'https://casesnapbackend.onrender.com',
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Employees'],
  endpoints: (builder) => ({
    getEmployees: builder.query({
      query: (params) => ({
        url: '/api/employees/admin/all',
        params,
      }),
      providesTags: ['Employees'],
    }),
    archiveEmployee: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/api/employees/admin/${id}/archive`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Employees'],
    }),
    unarchiveEmployee: builder.mutation({
      query: ({ id, notes }) => ({
        url: `/api/employees/admin/${id}/unarchive`,
        method: 'PUT',
        body: { notes },
      }),
      invalidatesTags: ['Employees'],
    }),
  }),
});

export const {
  useGetEmployeesQuery,
  useArchiveEmployeeMutation,
  useUnarchiveEmployeeMutation,
} = employeesApi;
```

**Usage in Component:**
```typescript
import { useGetEmployeesQuery, useArchiveEmployeeMutation } from './api/employeesApi';

export const EmployeeListRTK: React.FC = () => {
  const [includeArchived, setIncludeArchived] = useState(false);
  
  // Fetch employees
  const { data, isLoading, refetch } = useGetEmployeesQuery({
    page: 1,
    limit: 20,
    includeArchived,
  });

  // Archive mutation
  const [archiveEmployee, { isLoading: isArchiving }] = useArchiveEmployeeMutation();

  const handleArchive = async (employeeId: string) => {
    try {
      await archiveEmployee({
        id: employeeId,
        reason: 'Employee resigned',
        notes: 'Last working day: 2024-01-31',
      }).unwrap();
      alert('Employee archived successfully!');
    } catch (error) {
      console.error('Archive failed:', error);
    }
  };

  // ... rest of component
};
```

---

## 🎨 UI/UX Recommendations

### 1. Employee List View

**Default View (Active Employees Only):**
```
┌─────────────────────────────────────────────┐
│ Employee Management              [+ Invite] │
├─────────────────────────────────────────────┤
│ 📊 Filters:                                 │
│ [ ] Show Archived Employees                 │
│ [Search: _____________] [🔍]                │
├─────────────────────────────────────────────┤
│ Name         Department    Status   Actions │
│ John Doe     Legal         Active   [⋮]     │
│ Jane Smith   HR            Active   [⋮]     │
│ ... showing 10 of 45 employees              │
└─────────────────────────────────────────────┘
```

**With Archived Employees:**
```
┌─────────────────────────────────────────────┐
│ Employee Management              [+ Invite] │
├─────────────────────────────────────────────┤
│ 📊 Filters:                                 │
│ [✓] Show Archived Employees                 │
│ [Search: _____________] [🔍]                │
├─────────────────────────────────────────────┤
│ Name         Department    Status   Actions │
│ John Doe     Legal         Active   [⋮]     │
│ Jane Smith   HR            Active   [⋮]     │
│ Bob Jones    Sales         Archived [⋮] 📦  │
│   └─ Archived: 2024-01-15 (Resigned)        │
│ ... showing 10 of 50 employees              │
└─────────────────────────────────────────────┘
```

### 2. Action Menu (⋮)

**For Active Employees:**
```
┌─────────────────┐
│ View Details    │
│ Edit            │
│ Change Status   │
│ ─────────────── │
│ 📦 Archive      │
│ 🗑️ Delete       │
└─────────────────┘
```

**For Archived Employees:**
```
┌─────────────────┐
│ View Details    │
│ ─────────────── │
│ 📤 Unarchive    │
└─────────────────┘
```

### 3. Archive Confirmation Dialog

```
┌────────────────────────────────────────────┐
│ Archive Employee?                     [×]  │
├────────────────────────────────────────────┤
│                                            │
│ You are about to archive:                 │
│ Name: John Doe                            │
│ Email: john.doe@example.com               │
│                                            │
│ Reason for archiving: *                   │
│ [Employee resigned                      ]  │
│                                            │
│ Additional notes: (optional)              │
│ [Last working day: 2024-01-31           ]  │
│ [Exit interview completed               ]  │
│                                            │
│ ℹ️ Note: Employee data will be preserved  │
│    and can be unarchived if needed.       │
│                                            │
│          [Cancel]  [Archive Employee]     │
└────────────────────────────────────────────┘
```

### 4. Visual Indicators

**Status Badges:**
```css
/* Active Employee */
.badge-employed {
  background: #10b981;
  color: white;
}

/* Archived Employee */
.badge-archived {
  background: #6b7280;
  color: white;
}
```

**Icons:**
- 📦 Archive (use for archive action)
- 📤 Unarchive (use for unarchive action)
- 🗃️ Archived indicator in list

---

## ⚠️ Important Frontend Considerations

### 1. Default Behavior
- **Always default to `includeArchived=false`** in employee list
- Only show archived when user explicitly enables the filter
- This keeps the main employee list clean

### 2. Confirmation Dialogs
- **Always ask for confirmation** before archiving
- **Request reason** for archiving (helps with audit trail)
- Show clear warning that employee will be hidden

### 3. Success Messages
```javascript
// After archive
"Employee archived successfully! They will no longer appear in the active employee list."

// After unarchive
"Employee unarchived successfully! Their status has been set to 'pending' for your review."
```

### 4. Error Handling
```javascript
// Handle common errors
try {
  await archiveEmployee(id);
} catch (error) {
  if (error.response?.status === 400) {
    alert('This employee is already archived');
  } else if (error.response?.status === 404) {
    alert('Employee not found');
  } else if (error.response?.status === 401) {
    alert('Your session has expired. Please login again.');
  } else {
    alert('Failed to archive employee. Please try again.');
  }
}
```

### 5. Loading States
```javascript
// Show loading indicator
{isArchiving && <Spinner />}

// Disable button during operation
<button disabled={isArchiving} onClick={handleArchive}>
  {isArchiving ? 'Archiving...' : 'Archive Employee'}
</button>
```

### 6. After Unarchive
- Employee status is set to `'pending'`
- Remind admin to activate the employee:
  ```
  "Employee unarchived! Don't forget to activate them in their profile."
  ```

---

## 📊 State Management Recommendations

### Recommended State Structure

```typescript
interface EmployeeState {
  employees: Employee[];
  filters: {
    includeArchived: boolean;
    includeDeleted: boolean;
    status: string | null;
    search: string;
    page: number;
    limit: number;
  };
  loading: boolean;
  error: string | null;
  totalCount: number;
  totalPages: number;
}
```

### Filter State Management

```typescript
// Store filter state
const [filters, setFilters] = useState({
  includeArchived: false,  // Default: false
  page: 1,
  limit: 20,
});

// Update filter
const toggleArchived = () => {
  setFilters(prev => ({
    ...prev,
    includeArchived: !prev.includeArchived,
    page: 1, // Reset to first page
  }));
};
```

---

## 🧪 Testing Checklist for Frontend

- [ ] Employee list loads without archived employees by default
- [ ] "Show Archived" toggle works and refetches data
- [ ] Archive button appears for employed employees
- [ ] Archive confirmation dialog appears
- [ ] Archive reason is required
- [ ] Archive request succeeds and shows success message
- [ ] Archived employee disappears from default list
- [ ] Archived employee appears when filter is enabled
- [ ] Archived employee shows archive info (date, reason)
- [ ] Unarchive button appears for archived employees
- [ ] Unarchive confirmation dialog appears
- [ ] Unarchive request succeeds
- [ ] Unarchived employee returns to active list
- [ ] Error messages display correctly
- [ ] Loading states work properly
- [ ] Token expiry is handled gracefully

---

## 📱 Responsive Design Notes

- Archive button: Use icon (📦) on mobile, "Archive" text on desktop
- Archive info: Stack vertically on mobile
- Confirmation dialog: Full-screen on mobile
- Filter toggle: Move to collapsible section on mobile

---

## 🔒 Security Notes

1. **Always include JWT token** in Authorization header
2. **Only admins** can archive/unarchive employees
3. **Check user role** before showing archive buttons
4. **Handle 401/403 errors** by redirecting to login
5. **Never expose** archiveReason in public APIs

---

## 📞 Support & Questions

If you encounter issues:

1. Check console logs for detailed error messages
2. Verify JWT token is included in requests
3. Confirm user has admin role
4. Check API base URL is correct
5. Review this documentation for examples

For backend issues, contact the backend team with:
- API endpoint called
- Request payload
- Response received
- Console error logs

---

## 🎉 Quick Reference

**Archive Employee:**
```
POST /api/employees/admin/:id/archive
Body: { reason, notes }
```

**Unarchive Employee:**
```
PUT /api/employees/admin/:id/unarchive
Body: { notes }
```

**Get Employees (Active Only):**
```
GET /api/employees/admin/all
```

**Get All Employees:**
```
GET /api/employees/admin/all?includeArchived=true
```

**New Employee Fields:**
- `employmentStatus`: 'employed' | 'archived'
- `archivedAt`: Date | null
- `archivedBy`: string | null
- `archiveReason`: string | null

---

## 📝 Summary

✅ **3 new/updated endpoints** for archive functionality  
✅ **Default behavior**: Archived employees are hidden  
✅ **Reversible**: Employees can be unarchived  
✅ **Data preserved**: Nothing is deleted  
✅ **Audit trail**: Who, when, why archived  
✅ **Admin only**: Proper authorization required  

The archive feature is production-ready and waiting for frontend integration! 🚀

