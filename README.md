# Hospital Bed Management System (HBMS)

A modern, full-stack hospital bed management dashboard with real-time updates, role-based access, and analytics. Built with React + Vite + Tailwind on the frontend and Node.js + Express + SQLite + Socket.IO on the backend — fully runnable locally with zero external services.

## Features

- **Authentication** — JWT-based login/signup with role-based access (Admin, Nurse, Receptionist).
- **Live dashboard** — total / available / occupied / reserved bed counts, occupancy trend, status pie chart, ward-level bar chart.
- **Bed management** — CRUD beds, search by code/ward, filter by ward/status/type. Cards grouped by ward.
- **Patient management** — admit, edit, assign/change bed, and discharge (auto-frees the bed).
- **Ward management** — CRUD wards with live capacity bars per ward.
- **Real-time updates** — every bed/patient/ward change is broadcast via Socket.IO; all open clients refresh instantly.
- **Notifications** — in-app toasts; warning banners when beds are full or availability is < 10%.
- **Dark mode** — system-aware, persisted toggle in the header.
- **Responsive UI** — works from mobile to desktop, hospital-style white-and-blue theme with smooth animations.

## Tech stack

| Layer    | Stack |
| -------- | ----- |
| Frontend | React 18, Vite, React Router, Tailwind CSS, Recharts, Socket.IO client, lucide-react, react-hot-toast |
| Backend  | Node.js, Express 4, better-sqlite3, JWT, bcryptjs, Zod, Socket.IO, express-rate-limit |
| Database | SQLite (file-based, no setup) |

## Project structure

```
.
├── backend/
│   ├── src/
│   │   ├── server.js          # Express + Socket.IO entry
│   │   ├── db.js              # SQLite connection + schema
│   │   ├── seed.js            # Demo data (auto-seeds on first run)
│   │   ├── snapshot.js        # Periodic occupancy snapshots
│   │   ├── realtime.js        # Socket.IO emitter
│   │   ├── middleware/auth.js # JWT + role guards
│   │   └── routes/            # auth, wards, beds, patients, stats
│   ├── data/                  # SQLite db (created at runtime)
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── main.jsx            # Providers + router
    │   ├── App.jsx             # Routes
    │   ├── api.js              # Typed-ish API client
    │   ├── context/            # AuthContext, ThemeContext
    │   ├── hooks/useSocket.js
    │   ├── components/         # Layout, ProtectedRoute, StatCard, Modal, etc.
    │   └── pages/              # Login, Signup, Dashboard, Beds, Patients, Wards
    ├── tailwind.config.js
    ├── vite.config.js
    └── package.json
```

## Getting started

### Prerequisites

- **Node.js 18+** (Node 20 recommended)
- **npm** (bundled with Node)

### 1. Backend

```bash
cd backend
cp .env.example .env       # PowerShell: Copy-Item .env.example .env
npm install
npm run dev                # http://localhost:4000
```

On first start the database is created at `backend/data/hbms.db` and seeded with:

| Role         | Email               | Password   |
| ------------ | ------------------- | ---------- |
| Admin        | admin@hbms.local    | admin123   |
| Nurse        | nurse@hbms.local    | nurse123   |
| Receptionist | desk@hbms.local     | desk123    |

Plus 7 wards with ~50 beds and 9 sample patients.

### 2. Frontend

In a second terminal:

```bash
cd frontend
cp .env.example .env       # PowerShell: Copy-Item .env.example .env
npm install
npm run dev                # http://localhost:5173
```

Open http://localhost:5173 and log in with one of the demo accounts (or click any account card on the login page to auto-fill).

## API overview

All `/api/*` routes (except `/api/auth/login` and `/api/auth/signup`) require `Authorization: Bearer <token>`.

| Method | Path                              | Roles                          |
| ------ | --------------------------------- | ------------------------------ |
| POST   | `/api/auth/signup`                | public                         |
| POST   | `/api/auth/login`                 | public                         |
| GET    | `/api/auth/me`                    | any auth                       |
| GET    | `/api/wards`                      | any auth                       |
| POST   | `/api/wards`                      | admin                          |
| PUT    | `/api/wards/:id`                  | admin                          |
| DELETE | `/api/wards/:id`                  | admin                          |
| GET    | `/api/beds`                       | any auth                       |
| POST   | `/api/beds`                       | admin                          |
| PUT    | `/api/beds/:id`                   | admin, nurse                   |
| DELETE | `/api/beds/:id`                   | admin                          |
| GET    | `/api/patients`                   | any auth                       |
| POST   | `/api/patients`                   | admin, nurse, receptionist     |
| PUT    | `/api/patients/:id`               | admin, nurse, receptionist     |
| POST   | `/api/patients/:id/assign-bed`    | admin, nurse, receptionist     |
| POST   | `/api/patients/:id/discharge`     | admin, nurse, receptionist     |
| DELETE | `/api/patients/:id`               | admin                          |
| GET    | `/api/stats/summary`              | any auth                       |
| GET    | `/api/stats/occupancy-trend`      | any auth                       |
| GET    | `/api/stats/ward-distribution`    | any auth                       |

### Socket.IO events (server → client)

`bed:created`, `bed:updated`, `bed:deleted`, `patient:created`, `patient:updated`, `patient:deleted`, `ward:created`, `ward:updated`, `ward:deleted`.

## Deployment notes

- **Frontend** — `npm run build` in `frontend/` produces a static bundle in `frontend/dist/`. Deploy to Vercel, Netlify, Cloudflare Pages, etc. Set `VITE_API_URL` to your backend URL at build time.
- **Backend** — Deploy to Render, Railway, or Fly.io. Set `JWT_SECRET`, `CORS_ORIGIN` (your frontend URL), and `PORT`. SQLite works on services with a persistent disk; for serverless platforms, swap `better-sqlite3` for Postgres (the code is written against a thin SQL layer to make this swap easy).
- **Production tips** — set a long `JWT_SECRET`, run behind HTTPS, and put rate-limiting / WAF in front of the API.

## Security

- JWT tokens with configurable expiry (`JWT_EXPIRES_IN`).
- Passwords hashed with bcryptjs (10 rounds).
- All write routes are role-guarded; all reads require auth.
- Zod-validated request bodies on every mutating endpoint.
- Express rate-limit at 300 req/min/IP.
- CORS locked to `CORS_ORIGIN`.

## Validation & edge cases handled

- Cannot delete an occupied bed.
- Cannot change bed status while a patient is admitted to it.
- Assigning an already-occupied bed is rejected.
- Discharging a patient automatically frees their bed.
- Banner alerts when no beds are available or availability < 10%.

## Scripts

| Where     | Script           | Description                       |
| --------- | ---------------- | --------------------------------- |
| backend/  | `npm run dev`    | Start with file-watch reload      |
| backend/  | `npm start`      | Production start                  |
| backend/  | `npm run seed`   | Force-seed demo data (idempotent) |
| frontend/ | `npm run dev`    | Vite dev server                   |
| frontend/ | `npm run build`  | Production build                  |
| frontend/ | `npm run preview`| Preview production build          |

## Resetting demo data

Stop the backend, delete `backend/data/hbms.db`, and start the backend again — it will recreate and reseed.
