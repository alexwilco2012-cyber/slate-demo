import { Link } from 'react-router'
import { SignpostIcon } from '@phosphor-icons/react'
import { hrefs } from '@/data'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import { Logo } from '@/components/slate/logo'
import { START_PATH, useOptionalPortal } from '@/session'
import { MAIN_ID, useDocumentTitle } from './route-effects'

/**
 * The friendly 404. Put it on `path="*"` in every module's <Routes>. Inside a portal it sits in the
 * portal's layout and offers the way home; on the public site it is a page of its own.
 */
export function NotFound() {
  const portal = useOptionalPortal()
  useDocumentTitle('Page not found')

  const body = (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5 py-12 text-center sm:py-20">
      <span className="flex size-20 items-center justify-center rounded-full bg-accent-tint text-accent-text">
        <SignpostIcon weight="duotone" aria-hidden className="size-10" />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-display-l font-semibold text-ink">
          We can’t find that page
        </h1>
        <p className="text-body-l text-muted">
          The link may be out of date, or the page may have moved. Everything else is where you left
          it.
        </p>
      </div>
      <div className="flex w-full flex-col justify-center gap-(--gap-touch) sm:w-auto sm:flex-row">
        {portal ? (
          <Link to={hrefs.home(portal.role)} className={buttonVariants({ variant: 'primary' })}>
            Go to your home
          </Link>
        ) : (
          <>
            <Link to="/" className={buttonVariants({ variant: 'primary' })}>
              Go to the home page
            </Link>
            <Link to={START_PATH} className={buttonVariants({ variant: 'secondary' })}>
              Try the demo
            </Link>
          </>
        )}
      </div>
    </div>
  )

  if (portal) return body
  return (
    <div className="flex min-h-dvh flex-col bg-bg px-(--gutter)">
      <header className="mx-auto flex w-full max-w-5xl py-5">
        <Link
          to="/"
          className={cn(
            'rounded-control no-underline',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          )}
        >
          <Logo size="sm" />
        </Link>
      </header>
      <main id={MAIN_ID} tabIndex={-1} className="flex flex-1 items-center outline-none">
        {body}
      </main>
    </div>
  )
}
