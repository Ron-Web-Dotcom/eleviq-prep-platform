import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight, ArrowUpRight, BookOpen, BrainCircuit, Check, Clock3, Menu, ShieldCheck, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import { blink } from '@/blink/client'

const phlebotomyAmazonUrl = 'https://a.co/d/00ecVDmr'
const cnaAmazonUrl = 'https://a.co/d/00uklbhc'

interface LeadForm {
  name: string
  email: string
  phone: string
  programInterest: string
  message: string
}

const pnHesiPackages = [
  { name: 'Bootcamp Lite', price: '$600', detail: 'Consistent structure, guidance, accountability, and focused exam preparation.', features: ['Personalized study plan', '1-on-1 tutoring 3 days per week', 'HESI-style practice questions', 'Study materials', 'Weekly assignments', 'Progress tracking', 'Test-taking strategies'] },
  { name: 'Core Bootcamp', price: '$800', detail: 'Additional remediation, accountability, and focused preparation for the PN HESI Exit Exam.', features: ['Everything in Lite', 'Weak-area remediation', 'Weekly assessments', 'NGN case studies', 'Pharmacology review', 'Dosage calculations', 'Prioritization and clinical judgment', 'SATA practice', 'Individual performance analysis', 'Mock-exam preparation'] },
]

const reviews = [
  { name: 'Monica R.', role: 'Phlebotomy student', quote: 'ELEVIQ gave me a study plan I could actually follow. The tutoring sessions made the hard topics feel manageable.', rating: 5 },
  { name: 'James T.', role: 'CNA student', quote: 'The practice questions showed me exactly where I needed to improve instead of making me guess what to study next.', rating: 5 },
  { name: 'Aaliyah S.', role: 'LPN student', quote: 'I bought the workbook for my final stretch and loved how clear and focused every chapter felt.', rating: 5 },
]

const workbooks = [
  { name: 'Phlebotomy Workbook', eyebrow: 'Specimen collection · safety · skills', detail: 'Focused review for building confidence before class, clinical practice, and certification testing.', url: phlebotomyAmazonUrl, featured: true },
  { name: 'CNA Workbook', eyebrow: 'Patient care · procedures · readiness', detail: 'A clear companion for reviewing core nursing assistant knowledge and test-day priorities.', url: cnaAmazonUrl, featured: false },
]

export const Route = createFileRoute('/')({
  head: () => ({ meta: [
    { title: 'ELEVIQ Prep · CNA, LPN & Phlebotomy Bootcamps' },
    { name: 'description', content: 'Personalized Phlebotomy, CNA, and LPN tutoring through expert instruction, practice testing, workbooks, and actionable readiness insights.' },
    { property: 'og:title', content: 'ELEVIQ Prep · Phlebotomy, CNA & LPN tutoring' },
    { property: 'og:description', content: 'Expert-led Phlebotomy, CNA, and LPN preparation with tutoring and focused workbooks.' },
  ]}),
  component: Home,
})

