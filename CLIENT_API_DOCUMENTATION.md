# Client Management API Documentation

## Base URL
All client endpoints are prefixed with: `/api/clients`

## Authentication
All endpoints require:
- **Bearer Token** in Authorization header: `Authorization: Bearer <token>`
- User must be authenticated (admin user)
- User must have appropriate permissions on `client` module

---

## Endpoints Overview

| Method | Endpoint | Permission Required | Description |
|--------|----------|-------------------|-------------|
| POST | `/api/clients` | `client:create` | Create a new client |
| GET | `/api/clients` | `client:read` | Get all clients (with pagination) |
| GET | `/api/clients/:id` | `client:read` | Get single client |
| PUT | `/api/clients/:id` | `client:update` | Update client |
| DELETE | `/api/clients/:id` | `client:delete` | Delete client (soft delete) |
| PUT | `/api/clients/:id/restore` | `client:update` | Restore deleted client |
| PUT | `/api/clients/:id/archive` | `client:update` | Archive client |
| PUT | `/api/clients/:id/unarchive` | `client:update` | Unarchive client |

---

## 1. Create Client

### Endpoint
```
POST /api/clients
```

### Headers
```
Authorization: Bearer <your_token>
Content-Type: application/json
```

### Request Payload
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "9876543210",
  "alternatePhone": "9876543211",
  "streetAddress": "123 Main Street",
  "city": "Mumbai",
  "province": "Maharashtra",
  "postalCode": "400001",
  "country": "India",
  "dateOfBirth": "1990-01-15",
  "gender": "Male",
  "occupation": "Business Owner",
  "companyName": "ABC Corp",
  "aadharCardNumber": "123456789012",
  "panCardNumber": "ABCDE1234F",
  "assignedTo": "user_xxxxx",
  "notes": "Important client - handle with care"
}
```

### Required Fields
- `firstName` (string)
- `lastName` (string)
- `email` (string, valid email format)
- `phone` (string, 10 digits)
- `streetAddress` (string)
- `city` (string)
- `province` (string)
- `postalCode` (string)

### Optional Fields
- `alternatePhone` (string, 10 digits)
- `country` (string, defaults to "India")
- `dateOfBirth` (date)
- `gender` (enum: "Male", "Female", "Other", "Prefer not to say")
- `occupation` (string)
- `companyName` (string)
- `aadharCardNumber` (string, 12 digits)
- `panCardNumber` (string, format: ABCDE1234F)
- `assignedTo` (string, user ID - defaults to creator)
- `notes` (string, max 1000 characters)

### Success Response (201)
```json
{
  "success": true,
  "message": "Client created successfully",
  "data": {
    "_id": "client_abc123def456",
    "firstName": "John",
    "lastName": "Doe",
    "fullName": "John Doe",
    "email": "john.doe@example.com",
    "phone": "9876543210",
    "organization": "organization_xyz789",
    "assignedTo": "user_xxxxx",
    "status": "active",
    "createdBy": "user_xxxxx",
    "createdAt": "2026-01-14T12:00:00.000Z",
    "updatedAt": "2026-01-14T12:00:00.000Z"
  }
}
```

### Error Responses

#### Missing Required Fields (400)
```json
{
  "success": false,
  "error": "First name, last name, email, and phone are required"
}
```

#### Duplicate Email (400)
```json
{
  "success": false,
  "error": "A client with this email already exists in your organization"
}
```

---

## 2. Get All Clients

### Endpoint
```
GET /api/clients
```

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 10 | Items per page |
| `status` | string | - | Filter by status: `active`, `inactive`, `archived` |
| `assignedTo` | string | - | Filter by assigned user ID |
| `search` | string | - | Search in name, email, phone, company |
| `sortBy` | string | `createdAt` | Field to sort by |
| `sortOrder` | string | `desc` | Sort order: `asc` or `desc` |
| `includeDeleted` | boolean | `false` | Include soft-deleted clients |

### Example Request
```
GET /api/clients?page=1&limit=10&status=active&search=john&sortBy=firstName&sortOrder=asc
```

### Success Response (200)
```json
{
  "success": true,
  "count": 10,
  "total": 45,
  "page": 1,
  "pages": 5,
  "data": [
    {
      "_id": "client_abc123def456",
      "firstName": "John",
      "lastName": "Doe",
      "fullName": "John Doe",
      "email": "john.doe@example.com",
      "phone": "9876543210",
      "city": "Mumbai",
      "status": "active",
      "assignedTo": {
        "_id": "user_xxxxx",
        "firstName": "Admin",
        "lastName": "User",
        "email": "admin@example.com"
      },
      "createdBy": {
        "_id": "user_xxxxx",
        "firstName": "Admin",
        "lastName": "User"
      },
      "createdAt": "2026-01-14T12:00:00.000Z"
    }
  ]
}
```

---

## 3. Get Single Client

### Endpoint
```
GET /api/clients/:id
```

### URL Parameters
- `id` - Client ID

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "_id": "client_abc123def456",
    "firstName": "John",
    "lastName": "Doe",
    "fullName": "John Doe",
    "email": "john.doe@example.com",
    "phone": "9876543210",
    "alternatePhone": "9876543211",
    "streetAddress": "123 Main Street",
    "city": "Mumbai",
    "province": "Maharashtra",
    "postalCode": "400001",
    "country": "India",
    "dateOfBirth": "1990-01-15T00:00:00.000Z",
    "gender": "Male",
    "occupation": "Business Owner",
    "companyName": "ABC Corp",
    "aadharCardNumber": "123456789012",
    "panCardNumber": "ABCDE1234F",
    "organization": "organization_xyz789",
    "assignedTo": {
      "_id": "user_xxxxx",
      "firstName": "Admin",
      "lastName": "User",
      "email": "admin@example.com"
    },
    "status": "active",
    "notes": "Important client",
    "createdBy": {
      "_id": "user_xxxxx",
      "firstName": "Admin",
      "lastName": "User"
    },
    "updatedBy": null,
    "createdAt": "2026-01-14T12:00:00.000Z",
    "updatedAt": "2026-01-14T12:00:00.000Z"
  }
}
```

