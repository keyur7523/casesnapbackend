# Custom ID Implementation Guide

## Overview

The system now uses custom string-based IDs with prefixes instead of MongoDB ObjectIds.

## ID Format

All IDs follow the pattern: `{prefix}_{random_string}`

### ID Prefixes

- **Organization**: `organization_xxxxx`
- **User**: `user_xxxxx`
- **Role**: `role_xxxxx`
- **Employee**: `employee_xxxxx`

### Example IDs

```
organization_a1b2c3d4e5f6
user_f6e5d4c3b2a1
role_123456789abc
employee_abcdef123456
```

## Implementation Details

### ID Generator Utility

Located in `src/utils/idGenerator.js`:

```javascript
generateOrganizationId() // Returns: "organization_xxxxx"
generateUserId()          // Returns: "user_xxxxx"
generateRoleId()          // Returns: "role_xxxxx"
generateEmployeeId()      // Returns: "employee_xxxxx"
```

### Model Changes

All models now use custom `_id`:

```javascript
_id: {
    type: String,
    default: generateXxxId  // Auto-generated on creation
}
```

### Reference Fields Updated

All reference fields changed from `ObjectId` to `String`:

**Before:**
```javascript
organization: {
    type: mongoose.Schema.ObjectId,
    ref: 'Organization'
}
```

**After:**
```javascript
organization: {
    type: String,
    ref: 'Organization'
}
```

## Models Updated

### ✅ Organization Model
- `_id`: Custom ID (`organization_xxxxx`)
- `superAdmin`: String reference to User

### ✅ User Model
- `_id`: Custom ID (`user_xxxxx`)
- `role`: String reference to Role
- `organization`: String reference to Organization

### ✅ Role Model
- `_id`: Custom ID (`role_xxxxx`)
- `organization`: String reference to Organization
- `createdBy`: String reference to User

### ✅ Employee Model
- `_id`: Custom ID (`employee_xxxxx`)
- `adminId`: String reference to User
- `organization`: String reference to Organization
- `archivedBy`: String reference to User
- `statusHistory[].changedBy`: String reference to User

## Benefits

1. **Human-readable IDs** - Easy to identify entity type
2. **No ObjectId confusion** - Clear string format
3. **Better debugging** - Can see entity type from ID
4. **Consistent format** - All IDs follow same pattern

## Important Notes

### Mongoose Compatibility

- Mongoose supports string `_id` natively
- `findById()` works with string IDs
- `populate()` works with string references
- All queries work the same way

### Migration

**For existing data:**
- Old records will have ObjectId `_id`
- New records will have custom string `_id`
- You may need a migration script to convert existing IDs

### Querying

Queries work exactly the same:

```javascript
// Find by ID
const org = await Organization.findById('organization_abc123');

// Find with reference
const user = await User.findOne({ organization: 'organization_abc123' });

// Populate still works
const user = await User.findById('user_xyz').populate('role');
```

## Example Usage

### Creating Records

```javascript
// Organization - ID auto-generated
const org = await Organization.create({
    companyName: "Test Corp",
    // _id will be auto-generated as "organization_xxxxx"
});

// User - ID auto-generated
const user = await User.create({
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    organization: org._id, // "organization_xxxxx"
    // _id will be auto-generated as "user_xxxxx"
});

// Role - ID auto-generated
const role = await Role.create({
    name: "Manager",
    organization: org._id, // "organization_xxxxx"
    createdBy: user._id,   // "user_xxxxx"
    // _id will be auto-generated as "role_xxxxx"
});
```

### Querying

```javascript
// Find by custom ID
const org = await Organization.findById('organization_abc123');

// Find users in organization
const users = await User.find({ organization: 'organization_abc123' });

// Populate references
const user = await User.findById('user_xyz')
    .populate('role')
    .populate('organization');
```

## Response Examples

### Organization Response
```json
{
  "_id": "organization_a1b2c3d4e5f6",
  "companyName": "Test Corp",
  "companyEmail": "test@example.com"
}
```

### User Response
```json
{
  "_id": "user_f6e5d4c3b2a1",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "organization": "organization_a1b2c3d4e5f6",
  "role": "role_123456789abc"
}
```

## Testing

All existing queries and operations work the same way. The only difference is the ID format.

## Migration Script (Optional)

If you want to migrate existing ObjectId records to custom IDs, you'll need a migration script. This is optional and only needed if you have existing data.
