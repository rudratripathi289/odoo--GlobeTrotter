# GlobeTrotter — Endpoint Details

Request/response contracts, authorization, validation and error handling.
For the flat endpoint list, see [`api_endpoints.md`](./api_endpoints.md).

**Base path:** `/api/v1` · **Auth:** `Authorization: Bearer <JWT>` · **Body:** `application/json`

---

## 1. Conventions

### Pagination

Every list endpoint accepts `?page=1&limit=20`. Default `limit=20`, max `100`.

```json
{
  "data": [ ... ],
  "meta": { "page": 1, "limit": 20, "total": 143, "totalPages": 8 }
}
```

Single-resource responses return the object directly, unwrapped.

### Dates

- Date-only fields (`startDate`, `endDate`, `activityDate`, `expenseDate`) — `"2026-12-10"`
- `startMinute` is an **integer**, minutes after midnight. `600` = 10:00 AM. Range `0–1439`
- Money is a **string** in JSON to avoid float rounding: `"6000.00"`

### Error shape

```json
{
  "error": {
    "code": "STOP_NOT_IN_TRIP",
    "message": "Stop does not belong to this trip",
    "details": []
  }
}
```

| Status | When |
|---|---|
| 400 | Validation failure — malformed body, `startMinute` out of range |
| 401 | Missing / invalid / expired access token |
| 403 | Authenticated but not permitted (not owner, not admin) |
| 404 | Missing, **or** exists but the caller may not know it exists |
| 409 | Conflict — duplicate email, FK `Restrict` violation (Prisma `P2003`) |
| 422 | Semantically invalid — stop dates outside trip range |
| 429 | Rate limited |
| 500 | Unhandled — should never be a Prisma error leaking through |

> **Never 403 a private trip.** Return **404**. A 403 confirms the resource exists, which leaks information.

### Error codes

| Code | Status | Meaning |
|---|---|---|
| `EMAIL_TAKEN` / `USERNAME_TAKEN` | 409 | Registration conflict |
| `INVALID_CREDENTIALS` | 401 | Login failure — never say which field was wrong |
| `TOKEN_INVALID` / `TOKEN_EXPIRED` / `TOKEN_USED` | 400 | Password reset |
| `FILTER_REQUIRED` | 400 | `GET /cities` with no filter |
| `STOP_NOT_IN_TRIP` | 404 | `stop.tripId !== :tripId` |
| `ACTIVITY_NOT_IN_CITY` | 422 | Master activity's city ≠ stop's city |
| `STOP_DATES_OUTSIDE_TRIP` | 422 | Stop range not inside trip range |
| `STOP_DATES_OVERLAP` | 422 | Two stops overlap in time |
| `ACTIVITY_DATE_OUTSIDE_STOP` | 422 | Activity date not inside its stop's range |
| `TRIP_DATES_TOO_NARROW` | 422 | PATCH would orphan existing stops |
| `INCOMPLETE_ORDER` | 400 | Reorder array missing ids |
| `ACTIVITY_NAME_REQUIRED` | 400 | Neither `activityId` nor `customName` |
| `ACTIVITY_NAME_AMBIGUOUS` | 400 | Both `activityId` and `customName` |
| `USER_NOT_FOUND` | 404 | Share target doesn't exist |
| `ALREADY_SHARED` | 409 | Duplicate `TripShare` |
| `IN_USE` | 409 | Master data referenced by trips |

---

## 2. Authorization

### Read access to a trip

| `visibility` | Owner | In `TripShare` | Anyone else |
|---|---|---|---|
| `PRIVATE` | full | 404 | 404 |
| `SHARED` | full | read-only | 404 |
| `PUBLIC` | full | read-only | read via `/community` only |

**Write access is owner-only, always.** The `Permission` enum has one value (`VIEW`); there is no shared-edit path.

### What "read-only" strips

Non-owners never see: `Expense` rows, the owner's `email` and `phone`, or `TripShare` rows. They see trip details, stops, cities, activities and `estimatedCost`.

### Public endpoints