### Error Response (404)
```json
{
  "success": false,
  "error": "Client not found"
}
```

---

## 4. Update Client

### Endpoint
```
PUT /api/clients/:id
```

### Request Payload
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "email": "john.smith@example.com",
  "phone": "9876543210",
  "status": "active",
  "notes": "Updated notes"
}
```

**Note**: Only include fields you want to update. All fields are optional.

### Success Response (200)
```json
{
  "success": true,
  "message": "Client updated successfully",
  "data": {
    "_id": "client_abc123def456",
    "firstName": "John",
    "lastName": "Smith",
    "email": "john.smith@example.com",
    "updatedBy": "user_xxxxx",
    "updatedAt": "2026-01-14T13:00:00.000Z"
  }
}
```

---

## 5. Delete Client (Soft Delete)

### Endpoint
```
DELETE /api/clients/:id
```

### Success Response (200)
```json
{
  "success": true,
  "message": "Client deleted successfully"
}
```

**Note**: This is a soft delete. The client is marked as deleted but not removed from the database. Use `includeDeleted=true` in GET requests to see deleted clients.

---

## 6. Restore Deleted Client

### Endpoint
```
PUT /api/clients/:id/restore
```

### Success Response (200)
```json
{
  "success": true,
  "message": "Client restored successfully",
  "data": {
    "_id": "client_abc123def456",
    "deletedAt": null,
    "status": "active"
  }
}
```

---

## 7. Archive Client

### Endpoint
```
PUT /api/clients/:id/archive
```

### Success Response (200)
```json
{
  "success": true,
  "message": "Client archived successfully",
  "data": {
    "_id": "client_abc123def456",
    "status": "archived"
  }
}
```

---

## 8. Unarchive Client

### Endpoint
```
PUT /api/clients/:id/unarchive
```

### Success Response (200)
```json
{
  "success": true,
  "message": "Client unarchived successfully",
  "data": {
    "_id": "client_abc123def456",
    "status": "active"
  }
}
```

---

## Frontend Implementation Examples

### React/Next.js Example

#### Create Client
```javascript
const createClient = async (token, clientData) => {
  try {
    const response = await fetch('http://localhost:5004/api/clients', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(clientData)
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to create client');
    }
    
    return data;
  } catch (error) {
    console.error('Error creating client:', error);
    throw error;
  }
};

// Usage
const newClient = await createClient(token, {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '9876543210',
  streetAddress: '123 Main Street',
  city: 'Mumbai',
  province: 'Maharashtra',
  postalCode: '400001'
});
```

#### Get Clients with Pagination
```javascript
const getClients = async (token, filters = {}) => {
  const queryParams = new URLSearchParams({
    page: filters.page || 1,
    limit: filters.limit || 10,
    ...(filters.status && { status: filters.status }),
    ...(filters.search && { search: filters.search }),
    ...(filters.assignedTo && { assignedTo: filters.assignedTo }),
    sortBy: filters.sortBy || 'createdAt',
    sortOrder: filters.sortOrder || 'desc'
  });

  const response = await fetch(
    `http://localhost:5004/api/clients?${queryParams}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  const data = await response.json();
  return data;
};
```

#### Update Client
```javascript
const updateClient = async (token, clientId, updates) => {
  const response = await fetch(`http://localhost:5004/api/clients/${clientId}`, {
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

#### Delete Client
```javascript
const deleteClient = async (token, clientId) => {
  const response = await fetch(`http://localhost:5004/api/clients/${clientId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  return data;
};
```

---

## Permission Requirements

To use client endpoints, your role must have the following permissions on the `client` module:

- **Create**: `client:create` - Required for POST `/api/clients`
- **Read**: `client:read` - Required for GET `/api/clients` and GET `/api/clients/:id`
- **Update**: `client:update` - Required for PUT `/api/clients/:id` and archive/restore endpoints
- **Delete**: `client:delete` - Required for DELETE `/api/clients/:id`

### Example Role with Client Permissions
```json
{
  "name": "Client Manager",
  "priority": 2,
  "permissions": [
    {
      "module": "client",
      "actions": ["create", "read", "update", "delete"]
    }
  ]
}
```

---

## Important Notes

1. **Organization Scoping**: All clients are automatically scoped to your organization
2. **Email Uniqueness**: Email must be unique within your organization
3. **Soft Delete**: Deleted clients are not permanently removed, use restore endpoint to recover
4. **Status Values**: `active`, `inactive`, `archived`
5. **Assigned To**: Clients can be assigned to users (admins) in your organization
6. **Search**: Searches across firstName, lastName, email, phone, and companyName
7. **Pagination**: Default page size is 10, can be adjusted up to reasonable limits
