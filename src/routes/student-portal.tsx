import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/student-portal')({
  // Preserve the route only to close the URL, never to render a portal.
  beforeLoad: () => {
    throw redirect({ to: '/' })
  },
})
