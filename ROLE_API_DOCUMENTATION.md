# Role Management API Documentation

## Base URL
All role endpoints are prefixed with: `/api/roles`

## Authentication
All endpoints require:
- **Bearer Token** in Authorization header: `Authorization: Bearer <token>`
- User must be authenticated (admin user, not employee)
- User must have a role assigned

---

## 1. Get Suggested Priority

Get the suggested priority for creating a new role.

### Endpoint
```
GET /api/roles/suggest-priority
```

### Headers
```
Authorization: Bearer <your_token>
Content-Type: application/json
```

### Response
```json
{
  "success": true,
  "data": {
    "suggestedPriority": 3
  }
}
```

### Description
- Returns the next available priority number (highest existing priority + 1)
- Priority 1 is reserved for SUPER_ADMIN
- If no roles exist, suggests priority 2

---

## 2. Create a New Role

Create a new role in your organization.

### Endpoint
```
POST /api/roles
```

### Headers
```
Authorization: Bearer <your_token>
Content-Type: application/json
```

### Request Payload
```json
{
  "name": "Manager",
  "description": "Manager role with employee and client management",
  "priority": 2,
  "permissions": [
    {
      "module": "employee",
      "actions": ["create", "read", "update"]
    },
    {
      "module": "client",
      "actions": ["create", "read", "update", "delete"]
    },
    {
      "module": "cases",
      "actions": ["read", "update"]
    }
  ]
}
```

