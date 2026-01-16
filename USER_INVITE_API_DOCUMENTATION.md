# User Invite API Documentation

## Overview
This API allows admins to invite users to join the organization with a specific role. The invitation flow works exactly like employee invitations:
1. Admin sends invitation → Status: `pending`
2. Email sent to invited user
3. Only the inviter OR someone with higher role priority can accept/complete the registration
4. User completes registration → Status: `completed`

---

## API Endpoints

### 1. Send User Invitation

**Endpoint:** `POST /api/users/invite`

**Access:** Private (Requires authentication + `user` module `create` permission)

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "1234567890",
  "roleId": "role_xxxxx"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "User invitation sent successfully",
  "data": {
    "user": {
      "id": "user_xxxxx",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phone": "1234567890",
      "role": {
        "id": "role_xxxxx",
        "name": "Admin",
        "priority": 2
      },
      "invitationStatus": "pending",
      "invitationExpires": "2024-01-21T12:00:00.000Z"
    },
    "invitationLink": "http://localhost:3000/users/register?token=abc123...",
    "emailSent": true
  }
}
```

**Error Responses:**
- `400` - Missing required fields, invalid phone format, role not found
- `403` - No permission to create users
- `404` - Role not found or doesn't belong to organization

---

### 2. Get User by Invitation Token

**Endpoint:** `GET /api/users/register/:token`

**Access:** Public (but authorization check if authenticated)

**Headers (Optional):**
```
Authorization: Bearer <token>  // Optional - only needed if checking authorization
```

**URL Parameters:**
- `token` - Invitation token from the invitation link

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_xxxxx",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phone": "1234567890",
      "role": {
        "id": "role_xxxxx",
        "name": "Admin",
        "priority": 2
      },
      "organization": {
        "_id": "organization_xxxxx",
        "companyName": "Acme Corp",
        "companyEmail": "contact@acme.com"
      }
    }
  }
}
```

**Authorization Logic:**
- If **not authenticated**: Anyone with the token can view (public access)
- If **authenticated**: Only the inviter OR someone with higher role priority (lower priority number) can view

**Error Responses:**
- `400` - Invalid or expired invitation link
- `403` - Not authorized to view this invitation (if authenticated)

---

### 3. Complete User Registration

**Endpoint:** `POST /api/users/register/:token`

**Access:** Public (but authorization check if authenticated)

**Headers (Optional):**
```
Authorization: Bearer <token>  // Optional - only needed if checking authorization
Content-Type: application/json
```

**URL Parameters:**
- `token` - Invitation token from the invitation link

**Request Body:**
```json
{
  "password": "securePassword123",
  "confirmPassword": "securePassword123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User registration completed successfully",
  "data": {
    "user": {
      "id": "user_xxxxx",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phone": "1234567890",
      "role": {
        "id": "role_xxxxx",
        "name": "Admin",
        "priority": 2
      },
      "invitationStatus": "completed"
    }
  }
}
```

**Authorization Logic:**
- If **not authenticated**: Anyone with the token can complete registration (public access)
- If **authenticated**: Only the inviter OR someone with higher role priority (lower priority number) can complete registration

**Error Responses:**
- `400` - Invalid password, passwords don't match, invalid/expired token
- `403` - Not authorized to complete this registration (if authenticated)

---

## Frontend Implementation Guide

### Step 1: Send Invitation (Admin Panel)

```javascript
// components/UserInviteForm.jsx
import { useState } from 'react';
import axios from 'axios';

const UserInviteForm = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    roleId: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5004/api/users/invite',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setSuccess('Invitation sent successfully!');
      console.log('Invitation link:', response.data.data.invitationLink);
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        roleId: ''
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="First Name"
        value={formData.firstName}
        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
        required
      />
      <input
        type="text"
        placeholder="Last Name"
        value={formData.lastName}
        onChange={(e) => setFormData({...formData, lastName: e.target.value})}
        required
      />
      <input
        type="email"
        placeholder="Email"
        value={formData.email}
        onChange={(e) => setFormData({...formData, email: e.target.value})}
        required
      />
      <input
        type="tel"
        placeholder="Phone (10 digits)"
        value={formData.phone}
        onChange={(e) => setFormData({...formData, phone: e.target.value})}
        pattern="[0-9]{10}"
        required
      />
      <select
        value={formData.roleId}
        onChange={(e) => setFormData({...formData, roleId: e.target.value})}
        required
      >
        <option value="">Select Role</option>
        {/* Populate from roles API */}
      </select>
      <button type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Send Invitation'}
      </button>
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}
    </form>
  );
};
```

