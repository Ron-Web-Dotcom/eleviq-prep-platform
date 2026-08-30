import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowLeft, ShieldCheck } from 'lucide-react'

export const Route = createFileRoute('/privacy')({
  head: () => ({ meta: [
    { title: 'Privacy Policy · ELEVIQ Prep' },
    { name: 'description', content: 'Learn how ELEVIQ Prep collects, uses, and protects information submitted through our website.' },
  ] }),
  component: PrivacyPage,
})

function PrivacyPage() {
  return (
    <main className="min-h-dvh bg-background">
      <header className="border-b border-border bg-[#e6f1fe] px-6 py-6 lg:px-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Link to="/" className="font-serif text-xl font-bold text-[#031976]">ELEVIQ <span className="text-[#164bd8]">Prep</span></Link>
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-[#031976] transition-transform hover:-translate-x-1"><ArrowLeft className="h-4 w-4" /> Back home</Link>
        </div>
      </header>
      <article className="mx-auto max-w-5xl px-6 py-16 lg:px-10 lg:py-24">
        <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-accent"><ShieldCheck className="h-4 w-4" /> Privacy & care</div>
        <h1 className="mt-5 max-w-3xl font-serif text-5xl font-bold leading-tight tracking-[-0.04em] text-primary sm:text-6xl">Privacy Policy</h1>
        <p className="mt-5 text-sm text-muted-foreground">Last updated: August 29, 2026</p>
        <div className="mt-12 max-w-3xl space-y-10 text-base leading-8 text-muted-foreground">
          <section><h2 className="font-serif text-2xl font-bold text-primary">Information we collect</h2><p className="mt-3">When you contact ELEVIQ Prep, we may collect your name, email address, phone number, program interest, and the details you choose to include in your message. We also receive basic technical information needed to keep the website secure and functioning.</p></section>
          <section><h2 className="font-serif text-2xl font-bold text-primary">How we use information</h2><p className="mt-3">We use submitted information to respond to inquiries, discuss tutoring or study resources, provide requested support, improve our website, and maintain business records. We do not sell your personal information.</p></section>
          <section><h2 className="font-serif text-2xl font-bold text-primary">Sharing and service providers</h2><p className="mt-3">We may use trusted service providers to operate our website, store inquiry records, deliver email, and provide sign-in or learning-platform functionality. Those providers may process information only as needed to provide their services.</p></section>
          <section><h2 className="font-serif text-2xl font-bold text-primary">Your choices</h2><p className="mt-3">You may ask us to update or delete information you previously submitted, or ask questions about how it is used, by emailing <a href="mailto:info@eleviqprep.com" className="font-bold text-primary underline decoration-accent decoration-2 underline-offset-4">info@eleviqprep.com</a>.</p></section>
          <section><h2 className="font-serif text-2xl font-bold text-primary">Contact</h2><p className="mt-3">For privacy questions, contact ELEVIQ Prep at info@eleviqprep.com. This page provides general website information and should be reviewed by qualified legal counsel before publication as a final legal policy.</p></section>
        </div>
      </article>
    </main>
  )
}