`GET /community/trips` and `GET /community/trips/:tripId` take **no JWT**. Both hard-filter `visibility = PUBLIC`; a non-public id returns 404.

---

## 3. Validation rules

None of these are database constraints. If the service layer skips them, nothing catches them.

| Rule | Failure |
|---|---|
| `trip.endDate >= trip.startDate` | 400 |
| `stop.endDate >= stop.startDate` | 400 |
| Stop range inside trip range | 422 `STOP_DATES_OUTSIDE_TRIP` |
| Stop ranges don't overlap within a trip | 422 `STOP_DATES_OVERLAP` |
| `activityDate` inside its stop's range | 422 `ACTIVITY_DATE_OUTSIDE_STOP` |
| `stop.tripId === :tripId` | 404 `STOP_NOT_IN_TRIP` |
| `activity.cityId === stop.cityId` | 422 `ACTIVITY_NOT_IN_CITY` |
| Exactly one of `activityId` / `customName` | 400 |
| `0 <= startMinute <= 1439` | 400 |
| `expense.stopId` (if set) belongs to `:tripId` | 404 |
| `amount > 0`, `estimatedCost >= 0` | 400 |

**Narrowing trip dates:** if `PATCH /trips/:tripId` would leave stops outside the new range, **reject with 422** and list the offending stop ids. Never silently delete or clamp user data.

---

## 4. Auth endpoints

### `POST /auth/register`

```json
{ "firstName": "Nishkal", "lastName": "Docter", "username": "nishkal",
  "email": "nishkal@gmail.com", "password": "********",
  "phone": "9876543210", "city": "Ahmedabad", "country": "India" }
```

Flow: validate → check email/username uniqueness → hash password (bcrypt, cost ≥ 10) → create `User` with `role = USER` → issue tokens.

**201**
```json
{ "user": { "id": "...", "firstName": "Nishkal", "username": "nishkal",
            "email": "nishkal@gmail.com", "role": "USER", "language": "en" },
  "accessToken": "...", "refreshToken": "..." }
```

`passwordHash` never appears in any response. Duplicate → **409**.

### `POST /auth/login`

```json
{ "email": "nishkal@gmail.com", "password": "********" }
```

Same 200 body as register. Wrong email and wrong password both return the same `401 INVALID_CREDENTIALS` — distinguishing them tells an attacker which emails are registered.

Rate limit: **5 attempts / 15 min / IP**.

### `POST /auth/refresh`

`{ "refreshToken": "..." }` → new access token. Access tokens: 15 min. Refresh: 7 days.

### `POST /auth/logout`

Invalidates the refresh token server-side. With stateless JWTs the access token stays valid until expiry — that's why access tokens are short.

### `POST /auth/forgot-password`

```json
{ "email": "nishkal@gmail.com" }
```

**Always 200**, regardless of whether the user exists:

```json
{ "message": "If that email exists, a reset link has been sent." }
```

Flow: find user → generate a cryptographically random raw token → store **`tokenHash`** → email the **raw** token in the link. The database never holds anything usable.

`expiresAt = now + 1 hour`. Rate limit **3 / hour / email**.

### `POST /auth/reset-password`

```json
{ "token": "raw-token-from-email", "newPassword": "********" }
```

Hash the incoming token → look up by `tokenHash` → verify `expiresAt > now()` and `usedAt IS NULL`.

**Transaction:** update `passwordHash` **and** set `usedAt` together. Split across two writes, a crash between them leaves a reusable token.

---

## 5. User & profile

### `GET /users/me`

Returns `firstName, lastName, username, email, phone, photoUrl, city, country, bio, language, role, createdAt`.

### `PATCH /users/me`

Accepts **only**: `firstName, lastName, phone, photoUrl, city, country, bio, language`.

> Whitelist these fields explicitly. Spreading `req.body` into `prisma.user.update()` lets anyone POST `{"role": "ADMIN"}` and promote themselves. This is the single most common privilege-escalation bug in student projects.

Email and username changes need their own endpoints with uniqueness checks — out of scope for the hackathon.

