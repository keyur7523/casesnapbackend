# Employee Status Update API

## Overview
This API allows admins to update employee status from pending to active (and other statuses) with full audit trail and flexible update capabilities.

## Endpoint Details

**URL**: `POST /api/employees/:id/status`  
**Access**: Admin Only (requires JWT token)  
**Method**: POST (as requested for flexibility)

## Request Format

### Headers
```javascript
{
  "Authorization": "Bearer <admin_jwt_token>",
  "Content-Type": "application/json"
}
```

### Request Body
```json
{
  "status": "active",
  "reason": "Employee completed registration and background check",
  "notes": "Ready to start work on Monday"
}
```

### Parameters
| Field | Type | Required | Description | Valid Values |
|-------|------|----------|-------------|--------------|
| `status` | string | ✅ Yes | New employee status | `pending`, `active`, `inactive`, `terminated` |
| `reason` | string | ❌ No | Reason for status change | Any text (max 200 chars) |
| `notes` | string | ❌ No | Additional notes | Any text (max 500 chars) |

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Employee activated successfully. They can now login to the system.",
  "data": {
    "employee": {
      "id": "employee_id",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "status": "active",
      "previousStatus": "pending",
      "updatedAt": "2024-01-15T10:30:00.000Z",
      "statusHistory": [
        {
          "from": "pending",
          "to": "active",
          "changedBy": "admin_id",
          "changedAt": "2024-01-15T10:30:00.000Z",
          "reason": "Employee completed registration and background check",
          "notes": "Ready to start work on Monday"
        }
      ]
    }
  }
}
```

### Error Responses

**400 Bad Request**:
```json
{
  "success": false,
  "error": "Invalid status. Must be one of: pending, active, inactive, terminated"
}
```

**404 Not Found**:
```json
{
  "success": false,
  "error": "Employee not found"
}
```

**401 Unauthorized**:
```json
{
  "success": false,
  "error": "Not authorized to access this route"
}
```

## Status Transitions

### 1. **Pending → Active** (Most Common)
```json
{
  "status": "active",
  "reason": "Employee completed registration and verification",
  "notes": "Ready to start work"
}
```
**Result**: Employee can now login to the system

### 2. **Active → Inactive** (Temporary Suspension)
```json
{
  "status": "inactive",
  "reason": "Temporary suspension due to policy violation",
  "notes": "Will review in 30 days"
}
```
**Result**: Employee cannot login until reactivated

### 3. **Active → Terminated** (Permanent)
```json
{
  "status": "terminated",
  "reason": "Employment terminated",
  "notes": "Last working day: 2024-01-15"
}
```
**Result**: Employee permanently cannot access the system

### 4. **Inactive → Active** (Reactivation)
```json
{
  "status": "active",
  "reason": "Suspension lifted after review",
  "notes": "Welcome back to the team"
}
```
**Result**: Employee can login again

## Frontend Implementation

### 1. **Basic Status Update**
```javascript
const updateEmployeeStatus = async (employeeId, status, reason = '', notes = '') => {
  try {
    const response = await fetch(`/api/employees/${employeeId}/status`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status,
        reason,
        notes
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Status updated:', data.message);
      return data.data.employee;
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('❌ Status update failed:', error.message);
    throw error;
  }
};
```

### 2. **React Component Example**
```javascript
import React, { useState } from 'react';

const EmployeeStatusUpdate = ({ employee, onStatusUpdate }) => {
  const [status, setStatus] = useState(employee.status);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const updatedEmployee = await updateEmployeeStatus(
        employee.id, 
        status, 
        reason, 
        notes
      );
      
      onStatusUpdate(updatedEmployee);
      alert('Employee status updated successfully!');
      
      // Reset form
      setReason('');
      setNotes('');
    } catch (error) {
      alert(`Failed to update status: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Status
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="terminated">Terminated</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Reason (Optional)
        </label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g., Employee completed registration"
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Notes (Optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes..."
          rows={3}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      
      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Updating...' : 'Update Status'}
      </button>
    </form>
  );
};

export default EmployeeStatusUpdate;
```

### 3. **Bulk Status Update**
```javascript
const bulkUpdateStatus = async (employeeIds, status, reason = '') => {
  const promises = employeeIds.map(id => 
    updateEmployeeStatus(id, status, reason)
  );
  
  try {
    const results = await Promise.all(promises);
    console.log(`✅ Updated ${results.length} employees to ${status}`);
    return results;
  } catch (error) {
    console.error('❌ Bulk update failed:', error);
    throw error;
  }
};
```

## Audit Trail Features

### 1. **Status History Tracking**
Every status change is automatically logged with:
- Previous status
- New status
- Who made the change (admin ID)
- When it was changed
- Reason (if provided)
- Notes (if provided)

### 2. **History Retrieval**
```javascript
// Get employee with status history
const getEmployeeWithHistory = async (employeeId) => {
  const response = await fetch(`/api/employees/${employeeId}`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  
  const data = await response.json();
  return data.data.employee.statusHistory;
};
```

### 3. **Status Change Notifications**
The API provides different messages based on status transitions:
- **Pending → Active**: "Employee activated successfully. They can now login to the system."
- **Active → Inactive**: "Employee deactivated. They can no longer login to the system."
- **Any → Terminated**: "Employee terminated. They can no longer access the system."

## Usage Examples

### 1. **Activate Employee** (Most Common)
```bash
curl -X POST http://localhost:5004/api/employees/EMPLOYEE_ID/status \
  -H "Authorization: Bearer ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "active",
    "reason": "Employee completed registration and background check",
    "notes": "Ready to start work on Monday"
  }'
```

### 2. **Suspend Employee**
```bash
curl -X POST http://localhost:5004/api/employees/EMPLOYEE_ID/status \
  -H "Authorization: Bearer ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "inactive",
    "reason": "Temporary suspension due to policy violation",
    "notes": "Will review in 30 days"
  }'
```

### 3. **Terminate Employee**
```bash
curl -X POST http://localhost:5004/api/employees/EMPLOYEE_ID/status \
  -H "Authorization: Bearer ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "terminated",
    "reason": "Employment terminated",
    "notes": "Last working day: 2024-01-15"
  }'
```

## Security Features

1. **Admin Only Access**: Only users with admin role can update status
2. **Organization Scoped**: Admins can only update employees in their organization
3. **Audit Trail**: All changes are logged with admin ID and timestamp
4. **Validation**: Status values are validated against allowed values
5. **JWT Protection**: All requests require valid JWT tokens

## Future Enhancements

The POST method allows for easy future enhancements:
- Add more fields to the request body
- Implement bulk status updates
- Add email notifications on status change
- Add approval workflows
- Integrate with HR systems

This flexible POST endpoint provides a solid foundation for employee status management with full audit capabilities!
