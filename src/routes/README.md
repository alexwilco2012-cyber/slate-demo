# Routes: how each area plugs into the shell

`src/App.tsx` owns the route tree. Every area is a lazy-loaded module whose **default export
renders its own nested `<Routes>`**, with paths relative to its mount point.

| URL                                        | Module                          | Owner                                   | Wrapped by the shell in      |
| ------------------------------------------ | ------------------------------- | --------------------------------------- | ---------------------------- |
| `/tenant/*`                                | `src/routes/tenant/index.tsx`   | tenant portal                           | `PortalGate role="tenant"`   |
| `/landlord/*`                              | `src/routes/landlord/index.tsx` | landlord portal                         | `PortalGate role="landlord"` |
| `/trade/*`                                 | `src/routes/trade/index.tsx`    | trade portal                            | `PortalGate role="trade"`    |
| `/demo/*`                                  | `src/routes/demo/index.tsx`     | demo page                               | nothing (public)             |
| `/dev/gallery/*`                           | `src/routes/dev/gallery.tsx`    | design system (development builds only) | nothing                      |
| everything else, `/` and `/start` included | `src/routes/public/index.tsx`   | public site                             | nothing                      |

The shell is `src/routes/_shell` (layout, 404, fallbacks, theme) and `src/session` (who is signed
in). Import from `@/routes/_shell` and `@/session`.

## Every module

- Default-export a component that renders `<Routes>`, and end it with
  `<Route path="*" element={<NotFound />} />` (from `@/routes/_shell`). Inside a portal the 404
  sits in the portal layout with a way home; elsewhere it is a page of its own.
- Put the page's content in a `<main id={MAIN_ID} tabIndex={-1}>` (portals get this from the
  layout), so the skip link and the focus-on-navigate behaviour find it.
- Name the browser tab with `useDocumentTitle('Repairs')` → "Repairs · Slate", or wrap a portal
  page in `<PortalPage title="Repairs">`, which also sets a consistent width
  (`narrow` 672px for forms, `default` 1024px, `wide` 1280px for list + drawer).
- Lazy-load your own heavy pages if you like, with your own `<Suspense>`.

## Portal modules (tenant, landlord, trade)

```tsx
import { Route, Routes } from 'react-router'
import { ChatsCircleIcon, HouseIcon, PlusIcon, WrenchIcon } from '@phosphor-icons/react'
import { NotFound, PortalLayout, type PortalNav } from '@/routes/_shell'

const NAV: PortalNav = {
  items: [
    { to: '/tenant', label: 'Home', icon: HouseIcon, end: true },
    { to: '/tenant/repairs', label: 'Repairs', icon: WrenchIcon },
    { to: '/tenant/messages', label: 'Messages', icon: ChatsCircleIcon },
  ],
  primaryAction: { to: '/tenant/report', label: 'Report a problem', icon: PlusIcon },
}

export default function TenantPortal() {
  return (
    <PortalLayout nav={NAV}>
      <Routes>
        <Route index element={<Home />} />
        <Route path="jobs/:jobId" element={<Job />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </PortalLayout>
  )
}
```

- **Nav paths are absolute** (`/tenant/repairs`); give the home `end: true`. An item's `count`
  shows a badge and is read out ("Messages, 2 new"): work it out in your module (e.g. unread
  threads with `useSlateQuery`) and build the nav inside your component to pass it.
- **Order items by importance.** The desktop side bar (from 1024px) shows them all. The phone
  bottom bar has 5 cells (4 in trade, for the Hi-Vis targets), and the main action takes one. If the
  items don't fit, the bar shows the first ones and a **More** cell that opens the rest in a sheet.
  Trade with 5 items: Jobs, Job board, Messages, then More holding the other two.
- The layout provides, on every screen: the 4px accent bar, the lockup with the role word,
  `data-role` on the portal root and on `<html>` (toasts, menus and dialogs take the portal's
  colour and Hi-Vis sizing), a skip link, the "Demo · fictional data" marker, and the header with
  **Help** (always first), the **notification bell** (unread count, panel, links use each
  notification's `href`) and the **account menu** (portal switch for people with several roles,
  appearance, profile at `/{role}/profile`, try as someone else, reset demo data, sign out).
- Help shows standard answers for the portal (`HELP_TOPICS`); pass `help={[...]}` to
  `PortalLayout` to replace them.
- Do not set `data-role`, the theme or page padding yourself; the layout does. Bottom padding
  already clears the phone bar.
- Routes the notifications already link to: `/{role}`, `/{role}/jobs/:jobId`,
  `/{role}/messages/:threadId`, `/{role}/tenancies/:tenancyId`, `/{role}/ratings`,
  `/{role}/reviews/:ratingId`, `/{role}/reports`, `/{role}/profile`, `/trade/board`,
  `/landlord/documents`, `/landlord/homes/:propertyId/documents`, `/landlord/team`,
  `/tenant/passport`. Keep them working.

## Who is signed in

Each browser tab (and each iframe) has its own session, so three tabs can be three people.

```tsx
const viewer = useViewer() // { personId, role, actingForId? }: pass it to every SlateApi call
const { state } = useSlateQuery((api) => api.listJobs(viewer), [viewer])
const { role, person, landlords } = usePortal() // the portal, the signed-in Person, an agent's landlords
const { session, signIn, signOut } = useSession()
```

- Inside a portal, `useViewer()` and `usePortal()` always have a value: the gate only renders the
  module once the person is checked against the data. `viewer` keeps the same identity until the
  session changes, so it is safe in deps.
- **The URL decides the portal.** Someone who holds several roles (Hannah) is switched to the
  portal in the address; someone opening a portal they don't hold is sent to their own.
- **Letting agents** (Aileen) are signed in with `actingForLandlordId`; the gate fills it in with
  the landlord they work for, and the account menu switches between landlords if there are several.
- A person removed by a demo reset is signed out and sent to `/start`.

### The public site

- Must keep a **persona picker at `/start`**: the gate sends signed-out visitors there with
  `location.state.from` set to where they were going. After choosing:
  ```tsx
  signIn({ personId: persona.personId, activeRole: persona.role })
  navigate(returnPathAfterSignIn(location.state, persona.role), { replace: true })
  ```
  `returnPathAfterSignIn` only returns to a page inside that person's portal, else its home.
- Sign-up and magic links work the same way: once `completeMagicLink` gives a `Person`, call
  `signIn` with the role they signed up for.
- The theme choice is shared: `useThemePreference()` returns `['system' | 'light' | 'dark', set]`.

### Links that sign a tab in: `?as=`

`/tenant?as=person_sarah&role=tenant` signs this tab in as Sarah, then removes the parameters from
the address. `role` can be left out on a portal path; agents add `&for=<landlordId>`. Build them
with `sessionHref(path, session)`. For the demo page's iframes, include the base path
(`import.meta.env.BASE_URL`) and give each iframe a `name`: iframes share their tab's
sessionStorage, so the session is kept per frame name.

## Tests

Render inside `MemoryRouter useTransitions={false}` (as the app does), `SlateProvider` with a
fresh `createLocalSlate({ storage: memoryStorage(), channel: null })`, `SessionProvider` with
`createSessionStore()` and `UiProvider`. `tests/shell/harness.tsx` does all of this:
`renderShell(ui, { path: '/tenant', session: { personId: 'person_sarah', activeRole: 'tenant' } })`.
