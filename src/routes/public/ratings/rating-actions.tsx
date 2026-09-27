import { useState } from 'react'
import { Link } from 'react-router'
import { FlagIcon, ScrollIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import { inlineLinkClass } from '../layout/parts'
import { ReportRoutesDialog } from './report-routes-dialog'

export function ReviewPolicyLink({ className }: { className?: string }) {
  return (
    <Link
      to="/policies/reviews"
      className={cn(
        inlineLinkClass,
        'inline-flex min-h-8 items-center gap-1.5 text-small',
        className,
      )}
    >
      <ScrollIcon weight="bold" aria-hidden className="size-4 shrink-0" />
      Review policy
    </Link>
  )
}

/**
 * What sits under every rating on the public site, as in the app: the review policy, and a Report
 * button that opens the four report routes. Leave out `report` when the rating component already
 * has its own Report button.
 */
export function RatingActions({
  report = true,
  className,
}: {
  report?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-x-4 gap-y-2', className)}>
      <ReviewPolicyLink />
      {report ? (
        <>
          <Button
            variant="ghost"
            size="sm"
            iconStart={<FlagIcon weight="bold" aria-hidden />}
            onClick={() => setOpen(true)}
          >
            Report
          </Button>
          <ReportRoutesDialog open={open} onOpenChange={setOpen} />
        </>
      ) : null}
    </div>
  )
}