### Payload Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | String | ✅ Yes | Role name (max 100 characters) |
| `description` | String | ❌ No | Role description (max 500 characters) |
| `priority` | Number | ✅ Yes | Priority number (must be > creator's priority) |
| `permissions` | Array | ❌ No | Array of permission objects (defaults to empty array) |

### Permissions Structure

Each permission object must have:
- `module`: One of `"employee"`, `"client"`, or `"cases"`
- `actions`: Array of actions. Valid actions: `"create"`, `"read"`, `"update"`, `"delete"`

**Important Rules:**
- Each module can only appear once in the permissions array
- At least one action must be specified for each module
- All actions must be valid enum values

### Example Payloads

#### Minimal Role (No Permissions)
```json
{
  "name": "Viewer",
  "priority": 3
}
```

#### Full Permissions Role
```json
{
  "name": "Administrator",
  "description": "Full access to all modules",
  "priority": 2,
  "permissions": [
    {
      "module": "employee",
      "actions": ["create", "read", "update", "delete"]
    },
    {
      "module": "client",
      "actions": ["create", "read", "update", "delete"]
    },
    {
      "module": "cases",
      "actions": ["create", "read", "update", "delete"]
    }
  ]
}
```

#### Partial Permissions Role
```json
{
  "name": "HR Manager",
  "description": "Manages employees only",
  "priority": 4,
  "permissions": [
    {
      "module": "employee",
      "actions": ["create", "read", "update", "delete"]
    }
  ]
}
```

### Success Response (201)
```json
{
  "success": true,
  "message": "Role created successfully",
  "data": {
    "role": {
      "id": "role_abc123def456",
      "name": "Manager",
      "description": "Manager role with employee and client management",
      "priority": 2,
      "permissions": [
        {
          "module": "employee",
          "actions": ["create", "read", "update"]
        },
        {
          "module": "client",
          "actions": ["create", "read", "update", "delete"]
        },
        {
          "module": "cases",
          "actions": ["read", "update"]
        }
      ],
      "organization": "organization_xyz789",
      "createdAt": "2026-01-14T10:30:00.000Z"
    },
    "suggestedPriority": 3
  }
}
```

### Error Responses

#### Missing Required Fields (400)
```json
{
  "success": false,
  "error": "Role name is required"
}
```

#### Invalid Priority (400)
```json
{
  "success": false,
  "error": "Priority must be a positive number"
}
```

#### Priority Already Exists (400)
```json
{
  "success": false,
  "error": "Priority 2 already exists in this organization"
}
```

#### Insufficient Permissions (403)
```json
{
  "success": false,
  "error": "You can only create roles with priority higher than 1. Requested priority: 1"
}
```

#### Invalid Permissions Structure (400)
```json
{
  "success": false,
  "error": "Invalid module: invalid_module. Must be one of: employee, client, cases"
}
```

---

## 3. Get All Roles (Role Listing)

Get all roles in your organization.

### Endpoint
```
GET /api/roles
```

### Headers
```
Authorization: Bearer <your_token>
Content-Type: application/json
```

### Query Parameters
None required. Roles are automatically filtered by your organization.

### Success Response (200)
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "_id": "role_abc123def456",
      "name": "SUPER_ADMIN",
      "description": "Super Administrator with full system access",
      "priority": 1,
      "permissions": [
        {
          "module": "employee",
          "actions": ["create", "read", "update", "delete"]
        },
        {
          "module": "client",
          "actions": ["create", "read", "update", "delete"]
        },
        {
          "module": "cases",
          "actions": ["create", "read", "update", "delete"]
        }
      ],
      "isSystemRole": true,
      "organization": "organization_xyz789",
      "createdBy": {
        "_id": "user_123",
        "firstName": "Pooja",
        "lastName": "Bane",
        "email": "pooja@example.com"
      },
      "createdAt": "2026-01-14T08:00:00.000Z",
      "updatedAt": "2026-01-14T08:00:00.000Z"
    },
    {
      "_id": "role_def456ghi789",
      "name": "Manager",
      "description": "Manager role with employee and client management",
      "priority": 2,
      "permissions": [
        {
          "module": "employee",
          "actions": ["create", "read", "update"]
        },
        {
          "module": "client",
          "actions": ["create", "read", "update", "delete"]
        }
      ],
      "isSystemRole": false,
      "organization": "organization_xyz789",
      "createdBy": {
        "_id": "user_123",
        "firstName": "Pooja",
        "lastName": "Bane",
        "email": "pooja@example.com"
      },
      "createdAt": "2026-01-14T10:30:00.000Z",
      "updatedAt": "2026-01-14T10:30:00.000Z"
    },
    {
      "_id": "role_ghi789jkl012",
      "name": "Viewer",
      "description": null,
      "priority": 3,
      "permissions": [],
      "isSystemRole": false,
      "organization": "organization_xyz789",
      "createdBy": {
        "_id": "user_123",
        "firstName": "Pooja",
        "lastName": "Bane",
        "email": "pooja@example.com"
      },
      "createdAt": "2026-01-14T11:00:00.000Z",
      "updatedAt": "2026-01-14T11:00:00.000Z"
    }
  ]
}
```

### Description
- Returns all roles for your organization
- Sorted by priority (ascending: 1 = highest authority)
- Includes creator information (populated)
- Empty array if no roles exist

---

## 4. Get Single Role

Get details of a specific role.

### Endpoint
```
GET /api/roles/:roleId
```

### Headers
```
Authorization: Bearer <your_token>
Content-Type: application/json
```

### URL Parameters
- `roleId`: The ID of the role to retrieve

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "_id": "role_abc123def456",
    "name": "Manager",
    "description": "Manager role with employee and client management",
    "priority": 2,
    "permissions": [
      {
        "module": "employee",
        "actions": ["create", "read", "update"]
      },
      {
        "module": "client",
        "actions": ["create", "read", "update", "delete"]
      }
    ],
    "isSystemRole": false,
    "organization": "organization_xyz789",
    "createdBy": {
      "_id": "user_123",
      "firstName": "Pooja",
      "lastName": "Bane",
      "email": "pooja@example.com"
    },
    "createdAt": "2026-01-14T10:30:00.000Z",
    "updatedAt": "2026-01-14T10:30:00.000Z"
  }
}
```

### Error Response (404)
```json
{
  "success": false,
  "error": "Role not found"
}
```

---

## Frontend Implementation Examples

### React/Next.js Example

#### 1. Get Suggested Priority
```javascript
const getSuggestedPriority = async (token) => {
  try {
    const response = await fetch('http://localhost:5004/api/roles/suggest-priority', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    return data.data.suggestedPriority;
  } catch (error) {
    console.error('Error getting suggested priority:', error);
  }
};
```

#### 2. Create Role
```javascript
const createRole = async (token, roleData) => {
  try {
    const response = await fetch('http://localhost:5004/api/roles', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: roleData.name,
        description: roleData.description || '',
        priority: roleData.priority,
        permissions: roleData.permissions || []
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to create role');
    }
    
    return data;
  } catch (error) {
    console.error('Error creating role:', error);
    throw error;
  }
};

// Usage
const newRole = await createRole(token, {
  name: 'Manager',
  description: 'Manager role',
  priority: 2,
  permissions: [
    {
      module: 'employee',
      actions: ['create', 'read', 'update']
    },
    {
      module: 'client',
      actions: ['create', 'read', 'update', 'delete']
    }
  ]
});
```

