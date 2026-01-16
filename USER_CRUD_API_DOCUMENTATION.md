# User CRUD API Documentation

## Overview
Complete CRUD operations for user management with status-based approval workflow.

**Status Flow:**
1. **Invite sent** → `status: "pending"`, `invitationStatus: "pending"`
2. **User completes registration** → `status: "pending"`, `invitationStatus: "completed"` (notification sent to admins)
3. **Admin approves** → `status: "approved"` (user can now login)
4. **User cannot login** until `status: "approved"`

---

## API Endpoints

### 1. List Users

**Endpoint:** `GET /api/users`

**Access:** Private (Requires authentication + `user` module `read` permission)

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (optional) - Filter by status: `pending`, `approved`, `inactive`, `terminated`, or `all`. Can be comma-separated: `pending,approved`
- `roleId` (optional) - Filter by role ID
- `search` (optional) - Search by name or email
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 10)

**Example:**
```
GET /api/users?status=pending&page=1&limit=10
GET /api/users?status=pending,approved&search=john
```

**Response (200 OK):**
```json
{
  "success": true,
  "count": 5,
  "total": 25,
  "page": 1,
  "pages": 3,
  "data": [
    {
      "id": "user_xxxxx",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "1234567890",
      "role": {
        "id": "role_xxxxx",
        "name": "Admin",
        "priority": 2
      },
      "userType": "advocate",
      "salary": 50000,
      "status": "pending",
      "invitationStatus": "completed",
      "invitedBy": {
        "id": "user_yyyyy",
        "firstName": "Admin",
        "lastName": "User"
      },
      "organization": {
        "id": "organization_xxxxx",
        "companyName": "Acme Corp"
      },
      "createdAt": "2024-01-15T..."
    }
  ]
}
```

---

### 2. Get User by ID

**Endpoint:** `GET /api/users/:id`

**Access:** Private (Requires authentication + `user` module `read` permission)

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "user_xxxxx",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "role": {
      "id": "role_xxxxx",
      "name": "Admin",
      "priority": 2,
      "permissions": [...]
    },
    "userType": "advocate",
    "salary": 50000,
    "status": "pending",
    "invitationStatus": "completed",
    "invitedBy": {...},
    "organization": {...},
    "createdAt": "2024-01-15T..."
  }
}
```

---

### 3. Update User

**Endpoint:** `PUT /api/users/:id`

**Access:** Private (Requires authentication + `user` module `update` permission)

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body (all fields optional):**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "1234567890",
  "roleId": "role_xxxxx",
  "userType": "advocate",
  "salary": 55000,
  "status": "approved"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "id": "user_xxxxx",
    "firstName": "John",
    "lastName": "Doe",
    ...
  }
}
```

---

### 4. Approve User

**Endpoint:** `PUT /api/users/:id/approve`

**Access:** Private (Requires authentication + `user` module `update` permission)

**Description:** Changes user status from `pending` to `approved`. Only the inviter or someone with higher role priority can approve.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User approved successfully. User can now login.",
  "data": {
    "id": "user_xxxxx",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "status": "approved",
    ...
  }
}
```

**Error Responses:**
- `400` - User status is not pending, or user hasn't completed registration
- `403` - Not authorized to approve this user

---

### 5. Delete User

**Endpoint:** `DELETE /api/users/:id`

**Access:** Private (Requires authentication + `user` module `delete` permission)

**Description:** Soft delete by setting status to `terminated`. Cannot delete SUPER_ADMIN.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User deleted successfully",
  "data": {
    "id": "user_xxxxx",
    "status": "terminated"
  }
}
```

**Error Responses:**
- `403` - Cannot delete SUPER_ADMIN, or insufficient permissions

---

## Status Flow Details

### 1. Invitation Sent
- **Status:** `pending`
- **InvitationStatus:** `pending`
- **Action:** Email sent to user

### 2. User Completes Registration
- **Status:** `pending` (still pending - cannot login)
- **InvitationStatus:** `completed`
- **Action:** Notification sent to admins (inviter + users with higher role priority)
- **User cannot login yet**

### 3. Admin Approves User
- **Status:** `approved`
- **InvitationStatus:** `completed`
- **Action:** User can now login

### 4. Login Check
- User must have `status: "approved"` to login
- If status is `pending`, login will fail with: "Your account is pending approval. Please wait for admin approval before logging in."

---

## Frontend Implementation Examples

### List Pending Users
```javascript
const getPendingUsers = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch('http://localhost:5004/api/users?status=pending', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  return data.data; // Array of pending users
};
```

### Approve User
```javascript
const approveUser = async (userId) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`http://localhost:5004/api/users/${userId}/approve`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  const data = await response.json();
  return data;
};
```

### Update User
```javascript
const updateUser = async (userId, updates) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`http://localhost:5004/api/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });
  const data = await response.json();
  return data;
};
```

---

## Authorization Rules

### Who Can Approve?
- **The Inviter:** Person who sent the invitation
- **Higher Priority Role:** Users with role priority lower than the user's role (higher authority)
  - Example: SUPER_ADMIN (priority 1) can approve Admin (priority 2)
  - Example: Admin (priority 2) can approve Manager (priority 3)

### Who Can Delete?
- Users with **higher role priority** (lower priority number)
- Cannot delete SUPER_ADMIN

### Who Can Update?
- Users with `user` module `update` permission
- Can update any field except status (use approve endpoint for status change)

---

## Notification System

When a user completes registration:
1. System finds all admins with roles that have higher priority than the user's role
2. System includes the inviter
3. Notification is logged (you can integrate with email/push notifications)

**Notification Log Example:**
```
📢 User registration completed. Notifying admins with IDs: [user_xxx, user_yyy]
📢 User details: {
  id: "user_zzz",
  name: "John Doe",
  email: "john@example.com",
  role: "Admin",
  status: "pending - awaiting approval"
}
```

---

## Error Handling

### Common Errors:

1. **"Your account is pending approval"**
   - User tried to login but status is not `approved`
   - Solution: Admin needs to approve the user

2. **"User status is {status}, not pending"**
   - Trying to approve a user that's already approved/terminated
   - Solution: Check user status first

3. **"You do not have permission to approve this user"**
   - Current user is not the inviter and doesn't have higher role priority
   - Solution: Only inviter or higher authority can approve

4. **"Cannot delete SUPER_ADMIN user"**
   - Trying to delete the system admin
   - Solution: SUPER_ADMIN cannot be deleted

---

## Complete Workflow Example

### Step 1: Admin Sends Invitation
```bash
POST /api/users/invite
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "1234567890",
  "roleId": "role_xxxxx",
  "userType": "advocate",
  "salary": 50000
}
```
**Result:** User created with `status: "pending"`, email sent

### Step 2: User Completes Registration
```bash
POST /api/users/register/{token}
{
  "password": "password123",
  "confirmPassword": "password123"
}
```
**Result:** `invitationStatus: "completed"`, `status: "pending"` (still), notification sent

### Step 3: Admin Approves User
```bash
PUT /api/users/{userId}/approve
```
**Result:** `status: "approved"`, user can now login

### Step 4: User Logs In
```bash
POST /api/auth/login
{
  "email": "john@example.com",
  "password": "password123"
}
```
**Result:** Login successful, token returned

---

## Notes

- Users with `status: "pending"` **cannot login**
- Only users with `status: "approved"` can login
- Notification is currently logged to console (can be extended to email/push)
- Deletion is soft delete (status set to `terminated`)
- SUPER_ADMIN cannot be deleted
- All endpoints require proper RBAC permissions
