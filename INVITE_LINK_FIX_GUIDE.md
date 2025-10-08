# Invite Link Fix Guide

## 🐛 The Problem

You're getting `{success: false, error: "No user found with this token"}` when clicking invite links. This happens because:

1. **Token Confusion**: The invite link uses an `invitationToken` (random string), but somewhere it's being treated as a JWT token
2. **Authentication Middleware**: The auth middleware is trying to verify the invitation token as a JWT token
3. **Route Protection**: The invite routes might be incorrectly protected

## ✅ The Fix

I've updated the `getEmployeeByToken` function to handle both types of tokens:

### 1. **Enhanced Token Handling**
- First tries to find employee by `invitationToken` (random string)
- If not found, checks if it's a JWT token and looks up by employee ID
- Provides better error messages and logging

### 2. **Improved Debugging**
- Added detailed console logs to track token processing
- Shows exactly what type of token is being processed
- Logs employee lookup results

## 🔧 How to Test the Fix

### 1. **Run the Test Script**
```bash
node test-invite-link.js
```

This will:
- Send an employee invitation
- Test the invitation token lookup
- Complete employee registration
- Test employee login

### 2. **Check Server Logs**
When you click an invite link, you should see logs like:
```
🔍 Looking up employee by invitation token: abc123...
✅ Employee found: { id: ..., name: "John Doe", email: "john@example.com" }
```

### 3. **Test the API Directly**
```bash
# Test with curl
curl "http://localhost:5004/api/employees/register/YOUR_INVITATION_TOKEN"
```

## 🚨 Common Issues and Solutions

### Issue 1: "Invalid or expired invitation link"
**Cause**: The invitation token doesn't exist or has expired
**Solution**: 
- Check if the employee was created with the invitation
- Verify the token in the database
- Check if the invitation has expired

### Issue 2: "No user found with this token"
**Cause**: The token is being processed as a JWT token instead of invitation token
**Solution**: 
- The fix I implemented should handle this
- Check server logs to see what type of token is being processed

### Issue 3: Frontend Route Issues
**Cause**: Frontend might be calling the wrong endpoint
**Solution**: Ensure frontend calls:
```
GET /api/employees/register/:token
```
Not:
```
GET /api/employees/profile (requires JWT token)
```

## 🔍 Debug Steps

### 1. **Check the Invitation Token**
```javascript
// In your frontend, extract the token from the URL
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');
console.log('Invitation token:', token);
```

### 2. **Test the API Endpoint**
```bash
# Replace YOUR_TOKEN with the actual token from the URL
curl "http://localhost:5004/api/employees/register/YOUR_TOKEN"
```

### 3. **Check Database**
```bash
# Run the database check script
node check-database.js
```

### 4. **Check Server Logs**
Look for these log messages:
- `🔍 Looking up employee by invitation token: ...`
- `✅ Employee found: ...`
- `❌ No employee found with token: ...`

## 📊 Expected Flow

### 1. **Admin Sends Invitation**
```
POST /api/employees/invite
→ Creates employee with invitationToken
→ Sends email with invitation link
```

### 2. **Employee Clicks Link**
```
GET /api/employees/register/:token
→ Finds employee by invitationToken
→ Returns employee data for registration form
```

### 3. **Employee Completes Registration**
```
POST /api/employees/register/:token
→ Updates employee with registration data
→ Sets invitationStatus to 'completed'
→ Returns JWT token for login
```

### 4. **Employee Logs In**
```
POST /api/auth/login
→ Authenticates with email/password
→ Returns JWT token for future requests
```

## 🎯 Frontend Integration

### Correct API Calls
```javascript
// 1. Get employee data by invitation token
const getEmployeeByToken = async (token) => {
  const response = await fetch(`/api/employees/register/${token}`);
  return response.json();
};

// 2. Complete registration
const completeRegistration = async (token, registrationData) => {
  const response = await fetch(`/api/employees/register/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(registrationData)
  });
  return response.json();
};

// 3. Employee login (after registration)
const employeeLogin = async (email, password) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return response.json();
};
```

### URL Parameter Extraction
```javascript
// Extract token from URL
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

if (token) {
  // Load employee data for registration form
  const employeeData = await getEmployeeByToken(token);
  // Populate form with employee data
}
```

## 🔧 Quick Fixes

### If Still Getting "No user found with this token":

1. **Check the token type**:
   ```javascript
   console.log('Token type:', typeof token);
   console.log('Token length:', token.length);
   // Invitation tokens are usually 64 characters (random string)
   // JWT tokens are much longer and contain dots
   ```

2. **Verify the route**:
   ```javascript
   // Make sure you're calling the right endpoint
   const response = await fetch(`/api/employees/register/${token}`);
   ```

3. **Check server logs**:
   Look for the debug messages I added to see exactly what's happening.

## ✅ Success Indicators

After the fix, you should see:
- ✅ Invitation links work without "No user found" errors
- ✅ Employee data loads correctly in registration form
- ✅ Registration completes successfully
- ✅ Employee can login after registration
- ✅ Server logs show successful token processing

The fix I implemented should resolve the "No user found with this token" error by properly handling both invitation tokens and JWT tokens in the employee lookup process.
