# RBAC Implementation Guide

## Overview

This document describes the complete Role-Based Access Control (RBAC) system implementation with hierarchical role priority.

## Architecture

### System Components

1. **Models**
   - `Role` - Stores role definitions with priority and permissions
   - `User` - References Role model (replaces string-based role)
   - `Organization` - Contains SUPER_ADMIN reference

2. **Middleware**
   - `protect` - JWT authentication
   - `loadUserRole` - Loads user's role with permissions
   - `canManageRole` - Validates role hierarchy for role management
   - `checkPermission` - Validates module + action permissions
   - `isSuperAdmin` - Checks for SUPER_ADMIN access
   - `sameOrganization` - Ensures organization scoping

3. **Controllers**
   - `roleController` - CRUD operations for roles
   - `exampleProtectedController` - Example protected routes

4. **Utilities**
   - `roleUtils` - Priority suggestion and validation helpers

## Database Schemas

### Role Schema

```javascript
{
  name: String (required),
  description: String,
  organization: ObjectId (required, ref: 'Organization'),
  priority: Number (required, min: 1, unique per organization),
  permissions: [{
    module: String (enum: ['employee', 'client', 'cases']),
    actions: [String] (enum: ['create', 'read', 'update', 'delete'])
  }],
  isSystemRole: Boolean (default: false),
  createdBy: ObjectId (ref: 'User'),
  createdAt: Date,
  updatedAt: Date
}
```

**Key Constraints:**
- Priority is unique per organization (compound index)
- Priority is immutable after creation
- Priority 1 is reserved for SUPER_ADMIN

### User Schema Updates

```javascript
{
  // ... existing fields ...
  role: ObjectId (ref: 'Role'), // NEW: References Role model
  legacyRole: String (deprecated, for backward compatibility)
}
```

### Organization Schema Updates

```javascript
{
  // ... existing fields ...
  superAdmin: ObjectId (ref: 'User', unique, sparse)
}
```

## Role Priority System

### Priority Rules

1. **Priority 1** = SUPER_ADMIN (highest authority)
2. **Higher number** = Lower authority
3. **Priority is unique** per organization
4. **Priority is immutable** after role creation

### Hierarchy Example

```
Priority 1: SUPER_ADMIN (can manage all roles)
Priority 2: Admin (can manage roles 3+)
Priority 3: Manager (can manage roles 4+)
Priority 4: Employee (cannot manage any roles)
```

## API Endpoints

### Role Management

#### 1. Get Suggested Priority
```
GET /api/roles/suggest-priority
Headers: Authorization: Bearer <token>
Response: { suggestedPriority: 2 }
```

#### 2. Create Role
```
POST /api/roles
Headers: Authorization: Bearer <token>
Body: {
  name: "Manager",
  description: "Manages team",
  priority: 3, // Can accept suggested or override
  permissions: [
    {
      module: "employee",
      actions: ["create", "read", "update"]
    },
    {
      module: "client",
      actions: ["read"]
    }
  ]
}
```

**Validation:**
- Creator's role priority < new role priority
- Priority must be unique in organization
- Priority cannot be 1 (unless creator is SUPER_ADMIN)
- Permissions must be valid module + actions

#### 3. Get All Roles
```
GET /api/roles
Headers: Authorization: Bearer <token>
Response: { roles: [...] }
```

#### 4. Get Single Role
```
GET /api/roles/:roleId
Headers: Authorization: Bearer <token>
```

#### 5. Update Role
```
PUT /api/roles/:roleId
Headers: Authorization: Bearer <token>
Body: {
  name: "Updated Name",
  description: "Updated description",
  permissions: [...]
}
```

**Note:** Priority cannot be updated (immutable)

#### 6. Delete Role
```
DELETE /api/roles/:roleId
Headers: Authorization: Bearer <token>
```

**Validation:**
- Cannot delete SUPER_ADMIN role
- Cannot delete if users are assigned
- Creator must be able to manage target role

#### 7. Assign Role to User
```
POST /api/roles/:roleId/assign/:userId
Headers: Authorization: Bearer <token>
```

### Example Protected Routes

#### Employee Module
```
POST /api/example/employees (requires: employee.create)
GET /api/example/employees (requires: employee.read)
PUT /api/example/employees/:id (requires: employee.update)
DELETE /api/example/employees/:id (requires: employee.delete)
```

#### Client Module
```
POST /api/example/clients (requires: client.create)
GET /api/example/clients (requires: client.read)
```

#### Cases Module
```
POST /api/example/cases (requires: cases.create)
GET /api/example/cases (requires: cases.read)
```

## Middleware Usage

### Basic Authentication
```javascript
const { protect } = require('../middleware/auth');
router.get('/route', protect, controller);
```

### Load User Role
```javascript
const { loadUserRole } = require('../middleware/rbac');
router.use(protect);
router.use(loadUserRole);
```