function ContactDialog({ initialProgram, onClose }: { initialProgram?: string; onClose: () => void }) {
  const [form, setForm] = useState<LeadForm>({ name: '', email: '', phone: '', programInterest: initialProgram ?? '', message: '' })
  const [saving, setSaving] = useState(false)

  const update = (field: keyof LeadForm, value: string) => setForm(current => ({ ...current, [field]: value }))
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    try {
      await blink.functions.invoke('api/contact', {
        body: {
          name: form.name,
          email: form.email,
          phone: form.phone,
          programInterest: form.programInterest,
          message: form.message,
        },
      })
      toast.success('Thanks — your inquiry was sent.', { description: 'Your message went directly to the ELEVIQ team.' })
      onClose()
    } catch (error) {
      toast.error('We could not send your inquiry.', { description: error instanceof Error ? error.message : 'Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 p-4" role="presentation" onMouseDown={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-lg" role="dialog" aria-modal="true" aria-labelledby="contact-title" onMouseDown={event => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Start a conversation</p><h2 id="contact-title" className="mt-2 font-serif text-3xl font-bold text-primary">Build your next study plan.</h2></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-primary" aria-label="Close contact form"><X className="h-5 w-5" /></button></div>
        <form className="mt-6 space-y-4" onSubmit={submit}><label className="block text-sm font-semibold text-primary">Name<input required value={form.name} onChange={event => update('name', event.target.value)} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring" /></label><label className="block text-sm font-semibold text-primary">Email<input required type="email" value={form.email} onChange={event => update('email', event.target.value)} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold text-primary">Phone<input value={form.phone} onChange={event => update('phone', event.target.value)} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring" /></label><label className="block text-sm font-semibold text-primary">Program<select value={form.programInterest} onChange={event => update('programInterest', event.target.value)} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring"><option value="">Choose one</option>{pnHesiPackages.map(pkg => <option key={pkg.name}>PN HESI {pkg.name}</option>)}</select></label></div><label className="block text-sm font-semibold text-primary">How can we help?<textarea rows={4} value={form.message} onChange={event => update('message', event.target.value)} className="mt-1.5 w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring" /></label><button disabled={saving} className="w-full rounded-lg bg-primary px-4 py-3 font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60">{saving ? 'Sending…' : 'Send inquiry'}</button></form>
      </div>
    </div>
  )
}

function Home() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [selectedProgram, setSelectedProgram] = useState<string>()
  const openContact = (program?: string) => { setSelectedProgram(program); setContactOpen(true) }
  const showComingSoon = (label: string) => toast.info(`${label} is coming soon.`, { description: 'Contact ELEVIQ and we will help you get started.' })
  const scrollToSection = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <main className="min-h-dvh overflow-hidden bg-background">
      <nav className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between border-b border-primary/10 px-5 py-4 lg:border-0 lg:px-10 lg:py-6">
        <Link to="/" className="group flex shrink-0 items-center" aria-label="ELEVIQ Prep home">
          <img src="/brand/eleviq-logo.png" alt="ELEVIQ Prep" className="h-12 w-36 object-contain object-center transition-transform duration-200 group-hover:-translate-y-0.5 sm:h-14 sm:w-44" />
        </Link>
        <div className="hidden items-center gap-1.5 rounded-full border border-primary/10 bg-card/85 p-1.5 shadow-md backdrop-blur md:flex">
          <button type="button" onClick={() => scrollToSection('method')} className="rounded-full px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary hover:text-primary active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Our method</button><button type="button" onClick={() => scrollToSection('pn-hesi')} className="rounded-full px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary hover:text-primary active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">PN HESI</button><button type="button" onClick={() => scrollToSection('books')} className="rounded-full px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary hover:text-primary active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Study shop</button><button type="button" onClick={() => scrollToSection('faq')} className="rounded-full px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary hover:text-primary active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">FAQ</button>
        </div>
        <div className="hidden items-center gap-2 md:flex"><Link to="/login" search={{ next: '/app' }} className="rounded-full px-4 py-3 text-sm font-bold text-primary transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Student login</Link><button type="button" onClick={() => openContact()} className="group inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Start preparing <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" /></button></div>
        <button className="flex h-12 items-center gap-2 rounded-full border border-primary/15 bg-card px-4 text-primary shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary hover:shadow-lg active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}>{menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}<span className="text-[10px] font-bold uppercase tracking-[0.16em]">{menuOpen ? 'Close' : 'Menu'}</span></button>
      </nav>
      {menuOpen && <div className="mx-5 mt-2 animate-fade-in space-y-1.5 rounded-2xl border border-primary/10 bg-card p-3 shadow-xl md:hidden"><div className="flex items-center justify-between border-b border-border px-4 pb-3"><span className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Explore ELEVIQ</span><span className="font-mono text-[10px] font-bold tracking-[0.16em] text-muted-foreground">MENU</span></div><button type="button" className="group flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-left font-semibold text-primary transition-all hover:bg-secondary" onClick={() => { setMenuOpen(false); scrollToSection('method') }}>Our method <ArrowRight className="h-4 w-4 opacity-50 transition-transform group-hover:translate-x-1" /></button><button type="button" className="group flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-left font-semibold text-primary transition-all hover:bg-secondary" onClick={() => { setMenuOpen(false); scrollToSection('pn-hesi') }}>Bootcamps <ArrowRight className="h-4 w-4 opacity-50 transition-transform group-hover:translate-x-1" /></button><button type="button" className="group flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-left font-semibold text-primary transition-all hover:bg-secondary" onClick={() => { setMenuOpen(false); scrollToSection('pn-hesi') }}>PN HESI Exit <ArrowRight className="h-4 w-4 opacity-50 transition-transform group-hover:translate-x-1" /></button><button type="button" className="group flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-left font-semibold text-primary transition-all hover:bg-secondary" onClick={() => { setMenuOpen(false); scrollToSection('books') }}>Study shop <ArrowRight className="h-4 w-4 opacity-50 transition-transform group-hover:translate-x-1" /></button><Link to="/login" onClick={() => setMenuOpen(false)} className="flex w-full items-center rounded-xl px-4 py-3.5 text-left font-semibold text-primary transition-all hover:bg-secondary">Student login</Link><button type="button" onClick={() => { setMenuOpen(false); openContact() }} className="mt-2 flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3.5 font-bold text-primary-foreground shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-98">Start preparing <ArrowRight className="ml-2 h-4 w-4" /></button></div>}

      <section className="relative mx-auto grid max-w-7xl items-center gap-14 px-6 pb-24 pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:px-10 lg:pb-32 lg:pt-20">
        <div className="relative z-10 animate-fade-in"><p className="mb-6 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary"><span className="h-2 w-2 rounded-full bg-accent" /> Built for your next healthcare career</p><h1 className="max-w-3xl font-serif text-5xl font-bold leading-[1.02] tracking-[-0.04em] text-primary sm:text-7xl">Your next chapter starts with <span className="italic text-accent">a plan.</span></h1><p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground">ELEVIQ brings expert 1-on-1 tutoring, original practice, and performance insight into one clear path for your PN HESI Exit Exam preparation.</p><div className="mt-9 flex flex-wrap items-center gap-4"><button type="button" onClick={() => scrollToSection('pn-hesi')} className="group inline-flex items-center gap-3 rounded-full bg-primary px-6 py-3.5 font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:-translate-y-1 hover:shadow-xl active:translate-y-0">Explore bootcamps <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></button><button type="button" onClick={() => scrollToSection('method')} className="group inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/70 px-6 py-3.5 font-bold text-primary transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-secondary active:translate-y-0">See how it works <ArrowRight className="h-4 w-4 opacity-60 transition-transform group-hover:translate-x-1" /></button></div><div className="mt-12 flex flex-wrap gap-x-7 gap-y-3 text-sm font-semibold text-muted-foreground"><span className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" /> 1-on-1 support</span><span className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" /> Skills-focused practice</span><span className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" /> No guesswork</span></div></div>
        <div className="relative min-h-[460px] lg:min-h-[550px]"><div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-secondary blur-3xl" /><div className="absolute bottom-4 left-0 h-64 w-64 rounded-full bg-accent/20 blur-3xl" /><div className="relative mx-auto max-w-md rotate-2 rounded-[2rem] border border-border bg-card p-5 shadow-lg transition-transform duration-500 hover:rotate-0"><div className="mb-5 flex items-center gap-3 px-2"><img src="/brand/eleviq-logo.png" alt="ELEVIQ Prep" className="h-12 w-32 object-contain object-left" /><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Your preparation, elevated</p></div><div className="rounded-2xl bg-primary p-6 text-primary-foreground"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-[0.18em] text-primary-foreground/70">Student readiness snapshot</span><BrainCircuit className="h-5 w-5 text-accent" /></div><div className="mt-12 flex items-end justify-between"><div><p className="text-6xl font-bold tracking-[-0.06em]">74<span className="text-3xl text-accent">%</span></p><p className="mt-2 text-sm text-primary-foreground/70">Approaching Ready</p></div><div className="h-20 w-20 rounded-full border-[7px] border-accent/30 border-t-accent border-r-accent" /></div></div><div className="space-y-4 p-3 pt-7"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Focus this week</p><p className="mt-1 font-bold text-primary">LPN skills remediation</p></div><span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">3 tasks</span></div><div className="h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full w-[68%] rounded-full bg-accent" /></div><div className="grid grid-cols-3 gap-2 pt-4 text-center"><div className="rounded-xl bg-secondary p-3"><p className="font-bold text-primary">61%</p><p className="mt-1 text-[10px] text-muted-foreground">Pharm</p></div><div className="rounded-xl bg-secondary p-3"><p className="font-bold text-primary">78%</p><p className="mt-1 text-[10px] text-muted-foreground">Med-Surg</p></div><div className="rounded-xl bg-secondary p-3"><p className="font-bold text-primary">64%</p><p className="mt-1 text-[10px] text-muted-foreground">NGN</p></div></div></div></div><div className="absolute -bottom-2 -left-5 flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-md"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-primary"><Clock3 className="h-5 w-5" /></div><div><p className="text-xs text-muted-foreground">Next session</p><p className="text-sm font-bold text-primary">Tomorrow · 6:00 PM</p></div></div></div>
      </section>

      <section id="method" className="relative overflow-hidden border-y border-border bg-card px-5 py-16 lg:px-10 lg:py-24"><div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-accent/10 blur-3xl" /><div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16"><div><div className="flex items-center gap-3"><span className="h-px w-10 bg-accent" /><p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">A smarter study loop</p></div><h2 className="mt-4 max-w-md font-serif text-4xl font-bold leading-[1.06] tracking-[-0.035em] text-primary lg:text-5xl">Preparation that meets you where you are.</h2><p className="mt-5 max-w-md text-sm leading-7 text-muted-foreground">No generic study plan. Every recommendation is tied to your performance, your exam date, and your goals.</p><div className="mt-7 inline-flex items-center gap-2 rounded-full border border-primary/10 bg-background px-3.5 py-2 text-xs font-bold text-primary shadow-sm"><span className="h-2 w-2 rounded-full bg-accent" /> Learn · practice · improve</div></div><div className="grid gap-3 sm:grid-cols-3">{[{ icon: BookOpen, title: 'Learn', text: 'Original lessons and clear explanations for the concepts that matter.' }, { icon: BrainCircuit, title: 'Practice', text: 'Question sets and unfolding cases that build clinical judgment.' }, { icon: ShieldCheck, title: 'Improve', text: 'Actionable remediation with a readiness view you can understand.' }].map(({ icon: Icon, title, text }, i) => <div key={title} className="group rounded-[1.25rem] border border-border bg-background/75 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-md"><div className="flex items-center justify-between"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground"><Icon className="h-5 w-5" /></div><span className="font-mono text-xs font-bold text-muted-foreground">0{i + 1}</span></div><p className="mt-7 text-base font-bold text-primary">{title}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p><span className="mt-5 block h-1 w-8 rounded-full bg-accent transition-all duration-300 group-hover:w-14" /></div>)}</div></div></section>

      <section id="pn-hesi" className="relative overflow-hidden border-y border-border bg-[#f9fbfd] px-5 py-16 sm:px-6 lg:px-10 lg:py-24"><div className="pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full bg-[#021976]/10 blur-3xl" /><div className="relative mx-auto max-w-6xl"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.22em] text-[#021976]">ELEVIQ Prep</p><h2 className="mt-3 font-serif text-4xl font-bold leading-tight text-[#021976] sm:text-5xl">PN HESI Exit Bootcamp</h2><p className="mt-4 text-base font-semibold text-[#52698e]">3-Month · 1-on-1 Intensive Exam Preparation</p><p className="mt-5 max-w-2xl leading-7 text-[#52698e]">Strengthen nursing knowledge, clinical judgment, test-taking strategies, and confidence before your HESI PN Exit Exam with personalized instruction and individualized remediation.</p></div><div className="mt-8 grid gap-4 lg:grid-cols-2">{pnHesiPackages.map((pkg, index) => <article key={pkg.name} className={`relative flex flex-col rounded-[1.35rem] border p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${index === 1 ? 'border-[#021976] bg-[#021976] text-[#f9fbfd] shadow-xl' : 'border-[#d7dfef] bg-card text-[#021976]'}`}>
        {index === 1 && <span className="absolute right-5 top-5 rounded-full bg-[#f4c95d] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#021976]">Recommended</span>}
        <p className={`text-xs font-bold uppercase tracking-[0.18em] ${index === 1 ? 'text-[#f4c95d]' : 'text-[#164bd8]'}`}>0{index + 1} · 3 days per week</p>
        <h3 className={`mt-4 font-serif text-3xl font-bold ${index === 1 ? 'text-[#f9fbfd]' : 'text-[#021976]'}`}>{pkg.name}</h3>
        <p className={`mt-2 text-sm leading-6 ${index === 1 ? 'text-[#f9fbfd]/75' : 'text-[#52698e]'}`}>{pkg.detail}</p>
        <p className={`mt-5 text-xs font-bold uppercase tracking-[0.16em] ${index === 1 ? 'text-[#f4c95d]' : 'text-[#164bd8]'}`}>{index === 0 ? 'Includes' : 'Includes everything in Lite, plus'}</p>
        <ul className="mt-4 grid gap-x-5 gap-y-2.5 sm:grid-cols-2">
          {pkg.features.map(feature => <li key={feature} className="flex items-start gap-2 text-sm leading-5"><Check className={`mt-0.5 h-4 w-4 shrink-0 ${index === 1 ? 'text-[#f4c95d]' : 'text-[#164bd8]'}`} /><span className={index === 1 ? 'text-[#f9fbfd]/80' : 'text-[#52698e]'}>{feature}</span></li>)}
        </ul>
        <button type="button" onClick={() => openContact(`PN HESI ${pkg.name}`)} className={`mt-7 rounded-lg px-4 py-2.5 text-sm font-bold transition-all hover:-translate-y-0.5 active:scale-95 ${index === 1 ? 'bg-[#f4c95d] text-[#021976]' : 'bg-[#021976] text-[#f9fbfd]'}`}>Choose {pkg.name} <ArrowRight className="ml-2 inline h-4 w-4" /></button>
      </article>)}
      </div>
      </div></section>

      <section id="books" className="relative overflow-hidden bg-[#e6f1fe] px-6 py-20 lg:px-10 lg:py-28">
        <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-[#031976]/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-[#f4c95d]/25 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.92fr_1.08fr]">
          <div>
            <div className="flex items-center gap-3"><span className="h-px w-10 bg-[#031976]" /><p className="text-xs font-bold uppercase tracking-[0.22em] text-[#031976]">The study shop</p></div>
            <h2 className="mt-5 max-w-xl font-serif text-4xl font-bold leading-[1.05] tracking-[-0.035em] text-[#031976] sm:text-5xl lg:text-6xl">Tools for the hours between sessions.</h2>
            <p className="mt-6 max-w-lg text-base leading-7 text-[#3d5680]">Browse focused Phlebotomy and CNA workbooks made for clearer review, stronger recall, and less guesswork between tutoring sessions.</p>
            <div className="mt-8 flex flex-wrap gap-3"><a href={phlebotomyAmazonUrl} target="_blank" rel="noreferrer" className="group inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#031976] px-5 py-3 text-sm font-bold text-[#e6f1fe] shadow-lg shadow-[#031976]/20 transition-all hover:-translate-y-1 hover:shadow-xl active:translate-y-0">Shop Phlebotomy <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></a><a href={cnaAmazonUrl} target="_blank" rel="noreferrer" className="group inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#031976]/20 bg-[#e6f1fe]/70 px-5 py-3 text-sm font-bold text-[#031976] transition-all hover:-translate-y-1 hover:bg-card">Shop CNA <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></a></div>
            <p className="mt-5 text-xs font-medium text-[#52698e]">Official ELEVIQ listings on Amazon · opens in a new tab</p>
          </div>
          <div className="relative">
            <div className="grid gap-4 sm:grid-cols-2">
              {workbooks.map((workbook, index) => <article key={workbook.name} className={`group relative min-h-[330px] overflow-hidden rounded-[1.6rem] border p-6 shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${workbook.featured ? 'border-[#031976] bg-[#031976] text-[#e6f1fe]' : 'border-[#c6d8ef] bg-card text-[#031976]'}`}>
                <div className="flex items-start justify-between"><div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${workbook.featured ? 'bg-[#164bd8] text-[#e6f1fe]' : 'bg-[#e6f1fe] text-[#031976]'}`}><BookOpen className="h-5 w-5" /></div><span className={`font-mono text-xs font-bold ${workbook.featured ? 'text-[#e6f1fe]/60' : 'text-[#52698e]'}`}>0{index + 1}</span></div>
                <div className="mt-14 pb-12"><p className={`text-xs font-bold uppercase tracking-[0.15em] ${workbook.featured ? 'text-[#f4c95d]' : 'text-[#164bd8]'}`}>{workbook.eyebrow}</p><h3 className={`mt-3 font-serif text-3xl font-bold leading-tight ${workbook.featured ? 'text-[#e6f1fe]' : 'text-[#031976]'}`}>{workbook.name}</h3><p className={`mt-4 text-sm leading-6 ${workbook.featured ? 'text-[#e6f1fe]/75' : 'text-[#52698e]'}`}>{workbook.detail}</p></div>
                <a href={workbook.url} target="_blank" rel="noreferrer" className={`absolute bottom-6 left-6 inline-flex items-center gap-2 text-sm font-bold underline decoration-2 underline-offset-4 transition-transform group-hover:translate-x-1 ${workbook.featured ? 'text-[#e6f1fe] decoration-[#f4c95d]' : 'text-[#031976] decoration-[#164bd8]'}`}>View on Amazon <ArrowRight className="h-4 w-4" /></a>
              </article>)}
            </div>
            <div className="mt-4 flex items-center gap-5 rounded-[1.4rem] border border-[#c6d8ef] bg-card p-5 shadow-md"><div><p className="text-4xl font-bold tracking-[-0.05em] text-[#164bd8]">24/7</p><p className="mt-1 text-sm font-bold text-[#031976]">Practice access</p></div><div className="h-10 w-px bg-[#c6d8ef]" /><p className="max-w-xs text-sm leading-6 text-[#52698e]">Keep your study rhythm moving when your schedule opens up.</p></div>
          </div>
        </div>
      </section>

      <section id="reviews" className="border-y border-border bg-card px-6 py-20 lg:px-10 lg:py-24"><div className="mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Student trust, built in</p><h2 className="mt-3 max-w-2xl font-serif text-4xl font-bold leading-tight text-primary lg:text-5xl">A little more confidence for the road ahead.</h2></div><p className="max-w-sm text-sm leading-6 text-muted-foreground">Real support should make your next step feel clearer — whether that step is tutoring, practice, or your next workbook.</p></div><div className="mt-10 grid gap-4 lg:grid-cols-3">{reviews.map(review => <article key={review.name} className="rounded-2xl border border-border bg-background p-6 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md"><div className="flex gap-1" aria-label={`${review.rating} out of 5 stars`}>{Array.from({ length: review.rating }, (_, index) => <span key={index} className="text-lg text-accent" aria-hidden="true">★</span>)}</div><blockquote className="mt-5 text-lg leading-7 text-primary">“{review.quote}”</blockquote><div className="mt-6 border-t border-border pt-4"><p className="font-bold text-primary">{review.name}</p><p className="text-sm text-muted-foreground">{review.role}</p></div></article>)}</div></div></section>

      <section id="faq" className="relative overflow-hidden border-y border-border bg-secondary/40 px-6 py-20 lg:px-10 lg:py-28">
        <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
          <div className="flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3"><span className="h-px w-10 bg-accent" /><p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Questions, answered</p></div>
              <h2 className="mt-5 max-w-md font-serif text-4xl font-bold leading-[1.05] tracking-[-0.035em] text-primary sm:text-5xl">Clear answers.<br /><span className="italic text-accent">No guesswork.</span></h2>
              <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">A little clarity can change how you prepare. Here is what to expect before you take your next step with ELEVIQ.</p>
            </div>
            <div className="mt-8 flex items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Sparkles className="h-5 w-5 text-accent" /></div><div><p className="font-bold text-primary">Still deciding?</p><p className="mt-1 text-sm leading-6 text-muted-foreground">Tell us where you are starting. We will help you find the right path.</p><button type="button" onClick={() => openContact()} className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-primary underline decoration-accent decoration-2 underline-offset-4 transition-transform hover:translate-x-1">Talk with ELEVIQ <ArrowRight className="h-4 w-4" /></button></div></div>
          </div>
          <div className="rounded-[1.75rem] border border-border bg-card p-3 shadow-lg sm:p-5"><div className="flex items-center justify-between border-b border-border px-2 pb-4"><p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Frequently asked</p><span className="font-mono text-xs font-bold text-muted-foreground">03 answers</span></div><div className="divide-y divide-border">{[['How does 1-on-1 tutoring work?', 'We pair you with a focused study rhythm built around your baseline, exam date, and goals.'], ['What programs does ELEVIQ support?', 'ELEVIQ supports Phlebotomy, CNA, and LPN students with tutoring, practice, readiness support, and focused study workbooks.'], ['Is the readiness indicator a guarantee?', 'No. It is an educational progress signal to help you decide where to spend your study time.']].map(([question, answer], index) => <details key={question} open={index === 0} className="group"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-2 py-5 font-bold text-primary marker:hidden"><span className="flex items-center gap-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary font-mono text-xs text-primary">0{index + 1}</span><span>{question}</span></span><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-lg font-normal text-accent transition-transform duration-300 group-open:rotate-45">+</span></summary><p className="pb-5 pl-14 pr-10 text-sm leading-6 text-muted-foreground">{answer}</p></details>)}</div></div>
        </div>
      </section>

      <section id="contact" className="relative overflow-hidden border-y border-border bg-[#e6f1fe] px-6 py-20 lg:px-10 lg:py-28">
        <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-[#164bd8]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-36 left-1/3 h-80 w-80 rounded-full bg-[#f4c95d]/25 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-end gap-10 lg:grid-cols-[1fr_auto]">
          <div>
            <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#031976] font-mono text-[10px] font-bold text-[#e6f1fe]">04</span><p className="text-xs font-bold uppercase tracking-[0.22em] text-[#031976]">Ready when you are</p></div>
            <h2 className="mt-6 max-w-3xl font-serif text-5xl font-bold leading-[0.98] tracking-[-0.045em] text-[#031976] sm:text-6xl lg:text-8xl">Make your study time <span className="italic text-[#164bd8]">count.</span></h2>
            <p className="mt-6 max-w-xl text-base leading-7 text-[#3d5680]">Start with a conversation, choose your path, and build a study rhythm that feels possible.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:pb-1"><button type="button" onClick={() => openContact()} className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-xl border border-[#031976]/20 bg-[#e6f1fe]/70 px-6 py-3 text-sm font-bold text-[#031976] transition-all hover:-translate-y-1 hover:bg-card">Contact us <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></button><button type="button" onClick={() => scrollToSection('pn-hesi')} className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-[#031976] px-6 py-3 text-sm font-bold text-[#e6f1fe] shadow-lg shadow-[#031976]/20 transition-all hover:-translate-y-1 hover:shadow-xl">Find your bootcamp <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></button></div>
        </div>
      </section>
      <footer className="border-t border-border bg-card px-6 py-8 lg:px-10"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 text-sm text-muted-foreground sm:flex-row"><p>© 2026 ELEVIQ Prep. Educational readiness support, not a guarantee of exam results.</p><div className="flex flex-wrap items-center gap-5"><a href="mailto:info@eleviqprep.com" className="transition-colors hover:text-primary">info@eleviqprep.com</a><Link to="/privacy" className="transition-colors hover:text-primary">Privacy</Link><Link to="/terms" className="transition-colors hover:text-primary">Terms</Link><Link to="/login" search={{ next: '/admin' }} className="rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground/60 transition-colors hover:bg-secondary hover:text-muted-foreground">Admin access</Link></div></div></footer>

      {contactOpen && <ContactDialog initialProgram={selectedProgram} onClose={() => setContactOpen(false)} />}
    </main>
  )
}
