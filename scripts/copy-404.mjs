// GitHub Pages has no single-page-app fallback. Two copies of index.html fix that:
// * 404.html catches any address (e.g. a job id), so the app still loads, but with a 404 status.
// * A copy at each fixed route (e.g. demo/index.html) serves shared links like /slate-demo/demo
//   with a proper 200, which link previews in WhatsApp or iMessage expect.
import { copyFileSync, mkdirSync } from 'node:fs'

const sub = (base, pages) => [base, ...pages.map((p) => `${base}/${p}`)]
const ROUTES = [
  'start',
  'demo',
  ...sub('signup', ['tenant', 'landlord', 'trade']),
  ...['tenant', 'landlord', 'trade'].map((r) => `how-it-works/${r}`),
  ...['reviews', 'privacy', 'reporting'].map((p) => `policies/${p}`),
  ...sub('tenant', [
    'repairs',
    'report',
    'messages',
    'passport',
    'ratings',
    'reports',
    'tenancies',
    'profile',
  ]),
  ...sub('landlord', [
    'repairs',
    'homes',
    'documents',
    'messages',
    'passports',
    'ratings',
    'reports',
    'team',
    'trades',
    'profile',
  ]),
  ...sub('trade', ['jobs', 'board', 'quotes', 'messages', 'ratings', 'reports', 'profile']),
]

copyFileSync('dist/index.html', 'dist/404.html')
for (const route of ROUTES) {
  mkdirSync(`dist/${route}`, { recursive: true })
  copyFileSync('dist/index.html', `dist/${route}/index.html`)
}
console.log(`Pages fallbacks: 404.html + ${ROUTES.length} route copies`)
