# Employee Access Summary

## What Employees Can Access

### ✅ Employee Own Data
Employees can access and manage their own profile information through these endpoints:

#### 1. Get Own Profile
**GET** `/api/employees/profile`

**What they can see:**
- ✅ Their own personal information (name, email, phone, address)
- ✅ Their employment details (department, position, salary, employee type)
- ✅ Their emergency contact information
- ✅ Their admin information (who created/invited them)
- ✅ Their organization information
- ✅ Their account status and creation date

**Response includes:**
```json
{
  "success": true,
  "data": {
    "id": "employee_id",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "1234567890",
    "address": "123 Main St",
    "employeeType": "advocate",
    "salary": 50000,
    "department": "Legal",
    "position": "Senior Advocate",
    "status": "active",
    "adminId": {
      "id": "admin_id",
      "firstName": "Admin",
      "lastName": "User", 
      "email": "admin@example.com"
    },
    "organization": {
      "id": "org_id",
      "companyName": "Legal Firm",
      "companyEmail": "contact@legalfirm.com"
    }
  }
}
```

#### 2. Update Own Profile
**PUT** `/api/employees/profile`

**What they can update:**
- ✅ Phone number
- ✅ Address
- ✅ Emergency contact name
- ✅ Emergency contact phone
- ✅ Emergency contact relation

**What they CANNOT update:**
- ❌ Name (firstName, lastName)
- ❌ Email
- ❌ Salary
- ❌ Employee type
- ❌ Department
- ❌ Position
- ❌ Status
- ❌ Admin assignment

#### 3. Change Own Password
**PUT** `/api/employees/profile/password`

**What they can do:**
- ✅ Change their own password
- ✅ Must provide current password for verification

### ❌ What Employees CANNOT Access

#### 1. Other Employees' Data
- ❌ Cannot see other employees' profiles
- ❌ Cannot list other employees
- ❌ Cannot access other employees' information
- ❌ Cannot see other employees' admin assignments

#### 2. Admin-Only Endpoints
- ❌ Cannot access `/api/employees/admin/all`
- ❌ Cannot access `/api/employees/admin/:id`
- ❌ Cannot delete or restore employees
- ❌ Cannot update other employees' profiles
- ❌ Cannot change other employees' status

#### 3. Management Functions
- ❌ Cannot invite new employees
- ❌ Cannot manage employee status
- ❌ Cannot access organization-wide data

## What Admins Can Access

### ✅ Complete Employee Management
Admins can access all employee data and management functions:

#### 1. List All Employees
**GET** `/api/employees/admin/all`
- ✅ View all employees with pagination
- ✅ Filter by status, search, include deleted
- ✅ Sort by any field
- ✅ See complete employee information

#### 2. Manage Any Employee
**PUT** `/api/employees/admin/:id`
- ✅ Update any employee's information
- ✅ Change salary, department, position
- ✅ Modify employee type and status
- ✅ Update all profile fields

#### 3. Employee Lifecycle Management
**DELETE** `/api/employees/admin/:id` - Soft delete employee
**PUT** `/api/employees/admin/:id/restore` - Restore deleted employee
**PUT** `/api/employees/:id/status` - Change employee status

## Security Model

### 🔒 Data Isolation
- **Employee Scope**: Employees can only see their own data
- **Admin Scope**: Admins can see all employees in their organization
- **Organization Scope**: Users can only access their organization's data
- **Role-Based Access**: JWT tokens contain role information for authorization

### 🛡️ Access Control
- **Authentication Required**: All endpoints require valid JWT tokens
- **Role Authorization**: Endpoints check user role (admin vs employee)
- **Data Filtering**: Responses are filtered based on user permissions
- **Field Restrictions**: Employees can only update specific fields

## Case Creation Readiness

### 🎯 Perfect for Case Management
This access model is ideal for case creation because:

1. **Employee Identification**: Each employee has a unique ID for case assignment
2. **Admin Assignment**: Employees know who their admin is for case routing
3. **Profile Completeness**: Employees can maintain their contact information
4. **Status Tracking**: Employee status affects case assignment eligibility
5. **Data Privacy**: Employees cannot see other employees' cases or data
6. **Admin Control**: Admins can assign cases to any employee

### 📋 Case Assignment Flow
1. **Admin creates case** → Can assign to any employee
2. **Employee receives case** → Can see case details and their own profile
3. **Employee updates case** → Can only modify their assigned cases
4. **Admin monitors progress** → Can see all cases and employees

## Frontend Implementation

### Employee Dashboard
```javascript
// Employee can see:
- Their own profile information
- Their admin's contact information
- Their assigned cases (future)
- Their case history (future)
- Update their contact information
- Change their password
```

### Admin Dashboard
```javascript
// Admin can see:
- All employees in organization
- Employee management functions
- Case assignment capabilities
- Employee performance metrics
- Organization-wide statistics
```

## API Endpoints Summary

| Endpoint | Method | Access | Description |
|----------|--------|--------|-------------|
| `/api/employees/profile` | GET | Employee | Get own profile |
| `/api/employees/profile` | PUT | Employee | Update own profile |
| `/api/employees/profile/password` | PUT | Employee | Change own password |
| `/api/employees/admin/all` | GET | Admin | List all employees |
| `/api/employees/admin/:id` | PUT | Admin | Update any employee |
| `/api/employees/admin/:id` | DELETE | Admin | Soft delete employee |
| `/api/employees/admin/:id/restore` | PUT | Admin | Restore employee |

## Security Benefits

1. **Data Privacy**: Employees cannot see other employees' information
2. **Role Separation**: Clear distinction between employee and admin capabilities
3. **Audit Trail**: All actions are logged with user identification
4. **Organization Isolation**: Users can only access their organization's data
5. **Field-Level Security**: Employees can only update safe fields
6. **Status Validation**: Deactivated employees cannot access any data

This implementation provides the perfect foundation for case management while maintaining strict data privacy and security boundaries.
