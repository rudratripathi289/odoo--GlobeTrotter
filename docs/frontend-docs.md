# Frontend Documentation

## Tech Stack
- **Framework:** React (Vite)
- **Styling:** Tailwind CSS v4
- **Routing:** TanStack Router (File-based)
- **State Management (Client):** Zustand
- **State Management (Server):** React Query
- **HTTP Client:** Axios

## Folder Structure (`frontend/src`)
- `components/` - Reusable UI elements (common and specialized).
- `hooks/` - Custom React hooks.
- `lib/` - Third-party library initializations (e.g., Axios).
- `routes/` - File-based routes for TanStack Router.
- `services/` - API interaction logic.
- `store/` - Zustand global state stores.

## Routing
We use TanStack Router. New pages should be added to the `src/routes/` directory. The routing tree is automatically generated into `routeTree.gen.ts` when the dev server is running.
