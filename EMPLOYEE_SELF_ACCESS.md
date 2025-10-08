# Employee Self-Access API

## Overview
This API provides secure self-access functionality for employees, ensuring they can only view and update their own profile data. Employees cannot access other employees' information, maintaining data privacy and security for case creation workflows.

## Security Model
- **Employee Isolation**: Employees can only access their own data
- **No Cross-Employee Access**: Employees cannot see other employees' details
- **Limited Update Fields**: Employees can only update specific profile fields
- **Admin Override**: Only admins can manage all employee data
- **Case-Ready**: Designed for future case creation functionality

## Endpoints

### 1. Get Employee Profile
**GET** `/api/employees/profile`

**Description**: Retrieve the logged-in employee's own profile information.

**Authentication**: Employee JWT token required

**Response**:
```json
{
  "success": true,
  "data": {
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
    "internYear": null,
    "salary": 50000,
    "department": "Legal",
    "position": "Senior Advocate",
    "startDate": "2024-01-01T00:00:00.000Z",
    "emergencyContactName": "Jane Doe",
    "emergencyContactPhone": "0987654321",
    "emergencyContactRelation": "Spouse",
    "organization": {
      "id": "org_id",
      "companyName": "Legal Firm",
      "companyEmail": "contact@legalfirm.com"
    },
    "adminId": {
      "id": "admin_id",
      "firstName": "Admin",
      "lastName": "User",
      "email": "admin@example.com"
    },
    "status": "active",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2. Update Employee Profile
**PUT** `/api/employees/profile`

**Description**: Update the logged-in employee's own profile. Only specific fields can be updated.

**Authentication**: Employee JWT token required

**Allowed Fields**:
- `phone` - Contact phone number
- `address` - Home address
- `emergencyContactName` - Emergency contact name
- `emergencyContactPhone` - Emergency contact phone
- `emergencyContactRelation` - Relationship to emergency contact

**Request Body**:
```json
{
  "phone": "9876543210",
  "address": "456 New Street, City",
  "emergencyContactName": "Jane Smith",
  "emergencyContactPhone": "9876543210",
  "emergencyContactRelation": "Sister"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "employee_id",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "9876543210",
    "address": "456 New Street, City",
    "emergencyContactName": "Jane Smith",
    "emergencyContactPhone": "9876543210",
    "emergencyContactRelation": "Sister",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 3. Change Employee Password
**PUT** `/api/employees/profile/password`

**Description**: Change the logged-in employee's password.

**Authentication**: Employee JWT token required

**Request Body**:
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword456"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

## Security Features

### 1. Employee Isolation
- Employees can only access their own profile
- No ability to view other employees' data
- JWT token contains employee ID for verification
- Organization-scoped access maintained

### 2. Limited Update Permissions
- Employees can only update specific fields
- Sensitive fields (salary, employee type, etc.) are admin-only
- Field validation ensures data integrity
- Audit trail maintained for all changes

### 3. Account Status Validation
- Soft-deleted employees cannot access any endpoints
- Status validation on all operations
- Clear error messages for deactivated accounts

### 4. Password Security
- Current password verification required
- Password strength validation
- Secure password hashing maintained

## Frontend Implementation

### 1. Employee Profile Component (React)

```javascript
import React, { useState, useEffect } from 'react';

const EmployeeProfile = ({ token }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5004/api/employees/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      setProfile(data.data);
      setFormData({
        phone: data.data.phone || '',
        address: data.data.address || '',
        emergencyContactName: data.data.emergencyContactName || '',
        emergencyContactPhone: data.data.emergencyContactPhone || '',
        emergencyContactRelation: data.data.emergencyContactRelation || ''
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:5004/api/employees/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      if (data.success) {
        setProfile({ ...profile, ...data.data });
        setEditing(false);
        alert('Profile updated successfully');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (loading && !profile) return <div>Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">My Profile</h2>
      
      <div className="bg-white rounded-lg shadow p-6">
        {/* Read-only information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <p className="mt-1 text-sm text-gray-900">
              {profile?.firstName} {profile?.lastName}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <p className="mt-1 text-sm text-gray-900">{profile?.email}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Employee Type</label>
            <p className="mt-1 text-sm text-gray-900 capitalize">{profile?.employeeType}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Department</label>
            <p className="mt-1 text-sm text-gray-900">{profile?.department}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Position</label>
            <p className="mt-1 text-sm text-gray-900">{profile?.position}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              profile?.status === 'active' ? 'bg-green-100 text-green-800' :
              profile?.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {profile?.status}
            </span>
          </div>
        </div>

        {/* Editable form */}
        {editing ? (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows={3}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Emergency Contact Name</label>
                <input
                  type="text"
                  name="emergencyContactName"
                  value={formData.emergencyContactName}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Emergency Contact Phone</label>
                <input
                  type="tel"
                  name="emergencyContactPhone"
                  value={formData.emergencyContactPhone}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Emergency Contact Relation</label>
                <input
                  type="text"
                  name="emergencyContactRelation"
                  value={formData.emergencyContactRelation}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Profile'}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex justify-end">
            <button
              onClick={() => setEditing(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Edit Profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeProfile;
```

### 2. Password Change Component

```javascript
import React, { useState } from 'react';

const ChangePassword = ({ token }) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      setMessage('New passwords do not match');
      return;
    }
    
    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('http://localhost:5004/api/employees/profile/password', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage('Password changed successfully');
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        setMessage(data.message || 'Failed to change password');
      }
    } catch (error) {
      setMessage('Error changing password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h3 className="text-lg font-medium mb-4">Change Password</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Current Password</label>
          <input
            type="password"
            name="currentPassword"
            value={formData.currentPassword}
            onChange={handleChange}
            required
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">New Password</label>
          <input
            type="password"
            name="newPassword"
            value={formData.newPassword}
            onChange={handleChange}
            required
            minLength={6}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        {message && (
          <div className={`text-sm ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
            {message}
          </div>
        )}
        
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Changing...' : 'Change Password'}
        </button>
      </form>
    </div>
  );
};

export default ChangePassword;
```

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
  "error": "Your account has been deactivated. Please contact your administrator."
}
```

**404 Not Found**:
```json
{
  "success": false,
  "error": "Employee profile not found"
}
```

**400 Bad Request**:
```json
{
  "success": false,
  "error": "Emergency contact phone must be a 10-digit number"
}
```

## Case Creation Integration

This employee self-access system is designed to support future case creation functionality:

1. **Employee Identification**: Each employee has a unique ID for case assignment
2. **Profile Completeness**: Employees can maintain their contact information
3. **Security Isolation**: Employees cannot see other employees' data
4. **Admin Override**: Admins can manage all employee data for case assignment
5. **Status Tracking**: Employee status affects case assignment eligibility

## Best Practices

1. **Always validate employee status** before allowing profile access
2. **Implement proper error handling** for deactivated accounts
3. **Use secure password practices** for password changes
4. **Maintain audit logs** for profile updates
5. **Implement proper validation** for all input fields
6. **Use HTTPS** for all API communications
7. **Implement rate limiting** for password change attempts

This employee self-access system ensures data privacy while providing necessary functionality for case management workflows.
