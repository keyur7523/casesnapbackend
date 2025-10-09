# Employee Invitation API - Updated & Simplified

## 🎉 What's New

The employee invitation API has been **simplified**. Admins now only need to provide **email and name** to send an invitation!

---

## 📡 Updated Endpoint

### Send Employee Invitation (Simplified)

**Endpoint:** `POST /api/employees/invite`

**Base URL:** `https://casesnapbackend.onrender.com`

**Authentication:** Required (Admin JWT token)

---

## 📝 Request Format

### Minimal Request (Recommended)

```json
POST https://casesnapbackend.onrender.com/api/employees/invite
Authorization: Bearer YOUR_ADMIN_TOKEN
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com"
}
```

### With Optional Salary

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "salary": 50000
}
```

---

## ✅ Required Fields

| Field | Required | Description |
|-------|----------|-------------|
| `firstName` | ✅ Yes | Employee's first name |
| `lastName` | ✅ Yes | Employee's last name |
| `email` | ✅ Yes | Employee's email (where invitation is sent) |
| `salary` | ❌ No | Optional - defaults to 0 if not provided |

---

## 📨 What Happens

1. **Admin sends invitation** with just email and name
2. **System creates employee record** with `salary: 0` (if not provided)
3. **Invitation email sent** to the provided email address
4. **Employee receives email** with registration link
5. **Employee completes registration** with all details (including salary if needed)

---

## 🎯 Response Examples

### Success Response

```json
{
  "success": true,
  "message": "Employee invitation sent successfully",
  "data": {
    "employee": {
      "id": "507f1f77bcf86cd799439011",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "salary": 0,
      "invitationStatus": "pending",
      "invitationExpires": "2024-01-22T00:00:00.000Z"
    },
    "invitationLink": "http://localhost:3000/employees/register?token=abc123..."
  }
}
```

---

## ❌ Error Responses

### Missing Email
```json
Request:
{
  "firstName": "John",
  "lastName": "Doe"
}

Response: 400 Bad Request
{
  "success": false,
  "error": "Email is required"
}
```

### Missing Name
```json
Request:
{
  "email": "john@example.com"
}

Response: 400 Bad Request
{
  "success": false,
  "error": "First name and last name are required"
}
```

### Invalid Salary (if provided)
```json
Request:
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "salary": -5000
}

Response: 400 Bad Request
{
  "success": false,
  "error": "Salary must be a valid positive number"
}
```

---

## 💻 Code Examples

### JavaScript/TypeScript (Axios)

```typescript
import axios from 'axios';

const inviteEmployee = async (data: {
  firstName: string;
  lastName: string;
  email: string;
  salary?: number;  // Optional
}) => {
  const token = localStorage.getItem('authToken');
  
  const response = await axios.post(
    'https://casesnapbackend.onrender.com/api/employees/invite',
    {
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: data.email.trim(),
      // Salary is optional - only include if provided
      ...(data.salary && { salary: data.salary })
    },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return response.data;
};

// Usage - Simple invitation
await inviteEmployee({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com'
});

// Usage - With salary
await inviteEmployee({
  firstName: 'Jane',
  lastName: 'Smith',
  email: 'jane@example.com',
  salary: 75000
});
```

### Fetch API

```javascript
const inviteEmployee = async (firstName, lastName, email, salary = null) => {
  const token = localStorage.getItem('authToken');
  
  const body = {
    firstName,
    lastName,
    email
  };
  
  // Only include salary if provided
  if (salary) {
    body.salary = salary;
  }
  
  const response = await fetch(
    'https://casesnapbackend.onrender.com/api/employees/invite',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  );
  
  return response.json();
};
```

### cURL

```bash
# Simple invitation
curl -X POST https://casesnapbackend.onrender.com/api/employees/invite \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com"
  }'

# With salary
curl -X POST https://casesnapbackend.onrender.com/api/employees/invite \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@example.com",
    "salary": 75000
  }'
```

---

## 🎨 Frontend Form Example

### Simple Invite Form (React)

```tsx
import React, { useState } from 'react';

export const InviteEmployeeForm: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    salary: ''  // Optional field
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Minimal request body
    const requestBody: any = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim(),
    };
    
    // Only include salary if provided
    if (formData.salary && Number(formData.salary) > 0) {
      requestBody.salary = Number(formData.salary);
    }
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        'https://casesnapbackend.onrender.com/api/employees/invite',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }
      );
      
      const result = await response.json();
      
      if (result.success) {
        alert('Invitation sent successfully!');
        // Reset form
        setFormData({ firstName: '', lastName: '', email: '', salary: '' });
      }
    } catch (error) {
      console.error('Invitation failed:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>First Name *</label>
        <input
          type="text"
          value={formData.firstName}
          onChange={(e) => setFormData({...formData, firstName: e.target.value})}
          required
        />
      </div>

      <div>
        <label>Last Name *</label>
        <input
          type="text"
          value={formData.lastName}
          onChange={(e) => setFormData({...formData, lastName: e.target.value})}
          required
        />
      </div>

      <div>
        <label>Email Address *</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          required
        />
      </div>

      <div>
        <label>Salary (Optional)</label>
        <input
          type="number"
          value={formData.salary}
          onChange={(e) => setFormData({...formData, salary: e.target.value})}
          placeholder="Leave blank if not decided yet"
        />
        <small>Can be set later during employee registration</small>
      </div>

      <button type="submit">Send Invitation</button>
    </form>
  );
};
```

---

## 📊 Comparison

### Before
```
Admin fills: firstName, lastName, email, salary (4 fields)
         ↓
Employee receives invitation
         ↓
Employee fills: phone, address, gender, DOB, etc.
```

### After
```
Admin fills: firstName, lastName, email (3 fields)
         ↓
Employee receives invitation
         ↓
Employee fills: phone, address, gender, DOB, salary, etc.
```

---

## 🔄 Where Salary Can Be Set

### Option 1: During Employee Registration
Employee fills in salary when completing registration form.

### Option 2: Admin Updates Later
Admin can update salary after employee is created:
```
PUT /api/employees/admin/:id
{
  "salary": 50000
}
```

### Option 3: During Invitation (Optional)
Admin can still provide salary during invitation if they want:
```
POST /api/employees/invite
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "salary": 50000
}
```

---

## ✅ Summary

**Updated:** `POST /api/employees/invite`

**Required Now:** Only `email`, `firstName`, `lastName`  
**Optional:** `salary` (defaults to 0)

**Benefits:**
- Faster invitation process
- Less fields to fill
- More flexible workflow
- Salary can be handled separately

**Status:** ✅ Live on production  
**URL:** `https://casesnapbackend.onrender.com/api/employees/invite`

The invitation process is now **simpler and more flexible**! 🚀

