import { Link } from 'react-router'
import { ArrowRightIcon, PlusIcon } from '@phosphor-icons/react'
import { FAQS } from '../content/faq'
import { Container, inlineLinkClass, SectionHeading } from '../layout/parts'

/** Native disclosure widgets: keyboard and screen reader support come with them. */
export function FaqSection() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="py-16 outline-none sm:py-24">
      <Container className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <SectionHeading
          id="faq-title"
          title="Questions people ask"
          intro="Can’t see your question? Try the demo. Every screen in it works."
        />
        <div className="public-faq flex flex-col border-t border-line">
          {FAQS.map((faq) => (
            <details key={faq.id} className="group border-b border-line">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-control py-4 text-title leading-snug font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                {faq.question}
                <PlusIcon
                  weight="bold"
                  aria-hidden
                  className="size-5 shrink-0 text-muted transition-transform duration-(--duration-base) ease-out-soft group-open:rotate-45"
                />
              </summary>
              <div className="flex max-w-prose flex-col gap-3 pb-6 text-body text-muted">
                <p>{faq.answer}</p>
                {faq.more ? (
                  <Link
                    to={faq.more.to}
                    className={`${inlineLinkClass} inline-flex items-center gap-1.5 self-start`}
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
