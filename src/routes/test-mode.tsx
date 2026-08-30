import { createFileRoute } from '@tanstack/react-router'
import { TestModeWorkspace } from '@/components/TestModeWorkspace'

export const Route = createFileRoute('/test-mode')({
  head: () => ({ meta: [
    { title: 'ELEVIQ Test Mode · Computerized Exam Practice' },
    { name: 'description', content: 'Original ELEVIQ computerized nursing-exam practice with pacing, flagging, SATA, case studies, Bow-Tie interactions, results, and remediation.' },
  ] }),
  component: TestModePage,
})

function TestModePage() {
  return <main className="min-h-dvh bg-background px-3 py-6 sm:px-6 sm:py-10"><div className="mx-auto mb-6 max-w-6xl"><a href="/" className="text-sm font-bold text-primary transition-colors hover:text-accent">← ELEVIQ Prep</a></div><TestModeWorkspace /></main>
}
