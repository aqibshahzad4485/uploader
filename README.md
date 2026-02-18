# Secure File Uploader

A robust, secure, and self-hosted web application for managing file uploads with role-based access control, strict quota management, and comprehensive auditing. Built with **Next.js**, **Prisma**, and **SQLite**.

---

## 🚀 Features

- **Role-Based Access Control (RBAC)**
  - **Master (root)**: Full access to all folders, unlimited quota, user management, and system configuration. Cannot be deleted.
  - **Admin**: Full access to all folders and unlimited quota. Can manage users and folders.
  - **User**: Restricted to assigned folders with a monthly data quota.
- **Folder Permissions**: Users can only upload to folders explicitly assigned by an Admin.
- **Smart Quota System**: Monthly bandwidth quotas per user, enforced both client-side and server-side.
- **Host Storage Guard**: Automatically blocks uploads if the server disk usage exceeds **80%**.
- **Comprehensive Auditing**:
  - **Upload History**: Tracks every upload — user, file size, destination, IP address, and browser/device.
  - **Login Logs**: Records all login attempts (success/failure) with IP and User Agent.
  - **Data Retention**: Configurable log retention period (default: 30 days). Old logs are auto-deleted.
- **Security**:
  - **Root User Protection**: The `root` user cannot be deleted. Its password can only be changed by itself.
  - **JWT Authentication**: Stateless, secure sessions.
  - **bcrypt Password Hashing**: Industry-standard password storage.

---

## 🛠️ Installation & Setup

### Prerequisites

- **Node.js** v18 or higher
- **npm** (comes with Node.js)
- A **Linux/Unix** server (also works on macOS/Windows)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd uploader
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set a strong `JWT_SECRET`:

```env
JWT_SECRET="your-long-random-secret-here"
DATABASE_URL="file:./dev.db"
```

### 3. Configure Upload Folders

```bash
cp uploader.json.example uploader.json
```

Edit `uploader.json` to define your upload destinations:

```json
{
  "uploadPaths": [
    { "name": "Movies", "path": "/mnt/media/movies" },
    { "name": "Documents", "path": "/home/user/docs" }
  ]
}
```

> **Note**: The system user running the app must have **write permission** to these directories.

### 4. Initialize Database & Seed Default User

```bash
npm run setup
```

This command will:
1. Generate the Prisma client
2. Create the SQLite database and all tables
3. Create the default `root` user (if no users exist)

### 5. Build & Start

```bash
npm run build
npm start
```

The app will be available at `http://localhost:3000`.

---

## 🔑 Default Credentials

| Field    | Value   |
|----------|---------|
| Username | `root`  |
| Password | `admin` |

> ⚠️ **Change the password immediately** after your first login via the Admin Panel!

---

## 👥 Roles & Access

| Feature                   | User | Admin | Master (root) |
|---------------------------|:----:|:-----:|:-------------:|
| Upload files              | ✅   | ✅    | ✅            |
| Access assigned folders   | ✅   | ✅    | ✅            |
| Access all folders        | ❌   | ✅    | ✅            |
| Monthly quota enforced    | ✅   | ❌    | ❌            |
| Manage users              | ❌   | ✅    | ✅            |
| Manage folders            | ❌   | ✅    | ✅            |
| View upload history       | ❌   | ✅    | ✅            |
| View login logs           | ❌   | ✅    | ✅            |
| Configure data retention  | ❌   | ❌    | ✅            |
| Delete root user          | ❌   | ❌    | ❌            |

---

## ⚙️ Admin Guide

### Managing Users (`/admin`)

1. **Create User**: Enter username, password, role, and monthly quota (in GB).
2. **Allowed Folders**: Select which folders the user can upload to. Standard users see only their assigned folders.
3. **Edit User**: Update password, quota, or folder permissions at any time.
4. **Delete User**: Removes the user and their upload history records. Files on disk are **not** deleted.

### Managing Folders (`/admin` → Folder Management)

1. Add a **Name** (display label, e.g., `Movies`) and a **Path** (absolute server path, e.g., `/mnt/media/movies`).
2. Click **Save Configuration** to persist changes.
3. Ensure the server has write access to each path.

### Monitoring

- **Recent Uploads** (`/admin`): Last 10 uploads. Click **View Full History** for the complete sortable/filterable log at `/admin/history`.
- **Recent Logins** (`/admin`): Last 10 login attempts. Click **View Full History** for the complete log at `/admin/logins`.

### Data Retention (Master Only)

