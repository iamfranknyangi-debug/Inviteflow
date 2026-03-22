# InviteFlow 🎉
### Digital Invitation Card Management System

A complete, production-ready full-stack system for creating, sending, and tracking personalised event invitations via SMS and WhatsApp, with QR code check-in.

---

## Features

| Module | Capabilities |
|--------|-------------|
| **Admin Dashboard** | Live stats, event overview, RSVP charts, activity log |
| **Multi-Event** | Create and manage unlimited events simultaneously |
| **Guest Management** | Add individually, bulk upload via CSV/Excel, search, filter |
| **Invitation Cards** | Custom card designer, background image upload, per-guest personalisation, PNG export |
| **QR Codes** | Unique signed QR per guest, batch generation, PNG download, scan history |
| **SMS Sending** | Africa's Talking + Twilio, template variables, bulk dispatch, test send |
| **WhatsApp** | Twilio WhatsApp Business API integration |
| **RSVP Tracking** | Public RSVP link, plus-one count, guest note, admin override |
| **Attendance** | QR scan check-in at door, manual entry fallback, auto-confirms RSVP |
| **Reports** | Funnel analytics, per-event breakdown, CSV/JSON export |
| **Security** | JWT auth, bcrypt passwords, rate limiting, Helmet, input validation |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, React Query, Zustand, React Hook Form, Recharts |
| Backend | Node.js 20, Express 4 |
| Database | PostgreSQL 15 |
| Cache | Redis 7 |
| Storage | AWS S3 (Cloudinary compatible) |
| SMS | Africa's Talking, Twilio |
| QR | `qrcode` npm package (server), `qrcode.react` (client) |
| Images | `canvas` (Node.js) for card generation |
| Auth | JSON Web Tokens (JWT) |
| Deploy | Docker Compose + Nginx |

---

## Project Structure

```
inviteflow/
├── backend/
│   ├── src/
│   │   ├── server.js              # Express entry point
│   │   ├── config/
│   │   │   └── database.js        # PostgreSQL pool
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── events.controller.js
│   │   │   ├── guests.controller.js
│   │   │   ├── invitations.controller.js
│   │   │   ├── qr.controller.js
│   │   │   ├── rsvp.controller.js
│   │   │   ├── cards.controller.js
│   │   │   └── reports.controller.js
│   │   ├── routes/                # Express routers
│   │   ├── middleware/
│   │   │   ├── auth.js            # JWT verify
│   │   │   └── upload.js          # Multer config
│   │   ├── services/
│   │   │   ├── sms.service.js     # Africa's Talking + Twilio
│   │   │   └── storage.service.js # S3 upload
│   │   └── utils/
│   │       └── logger.js          # Winston
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # Router, protected routes
│   │   ├── index.js
│   │   ├── services/
│   │   │   └── api.js             # All API calls
│   │   ├── store/
│   │   │   └── auth.store.js      # Zustand auth state
│   │   ├── components/
│   │   │   └── Layout.jsx         # Sidebar + topbar
│   │   └── pages/
│   │       ├── LoginPage.jsx
│   │       ├── DashboardPage.jsx
│   │       ├── EventsPage.jsx
│   │       ├── GuestsPage.jsx
│   │       ├── CardDesignerPage.jsx
│   │       ├── QRCodesPage.jsx
│   │       ├── SendPage.jsx
│   │       ├── RSVPTrackPage.jsx
│   │       ├── ReportsPage.jsx
│   │       ├── VerifyPage.jsx     # Public QR result
│   │       └── RSVPPublicPage.jsx # Public RSVP form
│   ├── Dockerfile
│   └── package.json
│
├── database/
│   └── schema.sql                 # Full PostgreSQL schema
│
├── deployment/
│   └── nginx.conf                 # Nginx reverse proxy config
│
├── docs/
│   ├── API_REFERENCE.md
│   └── DEPLOYMENT_GUIDE.md
│
├── docker-compose.yml
└── README.md
```

---

## Quick Start

```bash
# 1. Install dependencies
cd backend  && npm install && cd ..
cd frontend && npm install && cd ..

# 2. Configure
cp backend/.env.example backend/.env
# Edit backend/.env (set DB_PASSWORD, JWT_SECRET, AT_API_KEY)

# 3. Setup database
createdb inviteflow
psql inviteflow < database/schema.sql

# 4. Run
cd backend  && npm run dev   # API on :5000
cd frontend && npm start     # UI  on :3000

# Default login: admin / admin123
```

---

## Default Credentials
| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `admin123` |
| **Change immediately in production!** | |

---

## License
MIT — Free to use, modify, and deploy.

## Support
- Documentation: `/docs/`
- API Reference: `/docs/API_REFERENCE.md`
- Deployment: `/docs/DEPLOYMENT_GUIDE.md`
