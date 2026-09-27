# Slate: product spec (agreed 26 Sep 2026)

Slate is a lettings platform with three portals (tenant, landlord, trade) that work on the same records and rate each other. This document is the source of truth for the first build. Every decision below was agreed with the product owner in a grilling session; change it only with their say-so.

"Slate" is the working name. A trade mark / Companies House / domain check is in progress, so the brand name must live in one constant (`src/config/brand.ts`) and never be hard-coded elsewhere.

## 1. What we are building now

A polished, fully clickable demo (option "A then B"):

* Runs entirely in the browser with realistic fictional data. No server, no real personal data, no password fields.
* Every screen reads and writes through a small data-access layer so a real backend (Supabase, London region) can replace the fake store later without rewriting screens.
* Installable phone app (PWA), designed phone-first. No app-store builds.
* Deployed free to GitHub Pages from a new public repo (`slate-demo`). The old `slate` demo repo is left alone; the owner decides later whether the new one replaces it.

## 2. Positioning

* Standalone brand for the whole UK lettings market, launched Scotland-first (Aberdeen). Use Scottish terms and rules; keep the structure ready for England and Wales later.
* The gap: nobody lets all three parties rate each other, and nobody lets trades rate their customers. Ratings are a by-product of real repair jobs and tenancies, not a review site.
* The app must be useful to a single landlord with one property on day one (71% of Scottish landlords own one property): repairs, messages, documents and certificate reminders.

## 3. Structure

* **Public site** in front of the app: what Slate is, three doors (*I rent · I let · I'm a trade*), a "how it works for you" section per party, how ratings stay fair, pricing, sign-up.
* **One app, three portals.** Each has its own home screen, navigation and accent colour. One person can hold several roles (e.g. landlord who is also a tenant) and switch between them.
* **Letting agents** work inside a landlord account as team members. No fourth portal.
* **Demo mode:** open the three portals side by side (browser tabs or an in-app split view) and they update each other live (Zustand store synced with BroadcastChannel). Report a leak as the tenant → it appears for the landlord → the trade quotes → job completes → everyone rates → reveal.
* **Sign-in:** persona shortcuts on the front page ("Try as Sarah / Graham / Kev") plus working sign-up flows saved only in the browser. Sign-up shows how verification badges are earned: ID check, Scottish landlord registration number, Gas Safe number, SELECT/NICEIC membership. Use a simulated magic link, never a password field.

## 4. Features in the first build

1. **Repairs:** tenant reports (one question per screen: room, problem, photos, urgency, access times, check answers) → landlord approves → landlord chooses the trade → trade quotes, books, completes → everyone rates. Shown as a timeline.
2. **Messaging** between the parties on a job or tenancy, with a role chip on every message, block/mute and a report button.
3. **Job board:** a landlord can post a job for quotes; trades send quotes; the landlord picks.
4. **Documents:** tenancy agreement, gas safety record, EICR, EPC, inventory, alarms, legionella, landlord registration, shared with expiry reminders (landlord compliance calendar).

Later phases (not now): listings and applications, rent tracking, move-in/move-out and deposits.

### How a trade gets onto a job (legal rule)
The landlord (or their agent) always chooses and instructs the trade: from their own saved trades, from a directory, or from quotes on the job board. Slate never assigns, matches or dispatches. (Scottish letting-agency law risk; solicitor check needed before going live.)

## 5. Ratings

### Global rules
1. A rating unlocks only after a completed Job or a Tenancy confirmed on the platform by both sides. Nobody can rate someone who isn't a member.
2. **Double-blind:** everything owed on one Job or Tenancy stays hidden until every party has submitted or the window closes, then it's revealed together. No edits after the reveal.
3. Windows: job 14 days; end of tenancy 28 days; trade rating a landlord 30 days (so payment can be judged). Reminders on day 3 and day 10 to every party equally. Put the numbers in config.
4. **Retaliation shield:** a tenant's ratings of their current landlord (after each repair) are sealed and only released inside an aggregate, at tenancy end or once the landlord has 5+ distinct tenant raters.
5. **Plain-words scales, not stars.** Judgement: *Well below / Below / What I expected / Better than expected / Outstanding*. Frequency: *Never / Rarely / Sometimes / Mostly / Always*. Scored 1–5; shown as a score out of 5 with a verbal label.
6. Each rating: required criteria; optional public comment (30–1,000 chars, prompted "in my experience", labelled "[Role]'s opinion"); optional private note; a private "would you work with / rent to / rent from them again?" (never shown or scored); a "safety concern" flag that goes to moderation.
7. **Filters** block or flag mentions of children, benefits, health, disability, ethnicity, religion, immigration status, criminal allegations, third-party names, phone numbers, emails, addresses.
8. The rated person gets **one public reply** per review (≤500 chars, within 30 days), can add a visible "[Role] disputes this" note, and can report. The reviewer may add one dated update. Ratings themselves never change.
9. Reviewers appear as e.g. "Verified tenant · AB10 · 2025", never by full name.
10. No score until 3 reviews from 3 different people; before that show "New · N verified reviews".
11. No automated tenant decisions: no sorting, filtering or auto-reject by any tenant rating.
12. Reviews stop counting and are deleted after 36 months.

### The six relationships

| Direction | Criteria | Unlocks | Visibility | Headline |
|---|---|---|---|---|
| Tenant → landlord | Fixed problems quickly · Easy to reach, kept me informed · Home matched the advert and was safe at move-in (property sub-score) · Gave proper notice before visits · Fair about money | End of tenancy (28d, double-blind); after each repair criteria 1–2 only, sealed (rule 4) | Public on landlord + property pages | Score, property sub-score, "Registration verified" badge |
| Landlord → tenant | Paid rent on the agreed date (frequency) · Looked after the home · Easy to reach · Allowed access with proper notice · Left the home as expected | End of tenancy only (28d, double-blind) | **Tenant passport:** never public. Tenant sees all and can reply; shares an all-or-nothing link (30 days, views logged) when applying | No single number. Counts per criterion, e.g. "Rent on agreed date: Always, from 2 of 2 landlords" |
| Landlord → trade | Problem properly fixed · Final price matched the quote · Turned up and finished when agreed · Kept me updated · Right paperwork | Job confirmed complete (14d) | Public on trade profile | Part of trade Overall, "From landlords" half |
| Trade → landlord | Clear job description · Paid on time (frequency) · Arranged access and told the tenant · Fair and easy to deal with | Job complete (30d); shown only after the landlord's rating of that trade is locked | Trades only (on the landlord's client profile); landlord sees their own | "Client rating from trades" + "Paid on time on X of Y jobs" |
| Tenant → trade | Turned up when agreed · Polite and respectful in my home · Left it clean and tidy · Is the problem fixed? (Yes/Partly/No) | Tenant confirms the visit (14d) | Public, "Verified tenant" | Part of trade Overall, "From tenants" half |
| Trade → tenant | Access given as arranged · I felt safe and was treated with respect · Gave clear information about the problem | Visit happened (14d) | Private to the tenant; the landlord sees only "access given: yes/no"; safety flags go to moderation | None |