In the **Data Retention** section at the bottom of the Admin Panel, set the number of days to keep logs. Logs older than this threshold are automatically deleted on each login event.

---

## 📤 How Uploads Work

1. User selects a file and a destination folder.
2. **Pre-upload checks** (client-side):
   - A folder must be selected.
   - File size must not exceed the user's remaining monthly quota.
3. **Server-side checks** (on upload):
   - User is authenticated.
   - Folder is in the user's allowed list.
   - Monthly quota is not exceeded.
   - Host disk usage is below 80%.
4. File is written to the configured server path.
5. Upload is recorded in the database with metadata (user, size, path, IP, browser).

---

## 🔐 How Login Logging Works

Every login attempt — whether successful or failed — is recorded with:
- **Username** attempted
- **Success/Failure** status
- **IP Address** (IPv4 preferred; IPv6 fallback)
- **User Agent** (browser/OS string)
- **Timestamp**

Logs are automatically cleaned up based on the configured retention period.

---

## 🐧 Running as a Linux Service (systemd)

To keep the app running in the background:

1. Create the service file:

```bash
sudo nano /etc/systemd/system/uploader.service
```

2. Paste the following (adjust `User` and `WorkingDirectory`):

```ini
[Unit]
Description=Secure File Uploader
After=network.target

[Service]
Type=simple
User=your_linux_username
WorkingDirectory=/path/to/uploader
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

3. Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable uploader
sudo systemctl start uploader
sudo systemctl status uploader
```

---

## 🗄️ Backup

The entire application state lives in one file: **`dev.db`**.

Back it up regularly:

```bash
cp /path/to/uploader/dev.db /backups/uploader-$(date +%Y%m%d).db
```

---

## 🔧 Troubleshooting

| Problem | Solution |
|---|---|
| "Host storage full" error | Free up disk space on the partition where upload folders reside |
| Upload fails silently | Check that the app user has write permission to the target folder |
| Can't log in | Run `npm run seed` to ensure the root user exists |
| Database errors | Delete `dev.db` and run `npm run setup` to start fresh |

---

## 🔌 REST API Reference

All API endpoints are available under `/api/`. Protected endpoints require a `Bearer` token in the `Authorization` header.

### 🧪 Interactive API Explorer

Navigate to **`/admin/api`** in the web UI for a fully interactive API explorer where you can:
- Generate a JWT token by logging in
- Test every endpoint with a live form
- See real responses with status codes and timing

---

### Authentication

#### `POST /api/auth/login`
Generate a JWT token.

**Body:**
```json
{ "username": "root", "password": "admin" }
```
**Response:**
```json
{ "token": "<jwt>", "user": { "id": 1, "username": "root", "role": "admin", "quota": "10737418240" } }
```

---

### User

#### `GET /api/user/status` 🔒
Get the current user's profile, quota, and this month's usage.

---

### Uploads

#### `GET /api/config/folders` 🔒
List upload folders available to the current user.

#### `POST /api/upload` 🔒
Upload a file. Request must be `multipart/form-data`.

| Field | Type | Description |
|---|---|---|
| `file` | File | The file to upload |
| `folder` | string | Folder name (must match a configured folder) |

---

### Admin — Users 🔒 👑

#### `GET /api/admin/users`
List all users with quotas and usage.

#### `POST /api/admin/users`
Create a new user.

| Field | Type | Description |
|---|---|---|
| `username` | string | Required |
| `password` | string | Required |
| `role` | `user` \| `admin` | Required |
| `quota` | number | Monthly quota in bytes (default: 10GB) |
| `allowedFolders` | string[] | JSON array of folder names |

#### `PUT /api/admin/users`
Update a user's password, quota, or allowed folders. Pass `id` in the body.

#### `DELETE /api/admin/users?id={id}`
Delete a user by ID. Cannot delete `root`.

---

### Admin — History 🔒 👑

#### `GET /api/admin/uploads?limit={n}`
List upload history. Omit `limit` for all records.

#### `GET /api/admin/logins?limit={n}`
List login history. Omit `limit` for all records.

---

### Admin — Configuration 🔒 👑

#### `GET /api/admin/system-config`
Get system configuration (e.g., `retentionDays`).

#### `POST /api/admin/system-config` *(Master only)*
Update system configuration.

```json
{ "retentionDays": 30 }
```

#### `POST /api/admin/config`
Save folder configuration.

```json
{ "uploadPaths": [{ "name": "Movies", "path": "/mnt/media/movies" }] }
```

---

🔒 = Requires Bearer token | 👑 = Admin/Master role required
