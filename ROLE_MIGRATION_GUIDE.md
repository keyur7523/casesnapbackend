# Role Migration Guide: From "admin" to SUPER_ADMIN

## Overview

The system has transitioned from a simple string-based role system (`'admin'`, `'user'`) to a comprehensive RBAC system with hierarchical priorities.

## Key Changes

### Old System (Before RBAC)
```javascript
User {
  role: 'admin'  // String enum: 'admin' or 'user'
}
```

### New System (With RBAC)
```javascript
User {
  role: ObjectId,        // References Role model
  legacyRole: 'admin'     // Kept for backward compatibility
}

Role {
  name: 'SUPER_ADMIN',
  priority: 1,           // Highest authority
  permissions: [...],     // Module-based permissions
  isSystemRole: true
}
```

## Role Mapping

| Old Role | New Role | Priority | Notes |
|----------|----------|----------|-------|
| `'admin'` | `SUPER_ADMIN` | 1 | Highest authority, full permissions |
| `'user'` | Custom roles | 2+ | Can create custom roles with priority 2+ |

## What Happens During Setup

When you initialize an organization via `/api/setup/initialize`:

1. **Organization Created**
2. **Super Admin User Created**
   - `legacyRole: 'admin'` (for backward compatibility)
   - `role: null` (will be assigned after role creation)
3. **SUPER_ADMIN Role Created**
   - `name: 'SUPER_ADMIN'`
   - `priority: 1` (highest authority)
   - `isSystemRole: true`
   - Full permissions on all modules (employee, client, cases)
4. **Role Assigned to User**
   - `user.role = superAdminRole._id`
5. **Organization Updated**
   - `organization.superAdmin = superAdminUser._id`

## SUPER_ADMIN Role Details

### Priority: 1
- Highest authority in the system
- Can create and manage ALL other roles
- Cannot be deleted
- Only one SUPER_ADMIN per organization

### Permissions
```javascript
{
  module: 'employee',
  actions: ['create', 'read', 'update', 'delete']
},
{
  module: 'client',
  actions: ['create', 'read', 'update', 'delete']
},
{
  module: 'cases',
  actions: ['create', 'read', 'update', 'delete']
}
```

## For Existing Organizations

If you have existing organizations with users that have `role: 'admin'`:

### Option 1: Automatic Migration (Recommended)
Create a migration script to:
1. Find all users with `legacyRole: 'admin'` or old `role: 'admin'`
2. Find or create SUPER_ADMIN role for their organization
3. Assign SUPER_ADMIN role to those users

### Option 2: Manual Migration
1. Login as existing admin user
2. Create SUPER_ADMIN role via API (if not exists)
3. Assign role to yourself via `/api/roles/:roleId/assign/:userId`

## Checking User's Role

### Old Way (Deprecated)
```javascript
if (user.role === 'admin') {
  // Admin access
}
```

### New Way (RBAC)
```javascript
// Load user with role populated
const user = await User.findById(userId).populate('role');

// Check if SUPER_ADMIN
if (user.role && user.role.priority === 1) {
  // SUPER_ADMIN access
}

// Or use middleware
const { isSuperAdmin } = require('../middleware/rbac');
router.get('/admin-only', protect, loadUserRole, isSuperAdmin, controller);
```

## JWT Token Changes

### Old Token
```javascript
{
  id: user._id,
  role: 'admin',        // String
  organization: orgId
}
```

### New Token (Should Include Role Info)
You may want to update JWT to include role priority:
```javascript
{
  id: user._id,
  roleId: role._id,     // Role ObjectId
  rolePriority: 1,      // For quick checks
  organization: orgId
}
```

## Summary

✅ **Old "admin" role** → **SUPER_ADMIN role (priority 1)**
✅ **Automatically created** during organization setup
✅ **Automatically assigned** to super admin user
✅ **Full permissions** on all modules
✅ **Highest authority** - can manage all other roles

The transition is seamless - when you initialize a new organization, the SUPER_ADMIN role is automatically created and assigned!
