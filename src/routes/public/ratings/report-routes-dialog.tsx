import { Link } from 'react-router'
import { ArrowRightIcon, ClockIcon } from '@phosphor-icons/react'
import { buttonVariants } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { REPORT_ROUTE_COPY } from '@/routes/policies/report-routes'

/**
 * What the Report button offers, shown on the public site's sample review. Signed in, the same
 * four routes lead to a short form; here each links to its part of the reporting policy.
 */
export function ReportRoutesDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Report this review"
        description="In the app you choose the route that fits, then say what’s wrong. Each route has its own clock."
        footer={
          <Link
            to="/policies/reporting"
            onClick={() => onOpenChange(false)}
            className={buttonVariants({ variant: 'secondary' })}
          >
            How reporting works
          </Link>
        }
      >
        <ul className="flex flex-col gap-2">
          {REPORT_ROUTE_COPY.map((route) => (
            <li key={route.route}>
              <Link
                to={`/policies/reporting#${route.anchor}`}
                onClick={() => onOpenChange(false)}
                className="group flex items-start gap-3 rounded-control border border-input-border bg-surface p-4 text-ink no-underline transition-colors duration-(--duration-quick) hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="font-semibold">{route.label}</span>
                  <span className="flex items-start gap-1.5 text-small text-muted">
                    <ClockIcon weight="bold" aria-hidden className="mt-0.5 size-4 shrink-0" />
                    {route.clock} {route.clockSource}.
                  </span>
                </span>
                <ArrowRightIcon
                  weight="bold"
                  aria-hidden
                  className="mt-1 size-4 shrink-0 text-muted group-hover:text-ink"
                />
              </Link>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