### Check Permission
```javascript
const { checkPermission } = require('../middleware/rbac');
router.post('/employees', 
  protect, 
  loadUserRole, 
  checkPermission('employee', 'create'),
  controller
);
```

### Role Management
```javascript
const { canManageRole } = require('../middleware/rbac');
router.put('/roles/:roleId',
  protect,
  loadUserRole,
  canManageRole,
  controller
);
```

## Setup Process

### 1. Organization Initialization

When an organization is created via `/api/setup/initialize`:

1. Organization is created
2. SUPER_ADMIN user is created
3. SUPER_ADMIN role (priority 1) is created with full permissions
4. Role is assigned to SUPER_ADMIN user
5. Organization.superAdmin is set

### 2. Creating Additional Roles

1. SUPER_ADMIN calls `GET /api/roles/suggest-priority`
2. System suggests priority = (highest existing priority) + 1
3. SUPER_ADMIN creates role with suggested or custom priority
4. Role is validated against hierarchy rules
5. Role is created and can be assigned to users

## Permission Structure

### Modules
- `employee` - Employee management
- `client` - Client management  
- `cases` - Case management

### Actions
- `create` - Create new resources
- `read` - View resources
- `update` - Modify resources
- `delete` - Remove resources

### Example Permission Set

```javascript
permissions: [
  {
    module: "employee",
    actions: ["create", "read", "update", "delete"]
  },
  {
    module: "client",
    actions: ["read", "update"]
  },
  {
    module: "cases",
    actions: ["read"]
  }
]
```

## Security Rules

### Role Creation Rules
1. ✅ Can create roles with priority > creator's priority
2. ❌ Cannot create roles with priority <= creator's priority
3. ❌ Cannot create priority 1 (unless SUPER_ADMIN)
4. ❌ Priority must be unique per organization

### Role Management Rules
1. ✅ Can edit/delete roles with priority > creator's priority
2. ❌ Cannot edit/delete roles with priority <= creator's priority
3. ❌ Cannot delete SUPER_ADMIN role
4. ❌ Cannot delete role if users are assigned

### Permission Rules
1. ✅ User must have role assigned
2. ✅ Role must have permission for module + action
3. ✅ User must belong to same organization as resource

## Migration Guide

### For Existing Users

Existing users have `legacyRole` field. To migrate:

1. Create appropriate roles for your organization
2. Assign roles to users via `/api/roles/:roleId/assign/:userId`
3. Update frontend to use new role system

### Backward Compatibility

- `legacyRole` field maintained for existing users
- Old `role` enum still works but is deprecated
- New system uses `role` ObjectId reference

## Testing

### Test Role Creation

```bash
# 1. Login as SUPER_ADMIN
POST /api/auth/login
Body: { email: "superadmin@example.com", password: "..." }

# 2. Get suggested priority
GET /api/roles/suggest-priority
Headers: Authorization: Bearer <token>

# 3. Create role
POST /api/roles
Headers: Authorization: Bearer <token>
Body: {
  name: "Manager",
  priority: 2,
  permissions: [
    { module: "employee", actions: ["read", "update"] }
  ]
}
```

### Test Permission Checking

```bash
# Login as user with Manager role
POST /api/auth/login

# Try to create employee (should fail if no create permission)
POST /api/example/employees
Headers: Authorization: Bearer <token>
# Response: 403 - You do not have permission to create employee

# Try to read employees (should succeed if has read permission)
GET /api/example/employees
Headers: Authorization: Bearer <token>
# Response: 200 - Success
```

## Best Practices

1. **Always use middleware** - Never check permissions in controllers
2. **Organization scoping** - Always validate organization access
3. **Priority planning** - Plan your role hierarchy before creating roles
4. **Permission granularity** - Grant minimum required permissions
5. **Role naming** - Use descriptive role names
6. **Documentation** - Document custom roles and their purposes

## Troubleshooting

### "User does not have a role assigned"
- Assign a role via `/api/roles/:roleId/assign/:userId`

### "Priority already exists"
- Choose a different priority or check existing roles

### "Cannot manage roles with priority X or lower"
- Your role priority is too high. Only roles with lower priority can be managed.

### "You do not have permission to [action] [module]"
- User's role doesn't have the required permission
- Check role permissions and update if needed

## Files Created

- `src/models/Role.js` - Role model
- `src/middleware/rbac.js` - RBAC middleware
- `src/controllers/roleController.js` - Role management
- `src/routes/roleRoutes.js` - Role routes
- `src/utils/roleUtils.js` - Role utilities
- `src/controllers/exampleProtectedController.js` - Example controllers
- `src/routes/exampleRoutes.js` - Example routes

## Next Steps

1. ✅ Test role creation and assignment
2. ✅ Update existing controllers to use permission middleware
3. ✅ Create roles for your organization
4. ✅ Assign roles to users
5. ✅ Test permission-based access control
