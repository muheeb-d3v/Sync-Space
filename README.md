# SyncSpace

SyncSpace is a real-time collaboration platform for teams. It provides workspaces, channels, direct messages, notifications, file sharing, and live presence over WebSockets, with a React + Vite frontend and a Node.js/Express + Socket.IO backend backed by MongoDB.

## Features

- **Workspaces** — create and join workspaces, invite members, manage preferences.
- **Channels** — organized conversations per workspace with message history.
- **Direct messages** — 1:1 conversations between users.
- **Real-time sync** — live messages, presence, and notifications via Socket.IO.
- **File uploads** — share images and documents (stored under `backend/uploads`).
- **Notifications** — in-app notification center.
- **Settings** — profile and workspace settings.
- **Authentication** — JWT-based auth with email support.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite, React Router, Tailwind CSS, Radix UI, TanStack Query, Socket.IO client |
| Backend | Node.js (>=20), Express, Socket.IO, Mongoose (MongoDB), Bull/Redis (mail queue) |
| Validation | Zod |
| Auth | JWT, bcrypt |

## Project Structure

```
Sync-Space/
├── backend/          # Express + Socket.IO API server
│   ├── src/
│   │   ├── config/   # DB, socket, queue config
│   │   ├── controllers/
│   │   ├── routes/   # /api/v1/* routers
│   │   ├── services/  # business logic
│   │   ├── repositories/
│   │   ├── models/    # Mongoose schemas
│   │   ├── middlewares/
│   │   ├── validators/
│   │   └── utils/
│   └── uploads/      # user-uploaded files
├── frontend/         # React + Vite SPA
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       └── lib/
├── DEPLOYMENT.md
└── package.json      # root convenience scripts
```

## Prerequisites

- Node.js >= 20
- MongoDB (local or Atlas)
- (Optional) Redis — required only for the mail queue

## Getting Started

### 1. Install dependencies

```bash
npm run install:all
# or manually:
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure environment

Backend (`backend/.env`):

```env
NODE_ENV=development
PORT=3000
DEV_DB_URL=mongodb://localhost:27017/syncspace
JWT_SECRET=your-secret
JWT_EXPIRATION_TIME=1d
MAIL_ID=
MAIL_PASSWORD=
REDIS_URL=
CLIENT_ORIGIN=http://localhost:5173
```

Frontend (`frontend/.env`):

```env
VITE_BACKEND_API_URL=http://localhost:3000/api/v1
```

### 3. Run in development

```bash
# terminal 1 — backend
npm run backend

# terminal 2 — frontend
npm run dev
```

Frontend runs on http://localhost:5173, backend on http://localhost:3000.

## Available Scripts

Root:

| Script | Description |
| --- | --- |
| `npm run dev` | Start frontend dev server |
| `npm run backend` | Start backend (nodemon) |
| `npm run frontend` | Start frontend dev server |
| `npm run build` | Build frontend for production |
| `npm run start:prod` | Start backend in production mode |
| `npm run install:all` | Install backend + frontend deps |

Backend (`cd backend`):

| Script | Description |
| --- | --- |
| `npm start` | Start backend with nodemon |
| `npm run start:prod` | Start backend (node) |
| `npm run lint` | Lint |
| `npm run format` | Format |

Frontend (`cd frontend`):

| Script | Description |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Lint |

## API

All endpoints are mounted under `/api/v1`:

- `/users` — auth & user profile
- `/workspaces` — workspace CRUD
- `/channels` — channel management
- `/members` — membership
- `/messages` — message history & send
- `/notifications` — notifications
- `/sync` — real-time sync helpers

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment instructions.

## License

ISC