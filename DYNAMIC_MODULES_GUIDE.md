# Dynamic Modules System Guide

## Overview
The module system has been updated to be **dynamic** - modules are now stored in the database and can be added/removed without code changes. The `employee` module has been removed from the modules list (since employee is a role, not a module for permissions).

## Changes Made

### 1. New Module Model
- Created `src/models/Module.js` to store modules dynamically
- Modules have: `name`, `displayName`, `description`, `isActive`

### 2. Default Modules
- **client** - Client management module
- **cases** - Case management module
- **employee** - Removed (employee is a role, not a module)

### 3. Updated Role Model
- Removed static enum from `module` field
- Module validation now checks against database

### 4. New API Endpoints

#### Get Available Modules
```
GET /api/modules
```
**Access**: Public (no authentication required)

**Response**:
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "module_xxxxx",
      "name": "client",
      "displayName": "Client",
      "description": "Client management module"
    },
    {
      "_id": "module_xxxxx",
      "name": "cases",
      "displayName": "Cases",
      "description": "Case management module"
    }
  ]
}
```

#### Create New Module (Admin Only)
```
POST /api/modules
```
**Headers**: `Authorization: Bearer <token>`

**Payload**:
```json
{
  "name": "documents",
  "displayName": "Documents",
  "description": "Document management module"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Module created successfully",
  "data": {
    "id": "module_xxxxx",
    "name": "documents",
    "displayName": "Documents",
    "description": "Document management module",
    "isActive": true,
    "createdAt": "2026-01-14T12:00:00.000Z"
  }
}
```

### 5. Updated Role Endpoints

#### Get All Roles (Now includes modules)
```
GET /api/roles
```
**Response**:
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "role_xxxxx",
      "name": "SUPER_ADMIN",
      "priority": 1,
      "permissions": [
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
  ],
  "modules": [
    {
      "name": "client",
      "displayName": "Client",
      "description": "Client management module"
    },
    {
      "name": "cases",
      "displayName": "Cases",
      "description": "Case management module"
    }
  ]
}
```

#### Create Role (Now includes modules in response)
```
POST /api/roles
```
**Response** includes `modules` array with available modules.

## How to Add a New Module

### Step 1: Create Module via API
```javascript
const response = await fetch('http://localhost:5004/api/modules', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'documents',
    displayName: 'Documents',
    description: 'Document management module'
  })
});
```

### Step 2: Module Automatically Available
- The new module will immediately appear in:
  - `GET /api/modules` response
  - `GET /api/roles` response (modules array)
  - Role creation forms (frontend can fetch modules)

### Step 3: Use in Role Permissions
```json
{
  "name": "Document Manager",
  "priority": 3,
  "permissions": [
    {
      "module": "documents",
      "actions": ["create", "read", "update", "delete"]
    }
  ]
}
```

## Frontend Implementation

### Fetch Available Modules
```javascript
// Get modules for role creation form
const getModules = async () => {
  const response = await fetch('http://localhost:5004/api/modules');
  const data = await response.json();
  return data.data; // Array of modules
};

// Usage in form
const modules = await getModules();
modules.forEach(module => {
  // Render module checkbox/select
  console.log(module.name, module.displayName);
});
```

### Dynamic Role Creation Form
```jsx
const [modules, setModules] = useState([]);
const [selectedModules, setSelectedModules] = useState({});

useEffect(() => {
  fetch('http://localhost:5004/api/modules')
    .then(res => res.json())
    .then(data => {
      setModules(data.data);
      // Initialize selectedModules
      const initial = {};
      data.data.forEach(m => {
        initial[m.name] = { selected: false, actions: [] };
      });
      setSelectedModules(initial);
    });
}, []);

// Render modules dynamically
{modules.map(module => (
  <div key={module.name}>
    <label>
      <input
        type="checkbox"
        checked={selectedModules[module.name]?.selected}
        onChange={(e) => handleModuleToggle(module.name, e.target.checked)}
      />
      {module.displayName}
    </label>
    {selectedModules[module.name]?.selected && (
      <div>
        {['create', 'read', 'update', 'delete'].map(action => (
          <label key={action}>
            <input
              type="checkbox"
              checked={selectedModules[module.name]?.actions.includes(action)}
              onChange={(e) => handleActionToggle(module.name, action)}
            />
            {action}
          </label>
        ))}
      </div>
    )}
  </div>
))}
```

## Important Notes

1. **Employee Module Removed**: 
   - `employee` is no longer a module
   - Employee management routes still work but use different permission checks
   - SUPER_ADMIN no longer has `employee` module permissions

2. **Module Names**:
   - Must be lowercase
   - Must be unique
   - Automatically normalized to lowercase

3. **Default Modules**:
   - `client` and `cases` are initialized automatically on server start
   - If modules don't exist, they're created automatically

4. **Validation**:
   - Role permissions are validated against active modules in database
   - Invalid modules will be rejected with clear error messages

5. **Adding New Collections**:
   - When you add a new collection/model (e.g., `documents`, `invoices`), create a module for it
   - The module will immediately be available for role permissions
   - No code changes needed for role system

## Migration Notes

- Existing roles with `employee` module permissions will still work
- New roles cannot be created with `employee` module
- To migrate existing roles, update them to remove `employee` module permissions
- Employee management functionality remains unchanged
