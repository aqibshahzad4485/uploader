<div align="center">

```
██╗   ██╗██████╗ ██╗      ██████╗  █████╗ ██████╗ ███████╗██████╗
██║   ██║██╔══██╗██║     ██╔═══██╗██╔══██╗██╔══██╗██╔════╝██╔══██╗
██║   ██║██████╔╝██║     ██║   ██║███████║██║  ██║█████╗  ██████╔╝
██║   ██║██╔═══╝ ██║     ██║   ██║██╔══██║██║  ██║██╔══╝  ██╔══██╗
╚██████╔╝██║     ███████╗╚██████╔╝██║  ██║██████╔╝███████╗██║  ██║
 ╚═════╝ ╚═╝     ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝ ╚══════╝╚═╝  ╚═╝
```

**A self-hosted, high-performance file upload server with a beautiful dark UI.**  
Parallel chunked uploads · Adaptive concurrency · Background transfers · Full admin panel

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma)](https://prisma.io)
[![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?style=flat-square&logo=sqlite)](https://sqlite.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

</div>

---

## ✨ Features

| Category | Feature |
|---|---|
| 🚀 **Upload Engine** | Adaptive parallel chunked uploads — 1–8 streams per file, AIMD concurrency tuning |
| 📂 **Multi-File Queue** | Select or drop multiple files at once; up to 2 files upload simultaneously |
| 🗂️ **Folder Upload** | Drop a folder or use the folder picker — entire directory trees uploaded recursively |
| ⏸️ **Upload Control** | Per-file Pause / Resume / Cancel, plus global Pause All / Resume All / Cancel All |
| 📊 **Live Stats** | Real-time speed, ETA, progress %, adaptive stream count, and overall queue progress |
| �️ **Leave Guard** | Custom modal on navigation — auto-pauses uploads, offers Pause & Leave / Stay / Cancel |
| �👥 **User Management** | Create/edit/delete users, per-user monthly quotas, folder permissions |
| 🔐 **Auth & Roles** | JWT authentication, `user` / `admin` / `root` roles |
| 📁 **Folder Config** | Configure multiple upload destinations via `uploader.json` |
| 📋 **Audit Logs** | Full login history and upload history with IP, browser, timestamps |
| 💾 **Host Storage Guard** | Blocks uploads if disk usage exceeds 80% |
| 🔧 **Admin Panel** | Full web-based admin with user management, history, config |
| 🧪 **API Explorer** | Interactive in-browser API tester at `/admin/api` |
| 📝 **System Logging** | Structured logs to `/var/log/uploader.log` with automatic fallback |
| 🔄 **Auto Log Cleanup** | Configurable retention period for login logs |

---

## 🖥️ UI Preview

### Dashboard — Multi-File Upload Queue

```
╔══════════════════════════════════════════════════════════════════════╗
║  ⚡ Uploader                              📊 12.4 GB / 50 GB  ⚙️  🚪 ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  DESTINATION  [ ▶ Movies ] [ TV Shows ] [ Music ]                   ║
║                                                                      ║
║  ┌─────────────────────────────────────────────────────────────┐   ║
║  │                    ☁                                        │   ║
║  │         Drop files or folders here                          │   ║
║  │         or choose what to add                               │   ║
║  │   [ 📄 Add Files ]   [ 📁 Add Folder ]                     │   ║
║  │   ⚡ Adaptive parallel · up to 8 streams · 2 files at once  │   ║
║  └─────────────────────────────────────────────────────────────┘   ║
║                                                                      ║
║  UPLOAD QUEUE  3/5 done · 2 active · 0 waiting                      ║
║  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░  Overall 68.2%  2.1 GB / 3.1 GB      ║
║                                                                      ║
║  ┌──────────────────────────────────────────────────────────┐      ║
║  │ ✅  Supergirl-s1-e19_1080p.mp4              629 MB  🗑   │      ║
║  ├──────────────────────────────────────────────────────────┤      ║
║  │ ⟳  Supergirl-s1-e3_1080p.mp4               686 MB  ⏸ ✕ │      ║
║  │    ████████████████░░░░░░░░░░░░  52.1%                   │      ║
║  │    52.1%  ·  248 MB/s  ·  ETA 2s  ·  ⚡ 8s adaptive      │      ║
║  ├──────────────────────────────────────────────────────────┤      ║
║  │ ⟳  Top-Gun_1080p.mp4                       1.96 GB ⏸ ✕ │      ║
║  │    ██████░░░░░░░░░░░░░░░░░░░░░░  21.4%                   │      ║
║  │    21.4%  ·  231 MB/s  ·  ETA 7s  ·  ⚡ 6s adaptive      │      ║
║  ├──────────────────────────────────────────────────────────┤      ║
║  │ ⏸  Future-Man-s1-e7_1080p.mp4              517 MB  ▶ ✕ │      ║
║  │    ████████████████████████░░░░  81.3%  (paused)          │      ║
║  ├──────────────────────────────────────────────────────────┤      ║
║  │ 🕐  Supergirl-s1-e1_1080p.mp4              598 MB     ✕ │      ║
║  │    Waiting in queue…                                      │      ║
║  └──────────────────────────────────────────────────────────┘      ║
║                                                                      ║
║  [ ⏸ Pause All ]  [ ✕ Cancel All ]  [ 🗑 Clear Done ]             ║
╚══════════════════════════════════════════════════════════════════════╝
```

### Leave Guard — Custom Navigation Dialog

```
                ╔═══════════════════════════════════════╗
                ║ ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬ ║  ← amber gradient
                ║                                       ║
                ║  ⚠️  Upload in Progress               ║
                ║  3 files still uploading / queued.    ║
                ║                                       ║
                ║  ┌─────────────────────────────────┐ ║
                ║  │ ⏸  Pause All & Leave      →     │ ║  ← recommended
                ║  │    Uploads pause · resume later  │ ║
                ║  └─────────────────────────────────┘ ║
                ║  ┌─────────────────────────────────┐ ║
                ║  │ ☁  Stay on Page           →     │ ║
                ║  │    Continue monitoring           │ ║
                ║  └─────────────────────────────────┘ ║
                ║  ┌─────────────────────────────────┐ ║
                ║  │ ✕  Cancel All & Leave     →     │ ║
                ║  │    Discard all pending           │ ║
                ║  └─────────────────────────────────┘ ║
                ╚═══════════════════════════════════════╝
```

### Admin Panel

```
╔══════════════════════════════════════════════════════════════════════╗
║  ⚙️  Admin Panel          [ API Explorer ]  [ ← Dashboard ]  [🚪]  ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  ┌─────────────────────────────────────────────────────────────┐   ║
║  │ 👥 Users                                    [ + Add User ]  │   ║
║  ├──────────┬──────────┬──────────┬────────────┬──────────────┤   ║
║  │ Username │  Role    │  Quota   │  Used      │  Actions     │   ║
║  ├──────────┼──────────┼──────────┼────────────┼──────────────┤   ║
║  │ root     │ 👑 admin │ Unlimited│  —         │  (protected) │   ║
║  │ alice    │ 👤 user  │ 50 GB    │ 12.4 GB    │  ✏️  🗑️      │   ║
║  │ bob      │ 👤 user  │ 10 GB    │  3.1 GB    │  ✏️  🗑️      │   ║
║  └──────────┴──────────┴──────────┴────────────┴──────────────┘   ║
║                                                                      ║
║  ┌─────────────────────────────────────────────────────────────┐   ║
║  │ 📋 Recent Uploads                          [ View All → ]   │   ║
║  ├──────────────────────────┬──────────┬──────────┬───────────┤   ║
║  │ File                     │ Size     │ User     │ Time      │   ║
║  ├──────────────────────────┼──────────┼──────────┼───────────┤   ║
║  │ Future-Man-s1-e7_1080p   │ 517 MB   │ aqib     │ 2 min ago │   ║
║  │ Top-Gun_1080p.mp4        │ 1.96 GB  │ aqib     │ 8 min ago │   ║
║  └──────────────────────────┴──────────┴──────────┴───────────┘   ║
║                                                                      ║
║  ┌─────────────────────────────────────────────────────────────┐   ║
║  │ 🔐 Recent Logins                           [ View All → ]   │   ║
║  ├──────────┬──────────┬───────────────┬──────────────────────┤   ║
║  │ User     │ Status   │ IP            │ Time                 │   ║
║  ├──────────┼──────────┼───────────────┼──────────────────────┤   ║
║  │ aqib     │ ✅ OK    │ 10.84.201.92  │ 3 min ago            │   ║
║  │ unknown  │ ❌ FAIL  │ 10.84.201.92  │ 10 min ago           │   ║
║  └──────────┴──────────┴───────────────┴──────────────────────┘   ║
╚══════════════════════════════════════════════════════════════════════╝
```

### Interactive API Explorer

```
╔══════════════════════════════════════════════════════════════════════╗
║  🧪 API Explorer                                                     ║
╠══════════════════════════════════════════════════════════════════════╣
║  Token: [eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...]  [Copy] [Clear] ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  ▼ POST  /api/auth/login                    🔓 Public               ║
║  ┌─────────────────────────────────────────────────────────────┐   ║
║  │ username  [root          ]                                   │   ║
║  │ password  [••••••••••••• ]                                   │   ║
║  │                                          [ ▶ Send Request ] │   ║
║  └─────────────────────────────────────────────────────────────┘   ║
║  Response  200 OK  (42ms)                                           ║
║  ┌─────────────────────────────────────────────────────────────┐   ║
║  │ {                                                            │   ║
║  │   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",      │   ║
║  │   "user": { "id": 1, "username": "root", "role": "admin" }  │   ║
║  │ }                                                            │   ║
║  └─────────────────────────────────────────────────────────────┘   ║
║                                                                      ║
║  ▶ GET   /api/user/status                   🔒 Auth required        ║
║  ▶ GET   /api/config/folders                🔒 Auth required        ║
║  ▶ POST  /api/upload                        🔒 Auth required        ║
║  ▶ GET   /api/admin/users                   🔒 👑 Admin only        ║
║  ▶ POST  /api/admin/system-config           🔒 ⭐ Master only       ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/aqibshahzad4485/uploader.git
cd uploader
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
JWT_SECRET=change-this-to-a-long-random-string
DATABASE_URL=file:./dev.db
```

> ⚠️ **Security**: Always change `JWT_SECRET` before deploying. Use `openssl rand -hex 32` to generate one.

### 3. Configure Upload Folders

```bash
cp uploader.json.example uploader.json
```

Edit `uploader.json`:
```json
{
  "uploadPaths": [
    { "name": "Movies",   "path": "/mnt/media/movies" },
    { "name": "TV Shows", "path": "/mnt/media/tv" },
    { "name": "Music",    "path": "/mnt/music" }
  ]
}
```

### 4. Initialize Database & Create Default User

```bash
npm run setup
```

This runs in one command:
- `prisma generate` — generates the Prisma client
- `prisma db push` — creates the SQLite database
- `tsx scripts/seed.ts` — creates the default `root` user

### 5. Build & Start

```bash
npm run build    # compile the app (required before first start)
npm start        # start production server
```

> ⚠️ **`npm start` requires a build first.** If you see `next: not found`, you forgot to run `npm run build` (or `npm install`).

For development with hot reload:
```bash
npm run dev
```

Open **http://localhost:3000** and log in with:

| Username | Password |
|---|---|
| `root` | `admin` |

> 🔑 **Change the password immediately** after first login via the Admin Panel.

---

## 🚢 Deploying to a New Server

When cloning onto a **new machine** (e.g. a Jellyfin server, VPS, or NAS), always run this full sequence:

```bash
git clone https://github.com/aqibshahzad4485/uploader.git
cd uploader

# 1. Install dependencies (node_modules are NOT in git)
npm install

# 2. Create your environment file  ← REQUIRED, not in git
cp .env.example .env
# Then edit it — at minimum set these two values:
#   JWT_SECRET=<run: openssl rand -hex 32>
#   DATABASE_URL=file:./dev.db
nano .env

# 3. Create your folder config  ← REQUIRED, not in git
cp uploader.json.example uploader.json
nano uploader.json   # set your upload destination paths

# 4. Initialize database + create root user  ← run ONCE on first deploy
npm run setup

# 5. Build the app  ← run after every git pull
npm run build

# 6. Start
npm start
```

### Common Errors on Fresh Deploy

| Error | Cause | Fix |
|---|---|---|
| `sh: next: not found` | `node_modules` missing or no build | Run `npm install && npm run build` |
| `Module '@prisma/client' has no exported member 'PrismaClient'` | Prisma client not generated | Run `npm run build` (now auto-generates) or `npx prisma generate` |
| `datasource.url property is required` | `.env` file missing | `cp .env.example .env` then set `DATABASE_URL=file:./dev.db` |
| `Cannot find module '.prisma/client'` | Prisma not generated | Run `npm run build` or `npx prisma generate` |
| `Error: Cannot find module` | `node_modules` missing | Run `npm install` |
| `ENOENT: .env` | Missing env file | `cp .env.example .env` and edit it |
| `ENOENT: uploader.json` | Missing folder config | `cp uploader.json.example uploader.json` and edit it |
| `Prisma: Table does not exist` | DB not initialized | Run `npx prisma db push` |

### Updating an Existing Deploy

```bash
git pull
npm install        # in case new packages were added
npm run build      # always rebuild after a git pull
npm start          # or restart your systemd service
```

> If running as a systemd service: `sudo systemctl restart uploader`

---

## 🔑 Default Credentials

```
Username: root
Password: admin
Role:     admin (master)
```

---

## 👥 Roles & Access

| Permission | `user` | `admin` | `root` |
|---|:---:|:---:|:---:|
| Upload files | ✅ | ✅ | ✅ |
| Subject to monthly quota | ✅ | ❌ | ❌ |
| Restricted to allowed folders | ✅ | ❌ | ❌ |
| View admin panel | ❌ | ✅ | ✅ |
| Manage users | ❌ | ✅ | ✅ |
| View upload/login history | ❌ | ✅ | ✅ |
| Configure upload folders | ❌ | ✅ | ✅ |
| Configure data retention | ❌ | ❌ | ✅ |
| Delete `root` account | ❌ | ❌ | ❌ |

---

## ⚡ How Uploads Work

```
Browser (Upload Queue)                                    Server
  │                                                          │
  │  Queue: [file1] [file2] [file3] [file4]                 │
  │           ↓       ↓      waiting  waiting               │
  │        slot 1  slot 2   (MAX_CONCURRENT_FILES = 2)      │
  │                                                          │
  │  file1: ── chunk 0 ──────────────────────────────────► │
  │          ── chunk 1 ──────────────────────────────────► │  ← up to 8
  │          ── chunk 2 ──────────────────────────────────► │    parallel
  │                                                          │    streams
  │  file2: ── chunk 0 ──────────────────────────────────► │    per file
  │          ── chunk 1 ──────────────────────────────────► │
  │                                                          │
  │◄─ progress updates (per file) ──────────────────────── │
  │                                                          │
  │  file1 done → file3 starts automatically               │
  │  file2 done → file4 starts automatically               │
  │                                                    assemble chunks
  │◄─ COMPLETE ─────────────────────────────────────────── │
```

### Adaptive Concurrency (AIMD)

Each file independently tunes its own parallel chunk streams based on measured upload times:

```
Every 3 completed chunks:
  avg chunk time < 800ms  →  +1 stream  (additive increase, fast network)
  avg chunk time > 3000ms →  ÷2 streams (multiplicative decrease, congested)
  Range: 1 – 8 parallel streams per file
```

This is the same algorithm TCP uses (AIMD). On a fast LAN, each file quickly ramps to 8 streams. On a slow connection it backs off gracefully. The live stream count is shown per-file in the queue (e.g. `⚡ 6s adaptive`).

### Multi-File Concurrency

The queue runs up to **2 files simultaneously** (configurable via `MAX_CONCURRENT_FILES` in `dashboard/page.tsx`). As each file completes, the next queued file automatically starts. This prevents overwhelming the server while still keeping throughput high.

---

## 📋 How Login Logging Works

Every login attempt (success or failure) is recorded with:
- Username attempted
- IP address
- Browser/User-Agent
- Timestamp
- Success/failure status

Logs are automatically cleaned up based on the **Data Retention** setting in the Admin Panel (default: 30 days). The `root` user can configure this under **System Config**.

---

## 📝 System Logs

The application writes structured logs to:

| Path | Used when |
|---|---|
| `/var/log/uploader.log` | App has write access to `/var/log/` |
| `logs/uploader.log` | Fallback (always writable) |
| `stdout` / `stderr` | Always — visible via `journalctl` |

**Log format:**
```
[2026-02-19T03:10:33.000Z] [LOGIN ] Login SUCCESS for user 'aqib' {"ip":"10.84.201.92","userAgent":"Mozilla/5.0..."}
[2026-02-19T03:10:35.000Z] [UPLOAD] Upload STARTED by 'aqib': Top-Gun_1080p.mp4 {"size":2097152000,"folder":"Movies","chunks":1000}
[2026-02-19T03:10:40.000Z] [UPLOAD] Upload COMPLETE by 'aqib': Top-Gun_1080p.mp4 {"fileId":7,"path":"/mnt/media/movies/Top-Gun_1080p.mp4"}
[2026-02-19T03:10:41.000Z] [ERROR ] Unhandled upload error {"user":"alice","error":"ENOSPC: no space left"}
```

To grant write access to `/var/log/uploader.log`:
```bash
sudo touch /var/log/uploader.log
sudo chown $USER /var/log/uploader.log
```

To tail logs live:
```bash
tail -f /var/log/uploader.log
# or
tail -f logs/uploader.log
```

---

## 🐧 Running as a Linux Service (systemd)

Create `/etc/systemd/system/uploader.service`:

```ini
[Unit]
Description=Uploader File Server
After=network.target

[Service]
Type=simple
User=your_linux_username
WorkingDirectory=/home/your_linux_username/data/projects/uploader
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable uploader
sudo systemctl start uploader
sudo systemctl status uploader

# View logs
journalctl -u uploader -f
```

---

## 💾 Backup

```bash
# Backup database
cp dev.db dev.db.backup-$(date +%Y%m%d)

# Backup config
cp uploader.json uploader.json.backup
cp .env .env.backup
```

---

## 🔌 REST API Reference

All endpoints are under `/api/`. Protected endpoints require:
```
Authorization: Bearer <jwt_token>
```

> 🧪 Use the **[Interactive API Explorer](/admin/api)** to test all endpoints live in your browser.

### Authentication

#### `POST /api/auth/login`
```json
// Request
{ "username": "root", "password": "admin" }

// Response 200
{ "token": "<jwt>", "user": { "id": 1, "username": "root", "role": "admin", "quota": "0" } }
```

### User

#### `GET /api/user/status` 🔒
Returns current user profile, quota, and this month's usage.

### Uploads

#### `GET /api/config/folders` 🔒
Returns folders available to the current user.

#### `POST /api/upload` 🔒
Upload a file (or a chunk). `multipart/form-data`.

| Field | Type | Description |
|---|---|---|
| `file` | File | File data (or chunk slice) |
| `folder` | string | Target folder name |
| `chunkIndex` | number | Chunk index (0-based) |
| `totalChunks` | number | Total number of chunks |
| `uploadId` | string | Unique upload session ID |
| `filename` | string | Original filename |
| `totalSize` | number | Total file size in bytes |

### Admin — Users 🔒 👑

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/users` | List all users |
| `POST` | `/api/admin/users` | Create user |
| `PUT` | `/api/admin/users` | Update user |
| `DELETE` | `/api/admin/users?id={id}` | Delete user (not root) |

### Admin — History 🔒 👑

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/uploads?limit={n}` | Upload history |
| `GET` | `/api/admin/logins?limit={n}` | Login history |

### Admin — Config 🔒 👑

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/system-config` | Get retention settings |
| `POST` | `/api/admin/system-config` | Update retention (master only) |
| `POST` | `/api/admin/config` | Save folder configuration |

🔒 = Auth required · 👑 = Admin/Master role required

---

## 🔧 Troubleshooting

| Problem | Solution |
|---|---|
| `EADDRINUSE: port 3000` | Another process is using port 3000. Run `lsof -i :3000` to find it. |
| "Host storage full" error | Free up disk space on the upload partition |
| Upload fails silently | Check that the app user has write permission to the target folder |
| Can't log in | Run `npm run seed` to ensure the root user exists |
| Database errors | Delete `dev.db` and run `npm run setup` to start fresh |
| Service Worker not updating | Open DevTools → Application → Service Workers → click "Update" |
| Upload doesn't resume after refresh | Check browser console for SW registration errors |

---

## 📦 Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server with hot reload |
| `npm start` | Start production server |
| `npm run build` | Build for production |
| `npm run setup` | Full setup: generate Prisma client + push DB schema + seed root user |
| `npm run seed` | Create default root user (if no users exist) |

---

## 🗂️ Project Structure

```
uploader/
├── app/
│   ├── api/
│   │   ├── auth/login/       # JWT login + login logging
│   │   ├── upload/           # Chunked file upload handler (assembles chunks)
│   │   ├── user/status/      # Current user info + quota
│   │   ├── config/folders/   # Available upload folders
│   │   └── admin/
│   │       ├── users/        # User CRUD
│   │       ├── uploads/      # Upload history
│   │       ├── logins/       # Login history
│   │       ├── system-config/# Retention settings
│   │       └── config/       # Folder config
│   ├── dashboard/            # Upload UI:
│   │                         #   · Multi-file queue (up to 2 simultaneous)
│   │                         #   · Folder upload via FileSystem API
│   │                         #   · Adaptive AIMD parallel chunking (1–8 streams)
│   │                         #   · Per-file pause/resume/cancel
│   │                         #   · Leave guard modal
│   ├── admin/
│   │   ├── page.tsx          # Admin panel
│   │   ├── api/              # Interactive API Explorer
│   │   ├── history/          # Upload history page
│   │   └── logins/           # Login history page
│   └── login/                # Login page
├── lib/
│   ├── auth.ts               # JWT sign/verify + getCurrentUser
│   ├── prisma.ts             # Prisma singleton
│   └── logger.ts             # Structured system logger
├── prisma/
│   └── schema.prisma         # DB schema (User, Upload, LoginLog, SystemConfig)
├── public/
│   └── upload-sw.js          # Service Worker (background upload engine)
├── scripts/
│   └── seed.ts               # First-run seed script
├── .env.example              # Environment variable template
└── uploader.json.example     # Upload folder config template
```

---

<div align="center">

Made by Aqibs with ❤️ · Self-hosted · 

</div>
