# Employee Archive API - Quick Reference Sheet

## 🌐 Base URL
```
https://casesnapbackend.onrender.com
```

---

## 📡 Endpoints Summary

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/employees/admin/all` | Get employees (excludes archived by default) | Admin |
| GET | `/api/employees/admin/all?includeArchived=true` | Get all including archived | Admin |
| POST | `/api/employees/admin/:id/archive` | Archive employee | Admin |
| PUT | `/api/employees/admin/:id/unarchive` | Unarchive employee | Admin |

---

## 🔑 Authentication
All requests require JWT token in header:
```
Authorization: Bearer YOUR_TOKEN_HERE
```

---

## 📋 Request/Response Examples

### 1. Get Active Employees (Default)
```javascript
GET /api/employees/admin/all

// Response includes:
{
  "data": [
    {
      "_id": "...",
      "firstName": "John",
      "employmentStatus": "employed",  // ⭐ NEW
      "status": "active",
      "archivedAt": null,              // ⭐ NEW
      "archiveReason": null            // ⭐ NEW
    }
  ]
}
```

### 2. Get All Employees (Include Archived)
```javascript
GET /api/employees/admin/all?includeArchived=true

// Response includes both employed and archived
```

### 3. Archive Employee
```javascript
POST /api/employees/admin/507f1f77bcf86cd799439011/archive
Content-Type: application/json

{
  "reason": "Employee resigned",
  "notes": "Last day: 2024-01-31"
}

// Response:
{
  "success": true,
  "message": "Employee archived successfully...",
  "data": {
    "employmentStatus": "archived",
    "status": "terminated",
    "archivedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 4. Unarchive Employee
```javascript
PUT /api/employees/admin/507f1f77bcf86cd799439011/unarchive
Content-Type: application/json

{
  "notes": "Rehired"
}

// Response:
{
  "success": true,
  "message": "Employee unarchived successfully...",
  "data": {
    "employmentStatus": "employed",
    "status": "pending"
  }
}
```

---

## 🔢 New Employee Fields

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `employmentStatus` | string | `'employed'` \| `'archived'` | Employment status |
| `archivedAt` | Date \| null | ISO date | When archived |
| `archivedBy` | string \| null | User ID | Admin who archived |
| `archiveReason` | string \| null | Text (max 200 chars) | Reason for archiving |

---

## ⚡ Quick Copy-Paste (JavaScript/TypeScript)

### Axios
```javascript
// Archive
await axios.post(
  `https://casesnapbackend.onrender.com/api/employees/admin/${id}/archive`,
  { reason: 'Resigned', notes: 'Last day: 2024-01-31' },
  { headers: { Authorization: `Bearer ${token}` } }
);

// Unarchive
await axios.put(
  `https://casesnapbackend.onrender.com/api/employees/admin/${id}/unarchive`,
  { notes: 'Rehired' },
  { headers: { Authorization: `Bearer ${token}` } }
);

// Get with archived
await axios.get(
  'https://casesnapbackend.onrender.com/api/employees/admin/all',
  { 
    params: { includeArchived: true },
    headers: { Authorization: `Bearer ${token}` }
  }
);
```

### Fetch
```javascript
// Archive
await fetch(
  `https://casesnapbackend.onrender.com/api/employees/admin/${id}/archive`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ reason: 'Resigned', notes: 'Last day: 2024-01-31' })
  }
);

// Get with archived
await fetch(
  'https://casesnapbackend.onrender.com/api/employees/admin/all?includeArchived=true',
  { headers: { Authorization: `Bearer ${token}` } }
);
```

---

## ❌ Error Codes

| Code | Error | Solution |
|------|-------|----------|
| 400 | Already archived | Employee is already archived |
| 401 | Unauthorized | Check JWT token |
| 403 | Forbidden | User is not admin |
| 404 | Not found | Invalid employee ID or not in your org |

---

## ✅ Frontend Checklist

- [ ] Default to `includeArchived=false`
- [ ] Add "Show Archived" toggle
- [ ] Show archive button for employed employees
- [ ] Show unarchive button for archived employees
- [ ] Add confirmation dialogs
- [ ] Request reason when archiving
- [ ] Show success/error messages
- [ ] Handle loading states
- [ ] Display archive info (date, reason)
- [ ] Refresh list after archive/unarchive

---

## 📝 TypeScript Interface

```typescript
interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: 'pending' | 'active' | 'inactive' | 'terminated';
  
  // ⭐ NEW Archive fields
  employmentStatus: 'employed' | 'archived';
  archivedAt: string | null;
  archivedBy: string | null;
  archiveReason: string | null;
  
  // ... other fields
}
```

---

## 🎨 UI Recommendations

```
Employed Employee:
┌─────────────────────────────┐
│ John Doe                    │
│ 🟢 Active | Legal Dept      │
│                             │
│ [View] [Edit] [📦 Archive] │
└─────────────────────────────┘

Archived Employee:
┌─────────────────────────────┐
│ Bob Jones                   │
│ 📦 Archived | Sales Dept    │
│ Archived: 2024-01-15        │
│ Reason: Employee resigned   │
│                             │
│ [View] [📤 Unarchive]       │
└─────────────────────────────┘
```

---

## 🚀 Testing URLs

**Production:**
- Base: `https://casesnapbackend.onrender.com`
- Login: `POST /api/auth/login`
- Employees: `GET /api/employees/admin/all`
- Archive: `POST /api/employees/admin/:id/archive`
- Unarchive: `PUT /api/employees/admin/:id/unarchive`

---

## 📞 Need Help?

1. Check full documentation: `FRONTEND_INTEGRATION_GUIDE.md`
2. Review API docs: `EMPLOYEE_ARCHIVE_API.md`
3. Test in Postman first
4. Check browser console for errors
5. Verify JWT token is valid

---

**Last Updated:** January 2024
**API Version:** v1.0
**Status:** ✅ Production Ready

