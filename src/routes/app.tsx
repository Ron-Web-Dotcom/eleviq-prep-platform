import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { AuthGate } from '@/components/AuthGate'
import { SharedAppLayout } from '@/layouts/shared-app-layout'

/**
 * App shell layout — mounted at the REAL `/app` segment (not a pathless `_app`).
 *
 * The former private workspace is intentionally disabled. The route remains as a
 * redirect target so old bookmarks and hand-entered URLs cannot reveal protected
 * content. The public homepage is the only destination.
 *
 * Auth-gate the whole shell by wrapping <Outlet /> in your auth check here — one
 * place, not per page. Browser-only state (blink.auth, localStorage, window) must
 * sit inside <BlinkClientBoundary> (wrap the whole shell if the entire app is
 * browser-only). Do NOT use the route's `ssr: false` — a client-only route in this
 * TanStack Start template hits Start's server-context `node:async_hooks` path (a
 * throwing browser stub) and ships a BLANK preview ("AsyncLocalStorage is not a
 * constructor").
 */
export const Route = createFileRoute('/app')({
  beforeLoad: () => {
    throw redirect({ to: '/' })
  },
  component: AppLayout,
})

function AppLayout() {
  return (
    <AuthGate>
      <SharedAppLayout appName="ELEVIQ Student Portal">
        <Outlet />
      </SharedAppLayout>
    </AuthGate>
  )
}