### Headline score
* Per review r = mean of criteria answered (1–5). Recency weight w = 0.5^(age months / 12); zero at 36 months.
* S = (3·m + Σ w·r) / (3 + Σ w), m = platform mean for that direction over 12 months (start 4.0).
* Display: S to one decimal + verbal label, review count, 5-level distribution bar, per-criterion bars, date of last review, **"Reviewed on X of Y completed jobs"**. Relative badges ("Top 10% in Aberdeen") only with 20+ peers.
* A trade's Overall = mean of landlord-sourced and tenant-sourced scores, always shown with both halves.

### Prompting ratings
"Leave yours to see what they said about you" (the other side is revealed at the deadline anyway). No rewards, nothing gated behind reviewing. Optional "Helpful reviewer" count badge, independent of sentiment.

## 6. Legal product rules (demo must show them working)
* Report button everywhere, with four routes: defamation (48-working-hour clock, England & Wales regs), illegal content (Online Safety Act), suspected fake review (CMA; "pending" label only for suspected fakes), data protection (acknowledge within 30 days).
* Rated person notified at the reveal (i.e. at or before first publication).
* Reviews publish automatically after neutral checks; no human approves on substance; never edit a review except obscenity/typos. Remove, never edit; recalculate scores after any removal.
* Trade badges only after the credential is checked, with the check date. Gas jobs only to Gas Safe trades with matching categories; EICR only to SELECT/NICEIC/NAPIT or checklist-evidenced electricians. No scheme logos.
* Tenants never pay. Slate never holds deposits or collects rent. Minimum age 18. No fields about children, benefits, health, ethnicity, religion.
* Scotland: 48 hours' written notice before visits (except emergencies); deposit card shows which of the three approved schemes holds it; compliance calendar intervals: gas 12 months, EICR 5 years, landlord registration 3 years, plus smoke/heat alarms, CO detectors, legionella.
* Plain-English review policy linked from every rating.

