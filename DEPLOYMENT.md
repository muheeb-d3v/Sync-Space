# Deploying SyncSpace

SyncSpace has two deployable pieces:

| Part | Technology | What to deploy |
| --- | --- | --- |
| Frontend | React + Vite | static files from `frontend/dist` |
| Backend | Node + Express + Socket.IO | the `backend` service, plus MongoDB and (optionally) Redis |

The frontend talks to the backend through `VITE_BACKEND_API_URL`. Socket.IO
connects to the same origin automatically (the `/api/v1` suffix is stripped).

## 1. Environment files

### Backend

| File | When it is read | Commit? |
| --- | --- | --- |
| `backend/.env` | `NODE_ENV` is `development` (default) | No |
| `backend/.env.production` | `NODE_ENV=production` | No |
| `backend/.env.example` | reference for local setup | Yes |
| `backend/.env.production.example` | reference for production | Yes |

Required production values:

```env
NODE_ENV=production
PORT=3000
PROD_DB_URL=mongodb+srv://...
JWT_SECRET=<at least 32 random bytes, base64/hex>
JWT_EXPIRATION_TIME=1d
MAIL_ID=...
MAIL_PASSWORD=...
REDIS_URL=                # optional; mail queue only
CLIENT_ORIGIN=https://your-frontend-domain.com
```

`dotenv` never overrides variables that the hosting platform already sets, so
you can put these in the host's dashboard instead of a file.

### Frontend

| File | When it is read | Commit? |
| --- | --- | --- |
| `frontend/.env` | local dev | currently kept in repo (localhost URL) |
| `frontend/.env.production` | `vite build` | No |
| `frontend/.env.example` | reference | Yes |

```env
# must include /api/v1
VITE_BACKEND_API_URL=https://your-backend-domain.com/api/v1
```

Vite inlines this value at **build time**. If you build on a CI provider, set
the variable in the provider and run the build there.

## 2. Backend deployment

```bash
cd backend
npm ci
NODE_ENV=production npm run start:prod
```

PowerShell equivalent:

```powershell
cd backend
npm ci
$env:NODE_ENV = "production"
npm run start:prod
```

Checklist:

- MongoDB Atlas → Network Access includes the backend host/0.0.0.0 as needed.
- The database user has read/write access to the target database.
- `JWT_SECRET` is unique per environment and is **not** the example value.
- `CLIENT_ORIGIN` contains the deployed frontend URL (comma-separated for multiple).
- `MAIL_*` and `REDIS_URL` are set if email notifications are required.
  Without Redis the app still works; only the mail queue logs connection errors.
- Port: use the platform-provided `PORT` if required.

## 3. Frontend deployment

```bash
cd frontend
npm ci
npm run build
```

Deploy `frontend/dist` to any static host. Because the app uses BrowserRouter,
configure an SPA fallback to `index.html`:

- **Nginx:** `try_files $uri $uri/ /index.html;`
- **Vercel:** add a rewrite of all routes to `/index.html`
- **Netlify:** `/* /index.html 200`

## 4. Root convenience scripts

From the repository root:

```bash
npm run install:all     # install backend + frontend
npm run build           # production frontend build
npm run start:prod      # production backend (requires NODE_ENV=production)
```

## 5. Environments at a glance

**Development**

```bash
npm run dev                 # frontend on http://localhost:5173
npm run backend             # backend on http://localhost:3000
```

**Production**

```bash
NODE_ENV=production npm run start:prod
# serve frontend/dist with SPA fallback
```

## 6. Do not commit

- `backend/.env`, `backend/.env.production`
- `frontend/.env.production`
- `node_modules`, `frontend/dist`

Only the `*.example` files are meant to be committed.
