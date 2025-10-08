# Employee Login Implementation Guide

## Overview
The login system now supports both admin and employee authentication through the same endpoint (`POST /api/auth/login`). Employees can login using their email and password, and the system will return complete employee data for frontend display.

## How It Works

### 1. Login Endpoint
- **URL**: `POST /api/auth/login`
- **Access**: Public
- **Supports**: Both Admin and Employee authentication

### 2. Authentication Flow
1. System first attempts to find an admin user with the provided email
2. If no admin found, searches for an employee with the same email
3. Validates password using the appropriate model's `matchPassword` method
4. For employees, checks if account status is 'active'
5. Generates JWT token with role information
6. Returns appropriate user data based on user type

### 3. Response Format

#### For Employees:
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "employee_id",
    "firstName": "John",
    "lastName": "Doe",
    "email": "employee@example.com",
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
    "organization": "organization_object",
    "adminId": "admin_id",
    "status": "active",
    "role": "employee",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### For Admins:
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "admin_id",
    "email": "admin@example.com",
    "name": "Admin User",
    "role": "admin",
    "organization": "organization_object"
  }
}
```

### 4. JWT Token Structure
The JWT token includes:
- `id`: User/Employee ID
- `email`: User/Employee email
- `organization`: Organization ID
- `role`: 'admin' or 'employee'

### 5. Middleware Updates
The authentication middleware (`auth.js`) has been updated to:
- Handle both User and Employee models
- Set `req.userType` to distinguish between admin and employee
- Populate organization data for both user types
- Support role-based authorization

### 6. Frontend Integration
The frontend can now:
1. Use the same login endpoint for both admin and employee users
2. Check the `role` field in the response to determine user type
3. Display complete employee data when an employee logs in
4. Use the JWT token for subsequent API calls

### 7. Security Features
- Password hashing using bcrypt
- JWT token expiration
- Employee status validation (only active employees can login)
- Role-based route protection
- Organization-based data isolation

### 8. Error Handling
- Invalid credentials return 401 status
- Inactive employee accounts return 401 with appropriate message
- Missing email/password returns 400 status
- All errors include descriptive messages

## Testing
Use the provided test script (`test-employee-login.js`) to verify the functionality:

```bash
node test-employee-login.js
```

## Usage Example
```javascript
// Frontend login request
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'employee@example.com',
    password: 'employee123'
  })
});

const data = await loginResponse.json();

if (data.success) {
  // Store token for future requests
  localStorage.setItem('token', data.token);
  
  // Check user type
  if (data.user.role === 'employee') {
    // Display employee dashboard with full employee data
    console.log('Employee logged in:', data.user);
  } else {
    // Display admin dashboard
    console.log('Admin logged in:', data.user);
  }
}
```

This implementation ensures that employees can seamlessly login and access their complete profile data through the same authentication system used by administrators.