## 7. Business model shown in the demo
Tenants free forever. Landlords pay per property; trades pay a subscription or per job won. Pricing page shows "Free during launch".

## 8. Demo cast (all fictional)
* ~12 properties in real Aberdeen neighbourhoods (Rosemount, West End, Ferryhill, Old Aberdeen, Torry, Bridge of Don) with made-up house numbers; postcodes AB10/AB11/AB15/AB16/AB22/AB24/AB25.
* 4 landlords: a portfolio landlord who uses a letting agent; a first-time "accidental" landlord; a small family landlord; one with a poor track record (so ratings visibly work).
* ~16 tenants; ~10 trades: plumber, Gas Safe engineer, electrician, joiner, slater/roofer, cleaner, locksmith, handyman (+2).
* ~20 repair jobs at every stage, months of rating history, one dispute, one right-of-reply example, one sealed rating, one tenant passport share.
* Personas for quick demo: Sarah (tenant), Graham (landlord), Kev (plumber). Never use any real person or the owner's own property.

## 9. Design: direction A "Hearth", with Hi-Vis rules in the trade portal
* One shared system; per-role accent, home screen, navigation and density. Role is never shown by colour alone: 4px accent bar, role word in the lockup ("Slate for trades"), role icon on avatars, role chip on messages.
* Light tokens: bg #F7F2EA, surface #FFFCF7, ink #2B2320, muted #6A5E55, input border #8C7F73, brand spruce #1F3A34. Tenant clay #A8401F (tint #F8E4DB). Landlord moss #2F6A4F (tint #DDEDE3). Trade ochre fill #E0A526 with ink label, ochre text #8A5A00, tint #FBEFCF (ochre is never text on light). Danger #B3261E. Star/score accent #C77700 always paired with a number.
* Dark tokens: bg #1B1714, surface #26201C, ink #F5EEE6, muted #BFB2A6; tenant #F08A6C, landlord #7FC4A0, trade #F2C14E.
* Type: Fraunces (display), Figtree (UI); trade portal UI in Atkinson Hyperlegible Next. Self-host via Fontsource.
* Icons: Phosphor (duotone for illustration moments, regular for UI). Illustrations: Open Peeps recoloured (CC0). Photos: warm natural-light homes (Unsplash/Pexels licence), no handshake stock.
* Motion: soft, 200–300ms, honour reduced motion.
* Money and compliance screens stay plain tables. "Gold/ochre is structural, never a status." "Status never colour alone."
* **Trade portal (Hi-Vis rules):** essential text 7:1 contrast, primary buttons 56–64px, full width in the bottom third, ≥12px gaps, no dropdowns (segmented choices), job details and chat on one screen, camera opens directly for photos, visible upload queue, quick quotes from saved line items, light mode default.
* **Tenant portal:** phone-first, "Report a problem" is the main action, bottom-bar actions, calm short copy.
* **Landlord portal:** desktop-friendly too; home starts with "Actions needed" (approvals, quotes, expiring certificates) above the portfolio; list + detail drawer; 16px body with 18px comfortable option; tabular figures for money.
* WCAG 2.2 AA everywhere: 4.5:1 text, 24px+ targets, reflow at 320px, 200% zoom, help in the same place, empty states that point to the next step, skeleton loaders.
* PWA: "Add to Home Screen" guidance before asking about notifications (iPhone).

## 10. Tech
Vite 8, React 19, TypeScript, Tailwind 4, shadcn/ui on Base UI, React Router 8, Zustand 5 (persisted to localStorage + BroadcastChannel sync), Motion, Recharts via shadcn chart, Faker `en_GB` only if needed (prefer hand-written seed data for quality), vite-plugin-pwa, Vitest, Playwright, oxlint, Prettier, Fontsource. GitHub Pages: `base: '/slate-demo/'`, router basename, PWA scope, `404.html` copy of `index.html`. Pre-commit hook blocking real personal data (from Deeker).