### `PATCH /users/me/password`

```json
{ "currentPassword": "old", "newPassword": "new" }
```

Verify `currentPassword` before writing. Wrong → **401**.

### `DELETE /users/me`

Requires `{ "password": "..." }`. Cascades: trips → stops → activities → expenses, plus shares, saved destinations, reset tokens.

---

## 6. Saved destinations

### `GET /users/me/saved-destinations`

Returns saved cities with `name, state, country, popularity, costIndex`.

### `POST /users/me/saved-destinations`

`{ "cityId": "..." }` → **201**. Already saved → **409** (`@@unique([userId, cityId])`).

### `DELETE /users/me/saved-destinations/:cityId`

Keyed by `cityId`, not the `SavedDestination.id` — the UI already knows the city id.

---

## 7. Master data (read)

### `GET /countries`

Flat list, `id`, `name`, `code`. Small enough to skip pagination.

### `GET /states?countryId=...`

`countryId` required.

### `GET /cities`

```
?search=manali
&countryId=...
&stateId=...
&sort=popularity|name
&page=&limit=
```

**At least one** of `search`, `countryId`, `stateId` is required → else **400 `FILTER_REQUIRED`**. Without this, the dashboard's first render pulls the entire seed table.

`search` matches **city name OR state name** — so `search=himachal` returns Manali, Shimla and Dharamshala. This is what makes region search work without a separate endpoint.

```json
{ "data": [{ "id": "...", "name": "Manali",
             "state": { "id": "...", "name": "Himachal Pradesh" },
             "country": { "id": "...", "name": "India", "code": "IN" },
             "popularity": 95, "costIndex": 60 }],
  "meta": { ... } }
```

> **Known limitation:** `@@index([name])` is a B-tree, so it only accelerates prefix matches (`manali%`). A leading-wildcard `ILIKE '%anal%'` will sequential-scan. Fine at seed scale; fix with `pg_trgm` + GIN if it matters.

### `GET /cities/:cityId/activities`

```
?search=ski&category=ADVENTURE&minCost=500&maxCost=3000&maxDuration=180&page=&limit=
```

Scoped to the city, so a user planning Manali never sees Delhi activities. Returns `id, name, description, category, defaultCost, durationMin, imageUrl`.

---

## 8. Trips

### `POST /trips`

```json
{ "name": "Himachal Adventure", "description": "...",
  "startDate": "2026-12-10", "endDate": "2026-12-18",
  "budget": "30000.00", "currency": "INR" }
```

Created with `visibility = PRIVATE` and no stops. **201** with the trip object.

### `GET /trips`

```
?status=UPCOMING|ONGOING|COMPLETED&search=&sort=startDate|createdAt&page=&limit=
```

`status` is **derived** from `now()` vs `startDate`/`endDate` — it is not a column. Each card returns `id, name, coverImage, startDate, endDate, visibility, stopCount, totalEstimatedCost`.

### `GET /trips/shared-with-me`

Trips where a `TripShare` row exists for the caller. Same card shape plus `owner: { username, photoUrl }`. Read-only in the UI.

> Register this route **before** `/trips/:tripId` or `"shared-with-me"` gets parsed as a trip id.

### `GET /trips/:tripId`

The screen's main call. Access follows §2.

```json
{
  "id": "...", "name": "Himachal Trip",
  "startDate": "2026-12-10", "endDate": "2026-12-18",
  "budget": "30000.00", "currency": "INR", "visibility": "PRIVATE",
  "owner": { "username": "nishkal", "photoUrl": "..." },
  "stops": [{
    "id": "...", "sequence": 1,
    "city": { "id": "...", "name": "Delhi", "state": "Delhi", "country": "India" },
    "startDate": "2026-12-10", "endDate": "2026-12-11",
    "budget": "5000.00",
    "activities": [ ... ],
    "expenses": [ ... ]
  }],
  "tripLevelExpenses": [ ... ],
  "budgetSummary": { "totalEstimatedCost": "27000.00", "remaining": "3000.00" }
}
```

