# Slate (demo)

Tenants, landlords and trades on one record, rating each other fairly.

**This is a working demo with fictional people and places.** Everything you do is saved only in your own browser. Nothing is sent to a server.

Try it at <https://alexwilco2012-cyber.github.io/slate-demo/>. To watch all three portals update each other live, open the side-by-side demo at <https://alexwilco2012-cyber.github.io/slate-demo/demo>.

## What it shows

* **Three portals, one record.** Tenants report repairs. Landlords approve them and choose the trade. Trades quote, visit and finish the job. Everyone sees the same timeline.
* **Fair ratings in every direction.** Ratings open only after a real job or tenancy. Both sides' ratings stay hidden until both are in, then appear together. People rate in plain words, not stars.
* **Tenants protected.** A landlord's view of a tenant is a private passport the tenant owns and chooses to share. What a sitting tenant says about their landlord stays sealed.
* **Trades rate customers too**, for example "paid on time on 9 of 9 jobs".
* **Scotland first:** 48 hours' written notice before visits, landlord registration, the Repairing Standard, approved deposit schemes and certificate reminders.

## Running it locally

```bash
npm install
npm run dev
```

Then open http://localhost:5173/slate-demo/.

`npm test` runs the unit tests (Vitest), and `npx playwright test` runs the end-to-end story. The stack is Vite, React, TypeScript, Tailwind CSS and Zustand. The product decisions are in [docs/SPEC.md](docs/SPEC.md).
