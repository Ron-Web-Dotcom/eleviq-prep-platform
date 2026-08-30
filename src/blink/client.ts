import { createClient } from '@blinkdotnew/sdk'

export const blink = createClient({
  projectId: import.meta.env.VITE_BLINK_PROJECT_ID || 'eleviq-prep-platform-el8e8zlx',
  publishableKey: import.meta.env.VITE_BLINK_PUBLISHABLE_KEY || 'blnk_pk_zTvqAP7-6uiYF26pwh7yOTxr65hn0yMn',
  authRequired: false,
  auth: { mode: 'headless' },
})
