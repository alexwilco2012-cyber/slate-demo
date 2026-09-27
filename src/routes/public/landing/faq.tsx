import { Link } from 'react-router'
import { ArrowRightIcon, PlusIcon } from '@phosphor-icons/react'
import { cn } from '@/components/ui/cn'
import { FAQS } from '../content/faq'
import { Container, inlineLinkClass } from '../layout/parts'
import { leadClass, sectionTitleClass, SectionLabel } from './parts'

/** Native disclosure widgets: keyboard and screen reader support come with them. */
export function FaqSection() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="border-t border-line py-20 outline-none sm:py-28 lg:py-32"
    >
      <Container className="grid gap-10 lg:grid-cols-12 lg:gap-x-12">
        <div className="flex flex-col gap-5 lg:col-span-5">
          <div className="flex flex-col gap-5 lg:sticky lg:top-28">
            <SectionLabel>Questions</SectionLabel>
            <h2 id="faq-title" className={cn(sectionTitleClass, 'text-ink')}>
              Questions people ask.
            </h2>
            <p className={cn(leadClass, 'text-muted')}>
              Can’t see yours? Try the demo. Every screen in it works.
            </p>
          </div>
        </div>
        <div className="public-faq flex flex-col border-t border-line lg:col-span-7">
          {FAQS.map((faq) => (
            <details key={faq.id} className="group border-b border-line">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 rounded-control py-5 text-title leading-snug font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                {faq.question}
                <span
                  aria-hidden="true"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line text-ink transition-[background-color,rotate] duration-(--duration-base) ease-out-soft group-open:rotate-45 group-open:bg-surface-2"
                >
                  <PlusIcon weight="bold" className="size-4" />
                </span>
              </summary>
              <div className="flex max-w-prose flex-col gap-3 pb-7 text-body-l text-muted">
                <p>{faq.answer}</p>
                {faq.more ? (
                  <Link
                    to={faq.more.to}
                    className={`${inlineLinkClass} inline-flex items-center gap-1.5 self-start text-body`}
                  >
                    {faq.more.label}
                    <ArrowRightIcon weight="bold" aria-hidden className="size-4" />
                  </Link>
                ) : null}
              </div>
            </details>
          ))}
        </div>
      </Container>
    </section>
  )
}
