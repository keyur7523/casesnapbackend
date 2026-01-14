# Setup API Payload Example with Subscription Plan

## Endpoint
`POST /api/setup/initialize`

## Complete Payload Structure

```json
{
  "organization": {
    "companyName": "Bane Associates",
    "companyEmail": "contact@baneassociates.com",
    "companyPhone": "9876543210",
    "streetAddress": "123 Main Street",
    "city": "Mumbai",
    "province": "Maharashtra",
    "postalCode": "400001",
    "country": "India",
    "companyWebsite": "https://www.baneassociates.com",
    "industry": "Legal Services",
    "practiceAreas": ["Corporate Law", "Criminal Law", "Family Law"],
    "subscriptionPlan": "popular"  // ← ADD THIS FIELD HERE
  },
  "superAdmin": {
    "firstName": "Pooja",
    "lastName": "Bane",
    "email": "pooja@baneassociates.com",
    "phone": "9988776655",
    "password": "SecurePassword123",
    "confirmPassword": "SecurePassword123"
  }
}
```

## Subscription Plan Values

The `subscriptionPlan` field accepts **only** these three values:
- `"free"` - Free plan (default if not provided)
- `"base"` - Base plan
- `"popular"` - Popular plan

**Note**: The value is case-insensitive. Both `"Popular"` and `"popular"` will work, but it will be normalized to lowercase in the database.

## Where to Add in Frontend

### Example: React/Next.js Component

```javascript
// In your setup/registration form component
const handleSubmit = async (formData) => {
  const payload = {
    organization: {
      companyName: formData.companyName,
      companyEmail: formData.companyEmail,
      companyPhone: formData.companyPhone,
      streetAddress: formData.streetAddress,
      city: formData.city,
      province: formData.province,
      postalCode: formData.postalCode,
      country: formData.country || "India",
      companyWebsite: formData.companyWebsite || "",
      industry: formData.industry,
      practiceAreas: formData.practiceAreas,
      subscriptionPlan: formData.subscriptionPlan || "free" // ← ADD HERE
    },
    superAdmin: {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
      confirmPassword: formData.confirmPassword
    }
  };

  try {
    const response = await fetch('http://localhost:5004/api/setup/initialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('Setup successful:', data);
  } catch (error) {
    console.error('Setup failed:', error);
  }
};
```

### Example: Form Field (React)

```jsx
// In your form JSX
<select 
  name="subscriptionPlan" 
  value={formData.subscriptionPlan} 
  onChange={(e) => setFormData({...formData, subscriptionPlan: e.target.value})}
  required
>
  <option value="free">Free Plan</option>
  <option value="base">Base Plan</option>
  <option value="popular">Popular Plan</option>
</select>
```

## Response Structure

After successful setup, you'll receive:

```json
{
  "success": true,
  "message": "Organization and Super Admin initialized successfully.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_xxxxx",
    "firstName": "Pooja",
    "lastName": "Bane",
    "email": "pooja@baneassociates.com",
    "role": {
      "id": "role_xxxxx",
      "name": "SUPER_ADMIN",
      "priority": 1,
      "permissions": [...],
      "isSystemRole": true,
      "description": "Super Administrator with full system access"
    },
    "organizationId": "organization_xxxxx",
    "subscriptionPlan": "popular"  // ← Subscription plan in user object
  },
  "organization": {
    "id": "organization_xxxxx",
    "companyName": "Bane Associates",
    "companyEmail": "contact@baneassociates.com",
    "subscriptionPlan": "popular"  // ← Subscription plan in organization object
  }
}
```

---

## Login Response Structure

When a user logs in (`POST /api/auth/login`), the subscription plan is also included:

### For Admin Users:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_xxxxx",
    "firstName": "Pooja",
    "lastName": "Bane",
    "email": "pooja@baneassociates.com",
    "organizationId": "organization_xxxxx",
    "subscriptionPlan": "popular",  // ← Subscription plan included here
    "role": {
      "id": "role_xxxxx",
      "name": "SUPER_ADMIN",
      "priority": 1,
      "permissions": [...],
      "isSystemRole": true,
      "description": "Super Administrator with full system access"
    }
  }
}
```

### For Employee Users:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "employee_xxxxx",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    // ... other employee fields ...
    "organization": {
      "_id": "organization_xxxxx",
      "companyName": "Bane Associates",
      "companyEmail": "contact@baneassociates.com"
    },
    "subscriptionPlan": "popular",  // ← Subscription plan included here
    "role": "employee",
    "status": "active"
  }
}
```

## Validation Rules

1. **Required**: The field is required, but defaults to `"free"` if not provided
2. **Enum Values**: Must be exactly one of: `"free"`, `"base"`, or `"popular"`
3. **Case Insensitive**: `"Popular"`, `"POPULAR"`, or `"popular"` all work
4. **Error Response**: If invalid value is sent, you'll get:
   ```json
   {
     "success": false,
     "error": "Subscription plan must be one of: free, base, popular"
   }
   ```

## Frontend Implementation Checklist

- [ ] Add subscription plan field to your organization form
- [ ] Create a dropdown/select with three options: free, base, popular
- [ ] Include `subscriptionPlan` in the `organization` object when sending the payload
- [ ] Handle the subscription plan in the response to display it to the user
- [ ] Store the subscription plan in your frontend state/context if needed