#### 3. Get All Roles
```javascript
const getRoles = async (token) => {
  try {
    const response = await fetch('http://localhost:5004/api/roles', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    return data.data; // Array of roles
  } catch (error) {
    console.error('Error fetching roles:', error);
    return [];
  }
};
```

#### 4. Form Component Example
```jsx
import { useState, useEffect } from 'react';

const CreateRoleForm = ({ token }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priority: 2,
    permissions: []
  });
  const [suggestedPriority, setSuggestedPriority] = useState(2);
  const [modules, setModules] = useState([
    { name: 'employee', selected: false, actions: [] },
    { name: 'client', selected: false, actions: [] },
    { name: 'cases', selected: false, actions: [] }
  ]);

  useEffect(() => {
    // Get suggested priority on mount
    fetch('http://localhost:5004/api/roles/suggest-priority', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        setSuggestedPriority(data.data.suggestedPriority);
        setFormData(prev => ({ ...prev, priority: data.data.suggestedPriority }));
      });
  }, [token]);

  const handleModuleToggle = (moduleName) => {
    setModules(prev => prev.map(m => 
      m.name === moduleName 
        ? { ...m, selected: !m.selected, actions: !m.selected ? ['read'] : [] }
        : m
    ));
  };

  const handleActionToggle = (moduleName, action) => {
    setModules(prev => prev.map(m => {
      if (m.name === moduleName) {
        const hasAction = m.actions.includes(action);
        return {
          ...m,
          actions: hasAction
            ? m.actions.filter(a => a !== action)
            : [...m.actions, action]
        };
      }
      return m;
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Build permissions array
    const permissions = modules
      .filter(m => m.selected && m.actions.length > 0)
      .map(m => ({
        module: m.name,
        actions: m.actions
      }));

    const roleData = {
      name: formData.name,
      description: formData.description,
      priority: formData.priority,
      permissions
    };

    try {
      const response = await fetch('http://localhost:5004/api/roles', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(roleData)
      });

      const data = await response.json();
      
      if (response.ok) {
        alert('Role created successfully!');
        // Reset form or redirect
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to create role');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Role Name:</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          required
        />
      </div>

      <div>
        <label>Description:</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
        />
      </div>

      <div>
        <label>Priority:</label>
        <input
          type="number"
          value={formData.priority}
          onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value)})}
          min={suggestedPriority}
          required
        />
        <small>Suggested: {suggestedPriority}</small>
      </div>

      <div>
        <label>Permissions:</label>
        {modules.map(module => (
          <div key={module.name}>
            <label>
              <input
                type="checkbox"
                checked={module.selected}
                onChange={() => handleModuleToggle(module.name)}
              />
              {module.name.charAt(0).toUpperCase() + module.name.slice(1)}
            </label>
            {module.selected && (
              <div style={{ marginLeft: '20px' }}>
                {['create', 'read', 'update', 'delete'].map(action => (
                  <label key={action}>
                    <input
                      type="checkbox"
                      checked={module.actions.includes(action)}
                      onChange={() => handleActionToggle(module.name, action)}
                    />
                    {action}
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <button type="submit">Create Role</button>
    </form>
  );
};
```

---

## Important Notes

1. **Priority Rules:**
   - Lower number = Higher authority
   - Priority 1 is reserved for SUPER_ADMIN
   - You can only create roles with priority higher than your own
   - Priority must be unique per organization

2. **Permissions:**
   - Modules: `employee`, `client`, `cases`
   - Actions: `create`, `read`, `update`, `delete`
   - Each module can only appear once
   - At least one action required per module

3. **Authorization:**
   - All endpoints require authentication
   - User must belong to the organization
   - User must have a role assigned
   - Role management follows priority hierarchy

4. **Error Handling:**
   - Always check `response.ok` or `data.success`
   - Error messages are in `data.error`
   - 400 = Bad Request (validation errors)
   - 403 = Forbidden (insufficient permissions)
   - 404 = Not Found (role doesn't exist)
