(() => {
  try {
    const stored = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.classList.toggle('dark', stored === 'dark' || (!stored && prefersDark))
  } catch {
    // Theme persistence is optional; the CSS default remains usable.
  }
})()