Non-owners: `expenses`, `tripLevelExpenses` and the owner's contact fields are omitted.

### `PATCH /trips/:tripId`

`name, description, startDate, endDate, budget, currency, coverImage, visibility`.

This is the **only** way to change visibility — there is no separate `/visibility` endpoint. Two write paths to one column is one more place to forget the ownership check.

Narrowing dates past existing stops → **422 `TRIP_DATES_TOO_NARROW`**, with the offending stop ids in `details`.

### `DELETE /trips/:tripId`

Cascades stops → activities, plus expenses and shares. Copies made by other users survive (`copiedFromTripId` is `SetNull`).

---

## 9. Trip stops

### `POST /trips/:tripId/stops`

```json
{ "cityId": "manali-id", "startDate": "2026-12-12",
  "endDate": "2026-12-15", "budget": "10000.00" }
```

`sequence` is assigned server-side as `max(sequence) + 1` for that trip. **Clients never send `sequence`** — it's a server-owned column.

Validates: stop range inside trip range, no overlap with existing stops.

### `GET /trips/:tripId/stops`

Ordered `sequence ASC`. Each stop includes its city and activity count.

### `PUT /trips/:tripId/stops/order`

```json
{ "stopIds": ["stop-B", "stop-A", "stop-C"] }
```

Rules:
1. The array must contain **every** stop of the trip, exactly once → else **400 `INCOMPLETE_ORDER`**
2. All ids must belong to `:tripId` → else **404**
3. Renumber `1..n` in **one transaction**
4. **Dates are not modified**

Why `PUT`: you send the complete ordering, not a delta.

**Why dates aren't touched.** `TripStop.startDate/endDate` are user-owned — set on create, editable via PATCH. If reorder also derived them, the same column would have two sources of truth, and a user who hand-edited Manali's dates would silently lose that edit on the next drag.

If the new order leaves dates non-chronological, that's permitted, and flagged:

```json
{
  "stops": [ ... ],
  "warnings": [{
    "code": "DATES_OUT_OF_SEQUENCE",
    "message": "Stop 1 (Manali, Dec 12) starts after stop 2 (Delhi, Dec 10)."
  }]
}
```

The UI shows a "dates now out of order — adjust?" prompt. The user decides, not the server.

> `sequence` deliberately has **no unique constraint**. Renumbering row-by-row would violate one mid-transaction even though the final state is valid, and Prisma can't declare deferrable constraints.

### `GET /trips/:tripId/stops/:stopId`

One stop with city, dates, budget, activities (grouped by date) and stop-level expenses.

### `PATCH /trips/:tripId/stops/:stopId`

`startDate`, `endDate`, `budget` only.

**Changing the city is not supported.** Activities are city-scoped; swapping the city would orphan every activity on the stop. Delete and re-add instead.

Narrowing dates past existing activities → **422**, with the offending `tripActivityId`s.

### `DELETE /trips/:tripId/stops/:stopId`

Cascades `TripActivity` and any `Expense` carrying that `stopId`. Trip-level expenses (`stopId = null`) survive.

Remaining stops are **not** renumbered. Gaps in `sequence` are harmless — only relative order is read.

---

## 10. Trip activities

> `:tripActivityId` in the path is a **`TripActivity.id`**.
> `activityId` in a POST body is a **master `Activity.id`**.
> Different tables. The path param was renamed from `:activityId` precisely because these were one URL apart and indistinguishable.

### `GET /trips/:tripId/stops/:stopId/activities`

Grouped by `activityDate`, then `sequence ASC` within each day.

```json
{ "days": [{ "date": "2026-12-13",
             "activities": [{ "id": "...", "sequence": 1,
                              "activityId": "skiing-id", "name": "Skiing",
                              "isCustom": false,
                              "startMinute": 600, "durationMin": 120,
                              "estimatedCost": "2000.00" }] }] }
```

`name` resolves to `activity.name` or `customName`, so the frontend doesn't branch.

### `POST` — add from master data

