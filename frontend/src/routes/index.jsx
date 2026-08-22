import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-bold text-gray-900">Welcome to your App!</h2>
      <p className="text-gray-600">Start building your UI components here.</p>
    </div>
  )
}
