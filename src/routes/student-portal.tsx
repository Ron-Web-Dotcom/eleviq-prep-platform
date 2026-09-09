import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/student-portal')({
  beforeLoad: () => {
    throw redirect({ to: '/app' })
  },
})
