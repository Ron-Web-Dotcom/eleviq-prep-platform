import { createFileRoute } from '@tanstack/react-router'
import { TestModeWorkspace } from '@/components/TestModeWorkspace'

export const Route = createFileRoute('/app/test-mode')({
  head: () => ({ meta: [
    { title: 'ELEVIQ Test Mode · Student Portal' },
    { name: 'description', content: 'Practice computerized nursing-exam navigation, clinical judgment, case studies, SATA, and Bow-Tie interactions in ELEVIQ Test Mode.' },
  ] }),
  component: TestModePage,
})

function TestModePage() {
  return <div className="min-h-full px-3 py-5 sm:px-6 sm:py-8"><TestModeWorkspace /></div>
}
