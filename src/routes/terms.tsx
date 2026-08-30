import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowLeft, BookOpenCheck } from 'lucide-react'

export const Route = createFileRoute('/terms')({
  head: () => ({ meta: [
    { title: 'Terms of Service · ELEVIQ Prep' },
    { name: 'description', content: 'Review the terms that apply when using the ELEVIQ Prep website, tutoring inquiries, and study resources.' },
  ] }),
  component: TermsPage,
})

function TermsPage() {
  return (
    <main className="min-h-dvh bg-background">
      <header className="border-b border-border bg-[#e6f1fe] px-6 py-6 lg:px-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Link to="/" className="font-serif text-xl font-bold text-[#031976]">ELEVIQ <span className="text-[#164bd8]">Prep</span></Link>
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-[#031976] transition-transform hover:-translate-x-1"><ArrowLeft className="h-4 w-4" /> Back home</Link>
        </div>
      </header>
      <article className="mx-auto max-w-5xl px-6 py-16 lg:px-10 lg:py-24">
        <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-accent"><BookOpenCheck className="h-4 w-4" /> Terms & expectations</div>
        <h1 className="mt-5 max-w-3xl font-serif text-5xl font-bold leading-tight tracking-[-0.04em] text-primary sm:text-6xl">Terms of Service</h1>
        <p className="mt-5 text-sm text-muted-foreground">Last updated: August 29, 2026</p>
        <div className="mt-12 max-w-3xl space-y-10 text-base leading-8 text-muted-foreground">
          <section><h2 className="font-serif text-2xl font-bold text-primary">Using ELEVIQ Prep</h2><p className="mt-3">ELEVIQ Prep provides educational information, tutoring inquiries, practice support, and study resources for healthcare students. By using this website, you agree to use it lawfully and respectfully.</p></section>
          <section><h2 className="font-serif text-2xl font-bold text-primary">Educational disclaimer</h2><p className="mt-3">Our tutoring, workbooks, practice materials, and readiness indicators are educational support. They are not a guarantee of exam results, licensure, employment, or admission, and they do not replace official course instruction, clinical supervision, or exam-provider requirements.</p></section>
          <section><h2 className="font-serif text-2xl font-bold text-primary">Tutoring and purchases</h2><p className="mt-3">Tutoring availability, pricing, scheduling, and package details are confirmed during the enrollment process. Workbook purchases made through Amazon are subject to Amazon’s terms, checkout process, shipping policies, and return policies.</p></section>
          <section><h2 className="font-serif text-2xl font-bold text-primary">Website content</h2><p className="mt-3">We work to keep our information accurate and useful, but educational content may change and is provided without a promise that it is complete or current for every exam or jurisdiction. Please confirm requirements with the relevant school, employer, or certification organization.</p></section>
          <section><h2 className="font-serif text-2xl font-bold text-primary">Contact</h2><p className="mt-3">Questions about these terms can be sent to <a href="mailto:info@eleviqprep.com" className="font-bold text-primary underline decoration-accent decoration-2 underline-offset-4">info@eleviqprep.com</a>. This page is a general starting point and should be reviewed by qualified legal counsel before publication as final terms.</p></section>
        </div>
      </article>
    </main>
  )
}
