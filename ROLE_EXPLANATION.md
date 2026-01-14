# Understanding User Roles: legacyRole vs role

## The Confusion

You're seeing two role-related fields in the User document:
- `legacyRole: "admin"` ← Old system (backward compatibility)
- `role: 69674e5ab5d1ef31653d9840` ← New RBAC system (ObjectId reference)

## How It Works

### User Document (What you see)
```javascript
{
  _id: "69674e5ab5d1ef31653d983e",
  firstName: "pooja",
  lastName: "bane",
  email: "hohag62766@gopicta.com",
  legacyRole: "admin",           // ← OLD: Just for backward compatibility
  role: "69674e5ab5d1ef31653d9840" // ← NEW: Reference to Role document
}
```

### Role Document (Separate Collection)
```javascript
{
  _id: "69674e5ab5d1ef31653d9840",  // ← This matches user.role
  name: "SUPER_ADMIN",              // ← Actual role name
  priority: 1,                       // ← Highest authority
  permissions: [
    {
      module: "employee",
      actions: ["create", "read", "update", "delete"]
    },
    {
      module: "client",
      actions: ["create", "read", "update", "delete"]
    },
    {
      module: "cases",
      actions: ["create", "read", "update", "delete"]
    }
  ],
  isSystemRole: true,
  organization: "69674e59b5d1ef31653d983c"
}
```

## Why Two Fields?

### `legacyRole: "admin"`
- **Purpose**: Backward compatibility with old code
- **Type**: String (`"admin"` or `"user"`)
- **Status**: Deprecated, not used by RBAC system
- **Why kept**: So old code doesn't break

### `role: ObjectId`
- **Purpose**: References the actual Role document
- **Type**: ObjectId (MongoDB reference)
- **Status**: Active - this is what RBAC uses
- **Contains**: Full role details (name, priority, permissions)

## How to See the Actual Role

### Option 1: Query Role Collection Directly
```javascript
// In MongoDB Compass or shell
db.roles.findOne({ _id: ObjectId("69674e5ab5d1ef31653d9840") })
```

### Option 2: Populate Role When Querying User
```javascript
// In your code
const user = await User.findById(userId).populate('role');
console.log(user.role.name);        // "SUPER_ADMIN"
console.log(user.role.priority);    // 1
console.log(user.role.permissions); // [...]
```

### Option 3: Use API Response
The `/api/setup/initialize` response now includes the full role object:
```json
{
  "user": {
    "role": {
      "id": "69674e5ab5d1ef31653d9840",
      "name": "SUPER_ADMIN",
      "priority": 1,
      "permissions": [...]
    }
  }
}
```

## Summary

✅ **User is SUPER_ADMIN** - The `role` field points to the SUPER_ADMIN role document
✅ **legacyRole is just legacy** - It's "admin" but doesn't affect RBAC
✅ **Actual role details** are in the Role collection, not User collection

## To Verify

Run this query in MongoDB to see the actual role:
```javascript
db.roles.findOne({ _id: ObjectId("69674e5ab5d1ef31653d9840") })
```

You should see:
- `name: "SUPER_ADMIN"`
- `priority: 1`
- `isSystemRole: true`
- Full permissions array
