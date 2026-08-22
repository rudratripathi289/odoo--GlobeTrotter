import { createRootRoute, Outlet, Link } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="p-4 flex gap-4 bg-white shadow-sm border-b">
        <h1 className="text-xl font-bold text-gray-800 mr-4">App</h1>
        <Link to="/" className="[&.active]:font-bold text-blue-600 hover:underline">
          Home
        </Link>
      </header>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  ),
})
