# Backend Documentation — GlobeTrotter

## Tech Stack & Planned Dependencies
- **Runtime:** Node.js (ES Modules)
- **Framework:** Express.js
- **ORM:** Prisma (PostgreSQL / NeonDB)
- **Authentication & Security:** `jsonwebtoken`, `bcrypt`, `zod`, `helmet`, `cors`
- **Utilities & Middleware:** `morgan`, `compression`, `cookie-parser`
- **Cloud & Realtime (Upcoming):** `cloudinary`, `multer`, `resend`, `socket.io`, `@upstash/redis`

---

## Folder Structure (`backend/src`)
```text
backend/
├── prisma/
│   └── schema.prisma       (GlobeTrotter Schema: User, Country, State, City, Trip, TripStop, Activity, TripActivity, Expense, TripShare, SavedDestination, PasswordResetToken)
└── src/
    ├── app.js              (Express app setup, global middleware, /api/v1 router mount)
    ├── server.js           (Server listener, DB connection check, graceful shutdown)
    ├── controllers/        (Route handlers & business logic - to be implemented)
    ├── middlewares/        (Auth, validation, rate limiting - to be implemented)
    ├── routes/
    │   ├── index.js        (Master Router combining all modules)
    │   ├── auth.routes.js     (POST /register, /login, /refresh, /logout, /forgot-password, /reset-password)
    │   ├── user.routes.js     (GET/PATCH/DELETE /me, /me/saved-destinations)
    │   ├── master.routes.js   (GET /countries, /states, /cities, /cities/:id/activities)
    │   ├── trip.routes.js     (GET/POST/PATCH/DELETE /trips, stops, activities, expenses, views, shares)
    │   ├── community.routes.js(GET /community/trips, POST /copy)
    │   └── admin.routes.js    (Users management, analytics, master data management)
    ├── services/           (DB queries & core business logic - to be implemented)
    └── utils/              (Helper functions & custom error classes - to be implemented)
```

---

## API Base Path & Conventions
- **Base URL:** `/api/v1`
- **Content-Type:** `application/json`
- **Auth Header:** `Authorization: Bearer <JWT>`

### Routing Rules Enforced:
1. Literal segments (e.g. `PUT /stops/order`, `GET /trips/shared-with-me`, `GET /users/me`) are registered **before** parameterized segments (e.g. `/:stopId`, `/:tripId`).
2. Public endpoints (`/community/trips`) omit sensitive owner info (email, phone) and expense details.

---

## Database Schema (Prisma)
The database models are defined in `prisma/schema.prisma`:
- **Core Enums:** `UserRole`, `Visibility`, `Permission`, `ActivityCategory`, `ExpenseCategory`
- **Models:** `User`, `Country`, `State`, `City`, `Trip`, `TripStop`, `Activity`, `TripActivity`, `Expense`, `TripShare`, `SavedDestination`, `PasswordResetToken`

*Note: Run `npx prisma generate` once your `.env` contains a valid NeonDB connection string.*
