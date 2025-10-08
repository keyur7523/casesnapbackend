# Invite Endpoint Fix Guide

## 🐛 The Problem

You're getting `{"success":false,"error":"No user found with this token"}` when calling:
```
POST http://localhost:5004/api/employees/invite
```

This error means the authentication middleware can't find a valid user with the provided token.

## 🔍 Root Causes

### 1. **Missing Authorization Header**
```javascript
// ❌ Wrong - No authorization header
fetch('/api/employees/invite', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});

// ✅ Correct - With authorization header
fetch('/api/employees/invite', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(data)
});
```

### 2. **Invalid or Expired Token**
- Token is malformed
- Token has expired
- Token doesn't belong to an admin user

### 3. **Wrong Authorization Header Format**
```javascript
// ❌ Wrong formats
'Authorization': token                    // Missing "Bearer "
'Authorization': `bearer ${token}`        // Lowercase "bearer"
'Authorization': `Bearer${token}`         // No space

// ✅ Correct format
'Authorization': `Bearer ${token}`       // Uppercase "Bearer" with space
```

## 🔧 Quick Fixes

### 1. **Check Your Frontend Code**
Make sure you're including the authorization header:

```javascript
// Get the token from localStorage or state
const token = localStorage.getItem('token'); // or from your auth state

// Make the request with proper headers
const response = await fetch('/api/employees/invite', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    salary: 50000
  })
});
```

### 2. **Test with Debug Script**
```bash
node debug-invite-endpoint.js
```

This will test:
- Admin login
- Token validation
- Different authorization header formats
- Invite endpoint with proper authentication

### 3. **Check Token Validity**
```javascript
// In your frontend, check if token exists and is valid
const token = localStorage.getItem('token');

if (!token) {
  console.log('❌ No token found - user needs to login');
  // Redirect to login page
  return;
}

// Test the token by making a simple authenticated request
try {
  const response = await fetch('/api/employees/profile', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (response.ok) {
    console.log('✅ Token is valid');
  } else {
    console.log('❌ Token is invalid - user needs to login');
    // Redirect to login page
  }
} catch (error) {
  console.log('❌ Token validation failed:', error);
}
```

## 🚀 Complete Frontend Implementation

### 1. **Login First**
```javascript
// Login as admin
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@example.com',
    password: 'admin123'
  })
});

const loginData = await loginResponse.json();

if (loginData.success) {
  // Store token for future requests
  localStorage.setItem('token', loginData.token);
  console.log('✅ Admin logged in successfully');
} else {
  console.log('❌ Login failed:', loginData.error);
}
```

### 2. **Send Employee Invitation**
```javascript
// Get token from storage
const token = localStorage.getItem('token');

if (!token) {
  console.log('❌ No token found - please login first');
  return;
}

// Send invitation
const inviteResponse = await fetch('/api/employees/invite', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    salary: 50000
  })
});

const inviteData = await inviteResponse.json();

if (inviteData.success) {
  console.log('✅ Employee invitation sent successfully');
  console.log('🔗 Invitation link:', inviteData.data.invitationLink);
} else {
  console.log('❌ Invitation failed:', inviteData.error);
}
```

## 🔍 Debug Steps

### 1. **Check Network Tab**
- Open Developer Tools → Network tab
- Make the invite request
- Check the request headers
- Look for the Authorization header

### 2. **Check Console Logs**
- Look for authentication errors
- Check if token is being sent correctly
- Verify the request format

### 3. **Test with Postman**
```bash
# Test the login endpoint
POST http://localhost:5004/api/auth/login
{
  "email": "admin@example.com",
  "password": "admin123"
}

# Use the token from login response
POST http://localhost:5004/api/employees/invite
Authorization: Bearer YOUR_TOKEN_HERE
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "salary": 50000
}
```

## ✅ Expected Results

After fixing the authentication:

1. **Login Response**:
   ```json
   {
     "success": true,
     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "user": {
       "id": "admin_id",
       "email": "admin@example.com",
       "role": "admin"
     }
   }
   ```

2. **Invite Response**:
   ```json
   {
     "success": true,
     "message": "Employee invitation sent successfully",
     "data": {
       "employee": { ... },
       "invitationLink": "http://localhost:3000/employees/register?token=..."
     }
   }
   ```

## 🚨 Common Mistakes

1. **Forgetting to login first**
2. **Not storing the token after login**
3. **Missing Authorization header**
4. **Wrong header format**
5. **Using expired token**
6. **Not checking if user is admin**

The key is to ensure you're properly authenticated as an admin before making the invite request!