```json
{ "activityId": "skiing-id", "activityDate": "2026-12-13",
  "startMinute": 600, "durationMin": 120 }
```

Server flow:
```
verify stop ∈ trip
      ↓
verify activity.cityId === stop.cityId      → 422 ACTIVITY_NOT_IN_CITY
      ↓
verify activityDate ∈ [stop.startDate, stop.endDate]
      ↓
estimatedCost = body.estimatedCost ?? activity.defaultCost      ← THE SNAPSHOT
      ↓
sequence = max(sequence) + 1 for (stopId, activityDate)
      ↓
create TripActivity
```

**Why the snapshot matters:** if master `Skiing` later goes ₹2,000 → ₹3,500, every past trip's budget would silently rewrite itself. Copying the cost at planning time freezes it — the same reason an invoice stores the price paid, not a link to the current price.

### `POST` — add a custom activity

```json
{ "customName": "Visit cousin", "description": "Evening",
  "activityDate": "2026-12-14", "startMinute": 1080, "estimatedCost": "0.00" }
```

`activityId` stays `NULL`.

- Both `activityId` and `customName` → **400 `ACTIVITY_NAME_AMBIGUOUS`**
- Neither → **400 `ACTIVITY_NAME_REQUIRED`**

The DB `CHECK` constraint is the backstop, not the first line of defence — a constraint violation surfaces as an ugly 500 if the API doesn't check first.

### `PUT .../activities/order`

```json
{ "activityDate": "2026-12-13",
  "tripActivityIds": ["ta-3", "ta-1", "ta-2"] }
```

Scoped to **one day of one stop**. Must list every activity on that date. Renumbers `sequence` in a transaction.

**`startMinute` is never modified.** Display order and clock time are independent — a user who typed 10:00 AM keeps 10:00 AM regardless of where the card sits. If you want a "recalculate times to match order" feature, it must be an explicit separate action the user triggers.

### `PATCH .../activities/:tripActivityId`

`activityDate, startMinute, durationMin, estimatedCost, description, customName`.

**Not `activityId`** — switching which master activity this points at is a different activity. Delete and re-add.

### `DELETE .../activities/:tripActivityId`

Removes the `TripActivity` only. The master `Activity` is untouched and can be added again.

---

## 11. Expenses

Owner-only across the board.

### `POST /trips/:tripId/expenses`

**One** create endpoint. `stopId` is optional in the body:

```json
{ "category": "HOTEL", "description": "Manali Hotel",
  "amount": "6000.00", "expenseDate": "2026-12-12",
  "stopId": "manali-stop-id" }
```

Omit `stopId` for trip-level costs — flights, insurance, visa:

```json
{ "category": "TRANSPORT", "description": "Flight Ahmedabad → Delhi",
  "amount": "4500.00", "expenseDate": "2026-12-10" }
```

When `stopId` is present, verify `stop.tripId === :tripId` → else **404 `STOP_NOT_IN_TRIP`**. Nothing in the database prevents an expense pointing at trip A and a stop of trip B; this check is the only thing standing between you and cross-trip data corruption.

> Two separate endpoints writing one table would mean two places to forget this check. Hence one endpoint.

### `GET /trips/:tripId/expenses`

`?stopId=&category=&page=&limit=`. Passing `stopId=null` returns trip-level expenses only.

### `PATCH` / `DELETE /trips/:tripId/expenses/:expenseId`

Verify the expense belongs to `:tripId` first.

> **`ExpenseCategory` has no `ACTIVITY` member.** Activity costs live in `TripActivity.estimatedCost`. If both were possible the same ₹2,500 would be counted twice and the budget screen would be quietly wrong.

---

## 12. Views

All three follow the §2 read matrix. Non-owners get activity costs but no expense data.

### `GET /trips/:tripId/itinerary`

Trip → stops in `sequence` order → activities grouped by `activityDate` then `sequence`. One call for the whole itinerary screen instead of N calls per stop.

### `GET /trips/:tripId/budget`

