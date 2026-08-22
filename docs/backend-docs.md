# Backend Documentation

## Tech Stack
- **Runtime:** Node.js (ES Modules)
- **Framework:** Express.js
- **ORM:** Prisma
- **Database:** PostgreSQL (NeonDB)

## Folder Structure (`backend/src`)
- `app.js` - Express application setup (Middlewares, routes, error handling).
- `server.js` - Application entry point (Server listener, DB connection, graceful shutdown).
- `controllers/` - Route handlers and business logic.
- `middlewares/` - Express middlewares (Auth, validation, etc.).
- `routes/` - Express route definitions.
- `services/` - Database interaction and complex business logic.
- `utils/` - Helper functions and utilities.

## Database setup
We use Prisma ORM. Ensure you have the `DATABASE_URL` configured in your `.env` file with `pgbouncer=true` if using a Neon pooled connection.

Run `npm run prisma:generate` to build the client after making schema changes.