### Step 2: Registration Page (Public)

```javascript
// pages/users/register.jsx or pages/users/register/[token].jsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

const UserRegistrationPage = () => {
  const router = useRouter();
  const { token } = router.query;
  const [userData, setUserData] = useState(null);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch user data by token
  useEffect(() => {
    if (token) {
      fetchUserData();
    }
  }, [token]);

  const fetchUserData = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5004/api/users/register/${token}`
      );
      setUserData(response.data.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid invitation link');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(
        `http://localhost:5004/api/users/register/${token}`,
        {
          password: formData.password,
          confirmPassword: formData.confirmPassword
        }
      );

      setSuccess('Registration completed successfully!');
      // Redirect to login page after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to complete registration');
    } finally {
      setLoading(false);
    }
  };

  if (!userData && !error) {
    return <div>Loading...</div>;
  }

  if (error && !userData) {
    return (
      <div>
        <h1>Invalid Invitation</h1>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Complete Your Registration</h1>
      <p>Welcome, {userData?.firstName} {userData?.lastName}!</p>
      <p>Email: {userData?.email}</p>
      <p>Role: {userData?.role?.name}</p>
      <p>Organization: {userData?.organization?.companyName}</p>

      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})}
          required
          minLength={6}
        />
        <input
          type="password"
          placeholder="Confirm Password"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
          required
          minLength={6}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Completing...' : 'Complete Registration'}
        </button>
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}
      </form>
    </div>
  );
};

export default UserRegistrationPage;
```

### Step 3: Admin View/Complete Registration (Optional - with Authorization)

If you want admins to be able to view and complete registrations on behalf of users:

```javascript
// components/AdminUserRegistration.jsx
import { useState } from 'react';
import axios from 'axios';

const AdminUserRegistration = ({ token }) => {
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const adminToken = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:5004/api/users/register/${token}`,
        {
          password: formData.password,
          confirmPassword: formData.confirmPassword
        },
        {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      alert('Registration completed successfully!');
      // Refresh or redirect
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to complete registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Same form as above */}
    </form>
  );
};
```

---

## Authorization Rules

### Who Can Accept/Complete Registration?

1. **Public Access (No Auth):**
   - Anyone with the invitation token can view and complete registration
   - This allows the invited user to complete registration themselves

2. **Authenticated Access:**
   - **The Inviter:** The person who sent the invitation (`invitedBy` matches current user)
   - **Higher Priority Role:** Someone with a role that has lower priority number (higher authority)
     - Example: SUPER_ADMIN (priority 1) can accept for Admin (priority 2)
     - Example: Admin (priority 2) can accept for Manager (priority 3)

### Priority Logic:
- **Lower priority number = Higher authority**
- Priority 1 (SUPER_ADMIN) > Priority 2 (Admin) > Priority 3 (Manager)

---

## Email Template

The invitation email includes:
- User's name
- Organization name
- Role name
- Invitation link
- Expiration notice (7 days)
- Admin contact information

---

## Error Handling

### Common Errors:

1. **"Role not found or does not belong to your organization"**
   - Check that `roleId` exists and belongs to the same organization

2. **"An invitation has already been sent to this email address"**
   - User already has a pending invitation
   - Wait for it to expire or cancel the existing invitation

3. **"You do not have permission to view/complete this invitation"**
   - Current user is not the inviter AND doesn't have higher role priority
   - Only the inviter or someone with higher authority can access

4. **"Invitation link has expired"**
   - Token expired (7 days)
   - Send a new invitation

---

## Testing

### Test Flow:

1. **Login as Admin:**
   ```bash
   POST /api/auth/login
   ```

2. **Send Invitation:**
   ```bash
   POST /api/users/invite
   {
     "firstName": "Test",
     "lastName": "User",
     "email": "test@example.com",
     "phone": "1234567890",
     "roleId": "role_xxxxx"
   }
   ```

3. **Get User by Token (Public):**
   ```bash
   GET /api/users/register/{token}
   ```

4. **Complete Registration (Public):**
   ```bash
   POST /api/users/register/{token}
   {
     "password": "password123",
     "confirmPassword": "password123"
   }
   ```

5. **Complete Registration (As Admin - with Auth):**
   ```bash
   POST /api/users/register/{token}
   Authorization: Bearer {admin_token}
   {
     "password": "password123",
     "confirmPassword": "password123"
   }
   ```

---

## Notes

- Invitation tokens expire after 7 days
- Password must be at least 6 characters
- Phone number must be exactly 10 digits
- Role must exist and belong to the same organization
- Invitation status changes from `pending` → `completed` after registration
- Token is removed after successful registration
