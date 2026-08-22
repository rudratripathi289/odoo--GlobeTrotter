# GlobeTrotter — API Endpoints

Quick reference index. For request/response bodies, validation rules and error codes, see [`endpoint_details.md`](./endpoint_details.md).

**Base path:** `/api/v1`
**Auth header:** `Authorization: Bearer <JWT>`

**Auth column:** `—` public · `USER` any logged-in user · `OWNER` trip owner only · `ADMIN` admin role

---

## Auth

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/register` | — | Create account, return tokens |
| POST | `/auth/login` | — | Log in, return tokens |
| POST | `/auth/refresh` | — | Exchange refresh token for a new access token |
| POST | `/auth/logout` | USER | Invalidate refresh token |
| POST | `/auth/forgot-password` | — | Send reset link (always 200) |
| POST | `/auth/reset-password` | — | Consume reset token, set new password |

## User & profile

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/users/me` | USER | Current profile |
| PATCH | `/users/me` | USER | Update profile fields |
| PATCH | `/users/me/password` | USER | Change password while logged in |
| DELETE | `/users/me` | USER | Delete account (cascades) |

## Saved destinations

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/users/me/saved-destinations` | USER | Wishlist cities |
| POST | `/users/me/saved-destinations` | USER | Save a city |
| DELETE | `/users/me/saved-destinations/:cityId` | USER | Unsave a city |

## Master data (read)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/countries` | USER | All countries |
| GET | `/states` | USER | States, filtered by `countryId` |
| GET | `/cities` | USER | City search — **requires** `search`, `countryId` or `stateId` |
| GET | `/cities/:cityId` | USER | One city with metadata |
| GET | `/cities/:cityId/activities` | USER | Activity search within a city |

## Trips

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/trips` | USER | Create trip (always `PRIVATE`) |
| GET | `/trips` | USER | My trips |
| GET | `/trips/shared-with-me` | USER | Trips others shared with me |
| GET | `/trips/:tripId` | see details | Full trip overview |
| PATCH | `/trips/:tripId` | OWNER | Update trip, **including `visibility`** |
| DELETE | `/trips/:tripId` | OWNER | Delete trip (cascades) |

## Trip stops

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/trips/:tripId/stops` | OWNER | Add a city to the trip |
| GET | `/trips/:tripId/stops` | see details | Stops ordered by `sequence` |
| PUT | `/trips/:tripId/stops/order` | OWNER | Reorder stops (sequence only) |
| GET | `/trips/:tripId/stops/:stopId` | see details | One stop with activities & expenses |
| PATCH | `/trips/:tripId/stops/:stopId` | OWNER | Update dates / budget |
| DELETE | `/trips/:tripId/stops/:stopId` | OWNER | Remove stop (cascades) |

## Trip activities

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/trips/:tripId/stops/:stopId/activities` | see details | Activities on this stop |
| POST | `/trips/:tripId/stops/:stopId/activities` | OWNER | Add master or custom activity |
| PUT | `/trips/:tripId/stops/:stopId/activities/order` | OWNER | Reorder within one day |
| PATCH | `/trips/:tripId/stops/:stopId/activities/:tripActivityId` | OWNER | Update date / time / cost |
| DELETE | `/trips/:tripId/stops/:stopId/activities/:tripActivityId` | OWNER | Remove from itinerary |

## Expenses

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/trips/:tripId/expenses` | OWNER | All expenses |
| POST | `/trips/:tripId/expenses` | OWNER | Create — `stopId` optional in body |
| PATCH | `/trips/:tripId/expenses/:expenseId` | OWNER | Update expense |
| DELETE | `/trips/:tripId/expenses/:expenseId` | OWNER | Delete expense |

## Views

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/trips/:tripId/itinerary` | see details | Stop-grouped plan (primary view endpoint) |
| GET | `/trips/:tripId/budget` | see details | Cost breakdown & over-budget flags |
| GET | `/trips/:tripId/calendar` | see details | Date-grouped plan |

## Sharing

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/trips/:tripId/shares` | OWNER | Who has access |
| POST | `/trips/:tripId/shares` | OWNER | Share by `email` or `username` |
| DELETE | `/trips/:tripId/shares/:userId` | OWNER | Revoke access |

## Community

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/community/trips` | — | Public trip feed |
| GET | `/community/trips/:tripId` | — | Public trip detail (no expenses, no owner PII) |
| POST | `/community/trips/:tripId/copy` | USER | Copy into my account (always `PRIVATE`) |

## Admin — users

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/admin/users` | ADMIN | List users |
| GET | `/admin/users/:userId` | ADMIN | User detail |
| PATCH | `/admin/users/:userId/role` | ADMIN | Promote / demote |
| DELETE | `/admin/users/:userId` | ADMIN | Delete user |

## Admin — analytics

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/admin/analytics/overview` | ADMIN | Totals: users, trips, public trips, activities |
| GET | `/admin/analytics/popular-cities` | ADMIN | Cities by `TripStop` count |
| GET | `/admin/analytics/popular-activities` | ADMIN | Activities by `TripActivity` count |
| GET | `/admin/analytics/copied-trips` | ADMIN | Trips by `copiedFromTripId` count |

## Admin — master data

| Method | Path | Auth |
|---|---|---|
| POST / PATCH / DELETE | `/admin/countries` · `/admin/countries/:id` | ADMIN |
| POST / PATCH / DELETE | `/admin/states` · `/admin/states/:id` | ADMIN |
| POST / PATCH / DELETE | `/admin/cities` · `/admin/cities/:id` | ADMIN |
| POST / PATCH / DELETE | `/admin/activities` · `/admin/activities/:id` | ADMIN |

All master-data `DELETE`s can hit `onDelete: Restrict` → must return **409**, not 500.

---

## Routing rule (important)

Literal segments must be registered **before** parameterised ones in every router file, or they will be swallowed:

| Register first | Would otherwise be captured by |
|---|---|
| `/trips/shared-with-me` | `/trips/:tripId` |
| `/trips/:tripId/stops/order` | `/trips/:tripId/stops/:stopId` |
| `.../activities/order` | `.../activities/:tripActivityId` |
| `/users/me` | any `/users/:userId` added later |

---

## Transactional endpoints

These write multiple rows and must run in one transaction:

- `PUT /trips/:tripId/stops/order`
- `PUT /trips/:tripId/stops/:stopId/activities/order`
- `POST /community/trips/:tripId/copy`
- `POST /auth/reset-password`

---

## Build order (demo path)

```
POST  /auth/register
POST  /trips
GET   /cities?search=manali
POST  /trips/:id/stops
GET   /cities/:cityId/activities
POST  /trips/:id/stops/:stopId/activities
POST  /trips/:id/expenses
GET   /trips/:id/budget
GET   /trips/:id/itinerary
PUT   /trips/:id/stops/order
PATCH /trips/:id                      → visibility: PUBLIC
GET   /community/trips
POST  /community/trips/:id/copy
```

Everything outside this chain is secondary.