```json
{
  "budget": "30000.00", "currency": "INR",
  "activityCost": "7500.00",
  "expenseByCategory": { "TRANSPORT": "5000.00", "HOTEL": "10000.00",
                         "FOOD": "4000.00", "OTHER": "500.00" },
  "totalEstimatedCost": "27000.00",
  "remaining": "3000.00",
  "withinBudget": true,
  "averagePerDay": "3000.00",
  "byStop": [{ "stopId": "...", "city": "Manali", "total": "12500.00",
               "budget": "10000.00", "overBudget": true }],
  "byDay": [{ "date": "2026-12-12", "total": "6500.00" }]
}
```

`totalEstimatedCost = SUM(TripActivity.estimatedCost) + SUM(Expense.amount)`.

Nothing here is stored — it's all computed. There is no budget table and there shouldn't be; a stored total is a cache that will go stale the first time someone edits an expense.

`byDay` drives the over-budget day alerts.

### `GET /trips/:tripId/calendar`

Same data keyed by date instead of by stop:

```json
{ "days": [{ "date": "2026-12-10",
             "stop": { "id": "...", "city": "Delhi" },
             "activities": [ ... ], "expenses": [ ... ],
             "dayTotal": "3200.00" }] }
```

**Optional.** This is `/itinerary` regrouped. If you're short on time, ship `/itinerary` and let the frontend do the regrouping — one fewer endpoint to build, test and keep in sync.

---

## 13. Sharing

Owner-only. Visibility changes go through `PATCH /trips/:tripId`.

### `POST /trips/:tripId/shares`

Share by **identifier**, not UUID:

```json
{ "email": "rahul@gmail.com", "permission": "VIEW" }
```

or `{ "username": "rahul" }`. The server resolves it to a `userId`.

> The draft took a raw `userId`, but **no endpoint anywhere returns another user's id** — the frontend had no way to turn "Rahul" into a UUID. And a public `/users/search` endpoint would expose the whole user list. Exact-match by email or username is enough for the UI and leaks nothing beyond "this address is registered."

Handling:

| Case | Response |
|---|---|
| No such user | 404 `USER_NOT_FOUND` |
| Sharing with yourself | 400 |
| Already shared | 409 `ALREADY_SHARED` |
| Trip is `PRIVATE` | Auto-promote to `SHARED`, and say so in the response |

### `GET /trips/:tripId/shares`

`[{ "userId": "...", "username": "rahul", "photoUrl": "...", "permission": "VIEW", "createdAt": "..." }]`

### `DELETE /trips/:tripId/shares/:userId`

Revokes access. If this was the last share and visibility is `SHARED`, leave it as `SHARED` — don't auto-demote. Silent visibility changes surprise people.

---

## 14. Community

### `GET /community/trips`

**No JWT required.** Hard-filters `visibility = PUBLIC`.

```
?search=&sort=recent|popular&countryId=&page=&limit=
```

`popular` sorts by copy count via `copiedFromTripId`.

Each card: `id, name, coverImage, startDate, endDate, stopCount, cities[], totalEstimatedCost, copyCount, owner: { username, photoUrl }`.

### `GET /community/trips/:tripId`

**No JWT required.** Non-public id → **404**, never 403.

Response **must exclude**: owner `email`, owner `phone`, all `Expense` rows, all `TripShare` rows.
Includes: trip details, stops, cities, dates, activities, per-activity `estimatedCost`.

> Write the exclusion into a dedicated serializer, not an ad-hoc `delete obj.email`. This endpoint is unauthenticated — anything that leaks here leaks to the internet.

### `POST /community/trips/:tripId/copy`

Requires auth.

```
Idempotency-Key: <uuid>          (recommended)
```
```json
{ "name": "My Himachal Trip", "startDate": "2027-01-15" }
```

Both fields optional.

**`startDate` shifts every stop and activity date by the same offset**, preserving durations and inter-stop gaps. Without it the original's dates are kept verbatim — so copying a December 2026 trip in August 2027 produces a trip that is already over. The UI should always send one.

