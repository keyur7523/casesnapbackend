# Frontend integration: Aadhar image upload

Use `POST /api/upload` to upload the client Aadhar card image (max 1 MB), then send the returned URL in the client create payload.

## 1. Upload endpoint

- **URL:** `POST http://localhost:5004/api/upload` (or your backend base URL)
- **Auth:** Bearer token required (`Authorization: Bearer <token>`)
- **Body:** `multipart/form-data` with one file under key **`file`**, **`image`**, or **`aadharImage`**
- **Response:** `{ success: true, data: { url, size, filename, originalName } }` — use `data.url` as `aadharImageUrl` when creating/updating a client.

---

## 2. React / Next.js example

### File input + upload function

```js
const UPLOAD_URL = 'http://localhost:5004/api/upload'; // or process.env.NEXT_PUBLIC_API_URL + '/api/upload'

async function uploadAadharImage(file, token) {
  const formData = new FormData();
  formData.append('file', file); // or 'image' or 'aadharImage'

  const res = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      // Do NOT set Content-Type; browser sets it with boundary for FormData
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }

  const json = await res.json();
  return json.data; // { url, size, filename, originalName }
}
```

### In your client create form component

```jsx
const [aadharFile, setAadharFile] = useState(null);
const [aadharImageUrl, setAadharImageUrl] = useState('');
const [uploading, setUploading] = useState(false);
const token = 'YOUR_JWT_TOKEN'; // from auth context, localStorage, etc.

// When user selects a file (e.g. max 1 MB)
const handleAadharChange = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (file.size > 1024 * 1024) {
    alert('Aadhar image must be 1 MB or less');
    return;
  }

  setUploading(true);
  try {
    const data = await uploadAadharImage(file, token);
    setAadharImageUrl(data.url); // use as aadharImageUrl in client create
    setAadharFile(file);
  } catch (err) {
    alert(err.message || 'Upload failed');
  } finally {
    setUploading(false);
  }
};

// Submit client create with the uploaded URL
const handleSubmitClient = async (e) => {
  e.preventDefault();
  const res = await fetch('http://localhost:5004/api/clients', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      firstName: '...',
      lastName: '...',
      phone: '...',
      fees: 1000,
      // ... other client fields
      aadharImageUrl: aadharImageUrl || undefined,
    }),
  });
  // ...
};
```

### JSX for the Aadhar field

```jsx
<label>
  Aadhar Card Image (max 1 MB)
  <input
    type="file"
    accept="image/jpeg,image/jpg,image/png,image/webp"
    onChange={handleAadharChange}
    disabled={uploading}
  />
</label>
{uploading && <span>Uploading…</span>}
{aadharImageUrl && <span>Uploaded</span>}
```

---

## 3. Vanilla JavaScript (no framework)

```html
<input type="file" id="aadhar" accept="image/jpeg,image/jpg,image/png,image/webp" />
<button id="uploadBtn">Upload Aadhar</button>
<script>
  const token = 'YOUR_JWT_TOKEN';
  const UPLOAD_URL = 'http://localhost:5004/api/upload';

  document.getElementById('uploadBtn').addEventListener('click', async () => {
    const input = document.getElementById('aadhar');
    const file = input.files[0];
    if (!file) {
      alert('Select a file');
      return;
    }
    if (file.size > 1024 * 1024) {
      alert('File must be 1 MB or less');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(UPLOAD_URL, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
      body: formData,
    });

    const json = await res.json();
    if (!json.success) {
      alert(json.error || 'Upload failed');
      return;
    }

    console.log('Uploaded URL:', json.data.url);
    // Use json.data.url as aadharImageUrl in your client create request
  });
</script>
```

---

## 4. Important points

- Do **not** set `Content-Type` when using `FormData`; the browser sets it (including the boundary).
- Use the same **Bearer token** you use for other protected APIs.
- Field name must be **`file`**, **`image`**, or **`aadharImage`**.
- Max file size: **1 MB**. Validate on the frontend before upload.
- After upload, send **`aadharImageUrl`** in the **client create** `POST /api/clients` body (use the upload response `data.url`).

---

## 5. Postman (quick reference)

1. Method: **POST**, URL: `http://localhost:5004/api/upload`
2. **Headers:** `Authorization: Bearer <your_token>`
3. **Body** → **form-data**
4. Key: **file** (type: File), Value: select your image file
5. Send
