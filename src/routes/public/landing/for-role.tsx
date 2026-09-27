import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowRightIcon } from '@phosphor-icons/react'
import type { Role } from '@/domain/types'
import { Avatar } from '@/components/ui/avatar'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import { RoleChip } from '@/components/slate/role-chip'
import { ROLE_STORIES, type Step } from '../content/roles'
import { Container } from '../layout/parts'
import { personaHref } from './persona-links'
import { LandlordCompliancePicture, TenantPicture, TradeBoardPicture } from './vignettes'

const PICTURES: Record<Role, ReactNode> = {
  tenant: <TenantPicture />,
  landlord: <LandlordCompliancePicture />,
  trade: (
    <div className="mx-auto w-full max-w-md">
      <TradeBoardPicture />
    </div>
  ),
}

/** Numbered steps with the number in the role's tint. */
export function StepList({ steps, className }: { steps: readonly Step[]; className?: string }) {
  return (
    <ol className={cn('flex flex-col gap-5', className)}>
      {steps.map((step, index) => (
        <li key={step.title} className="flex gap-4">
          <span
            aria-hidden="true"
            className="figures flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-tint font-display text-body-l font-semibold text-accent-text"
          >
            {index + 1}
          </span>
          <div className="flex flex-col gap-1 pt-1">
            <h3 className="text-title leading-snug font-semibold text-ink">{step.title}</h3>
            <p className="text-body text-muted">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

/**
 * "How it works for tenants", and the same for landlords and trades, on the front page: the words
 * beside a picture. The landlord's picture is a four-column compliance table that needs more than
 * half the page, so there the steps sit beside the words and the table runs full width below.
 */
export function ForRole({ role }: { role: Role }) {
  const story = ROLE_STORIES[role]
  const wide = role === 'landlord'
  const titleId = `${story.sectionId}-title`

  const intro = (
    <div className={cn('flex flex-col gap-4', wide && 'lg:col-start-1 lg:row-start-1')}>
      <RoleChip role={role} size="md" label={`For ${story.plural}`} className="self-start" />
      <h2
        id={titleId}
        className="font-display text-[clamp(1.875rem,1.5rem+1.6vw,2.75rem)] leading-[1.08] font-semibold tracking-[-0.02em] text-balance text-ink"
      >
        {story.heading}
      </h2>
      <p className="text-body-l text-pretty text-muted">{story.intro}</p>
    </div>
  )
  const steps = (
    <StepList
      steps={story.steps}
      className={cn(wide && 'lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:pt-2')}
    />
  )
  const actions = (
    <div
      className={cn(
        'flex flex-col gap-(--gap-touch) sm:flex-row sm:flex-wrap',
        wide && 'lg:col-start-1 lg:row-start-2 lg:self-start',
      )}
    >
      <Link to={`/how-it-works/${role}`} className={buttonVariants({ variant: 'secondary' })}>
        See the full walkthrough
        <ArrowRightIcon weight="bold" aria-hidden />
      </Link>
      <Link to={personaHref(role)} className={buttonVariants({ variant: 'soft' })}>
        <Avatar
          name={story.persona.name}
          seed={story.persona.personId}
          size="xs"
          decorative
          className="-ml-1"
        />
        Try as {story.persona.name}
      </Link>
    </div>
  )

  return (
    <section
      id={story.sectionId}
      aria-labelledby={titleId}
      data-role-accent={role}
      className="py-16 outline-none sm:py-24"
    >
      {wide ? (
        // Row 2 takes the slack beside the taller steps, so the buttons stay under the words.
        <Container className="grid gap-7 lg:grid-cols-2 lg:grid-rows-[auto_1fr_auto] lg:gap-x-16">
          {intro}
          {steps}
          {actions}
          <div className="mt-5 lg:col-span-2 lg:mt-7">{PICTURES[role]}</div>
        </Container>
      ) : (
        <Container className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col gap-7">
            {intro}
            {steps}
            {actions}
          </div>
          <div>{PICTURES[role]}</div>
        </Container>
      )}
    </section>
  )
}