**Transaction:**
```
BEGIN
  create Trip { userId: caller,
                visibility: PRIVATE,          ← always
                copiedFromTripId: original.id,
                dates shifted by offset }
  copy TripStops        (sequence, budget, dates shifted)
  copy TripActivities   (activityId | customName, estimatedCost,
                         sequence, startMinute, activityDate shifted)
  -- Expenses NOT copied
COMMIT
```

**Why copies are always `PRIVATE`:** inheriting `PUBLIC` means one popular itinerary spawns fifty near-identical clones in the community feed within a day.

**Why expenses aren't copied:** they are the original owner's *records*, not the copier's *plan*. Inheriting someone else's ₹6,000 hotel bill as your own budget line is wrong. Activities carry `estimatedCost`, so the copy still has a meaningful budget.
*(Defensible either way. If you do copy them, label them as reference estimates in the UI.)*

**Idempotency:** replaying the same key within 24h returns the original response rather than creating a second trip. Without it, a double-click on a slow connection creates two trips.

**201** `{ "tripId": "...", "message": "Trip copied" }`

The two trips are fully independent afterwards. The original owner deleting an activity does not affect the copy.

---

## 15. Admin

All require `role === ADMIN` → else **403**.

### Users

| Endpoint | Notes |
|---|---|
| `GET /admin/users` | `?search=&role=&page=&limit=` |
| `GET /admin/users/:userId` | Profile + trip count. Never `passwordHash` |
| `PATCH /admin/users/:userId/role` | `{ "role": "ADMIN" }` |
| `DELETE /admin/users/:userId` | Cascades all their data |

Guards: an admin cannot delete their own account, and cannot demote the last remaining admin → **409**.

### Analytics

| Endpoint | Returns |
|---|---|
| `/admin/analytics/overview` | `{ totalUsers, totalTrips, publicTrips, totalActivitiesAdded, totalCopies }` |
| `/admin/analytics/popular-cities` | Cities ranked by `TripStop` count |
| `/admin/analytics/popular-activities` | Activities ranked by `TripActivity` count |
| `/admin/analytics/copied-trips` | Trips ranked by `copiedFromTripId` count |

### Master data CRUD

```
POST / PATCH / DELETE  on  /admin/countries, /admin/states,
                           /admin/cities, /admin/activities
```

**Every DELETE must catch Prisma `P2003`** (`onDelete: Restrict`) and return **409**:

```json
{ "error": { "code": "IN_USE",
             "message": "Cannot delete: 47 trips reference this city." } }
```

Unhandled, this is a raw 500 and looks like a crash mid-demo. Wrap all four in the same error handler.

Deletion of referenced master data is intentionally hard — cities and activities are shared by every trip that points at them. In production this would be a soft delete (`isActive` flag), which the current schema doesn't have. For the hackathon, don't delete referenced rows.

---

## 16. Transactional operations

| Endpoint | Why atomicity is required |
|---|---|
| `PUT /trips/:tripId/stops/order` | Partial renumbering leaves duplicate or missing sequences |
| `PUT .../activities/order` | Same |
| `POST /community/trips/:tripId/copy` | A half-copied trip in "My Trips" is worse than a failed copy |
| `POST /auth/reset-password` | Password update + `usedAt` must commit together, or the token stays reusable |

```js
await prisma.$transaction(async (tx) => {
  // all writes on tx, never on prisma
});
```

---

## 17. Routing rule

Literal segments must be registered **before** parameterised ones, or Express matches the wrong handler:

| Register first | Otherwise swallowed by |
|---|---|
| `/trips/shared-with-me` | `/trips/:tripId` |
| `/trips/:tripId/stops/order` | `/trips/:tripId/stops/:stopId` |
| `.../activities/order` | `.../activities/:tripActivityId` |
| `/users/me` | any future `/users/:userId` |

The draft used `/stops/reorder`, which collided the same way. The rename to `order` doesn't fix ordering by itself — **do both**: register literals first *and* keep the distinct segment name. Relying on registration order alone breaks the moment someone adds a route in the wrong place.
