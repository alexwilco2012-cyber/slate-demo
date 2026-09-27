import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { EnvelopeSimpleIcon } from '@phosphor-icons/react'
import { useSlate } from '@/data'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { returnPathAfterSignIn, useSession } from '@/session'
import { inlineLinkClass } from '../layout/parts'
import { DemoInbox } from './demo-inbox'
import { fieldErrorsOf, messageOf, useOpenMagicLink, type SentLink } from './use-magic-link'

/**
 * "Signed up already? Get a sign-in link": for accounts made through sign-up in this browser.
 * A bottom sheet on phones, a dialog on larger screens.
 */
export function EmailSignIn() {
  const { api, demo } = useSlate()
  const { signIn } = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | undefined>()
  const [sending, setSending] = useState(false)
  const [link, setLink] = useState<SentLink | null>(null)
  const magic = useOpenMagicLink()

  function reset() {
    setLink(null)
    setEmailError(undefined)
    magic.clearError()
  }

  async function send(event: FormEvent) {
    event.preventDefault()
    setSending(true)
    setEmailError(undefined)
    try {
      const sentAt = demo.now()
      const sent = await api.requestMagicLink(email)
      setLink({ sent, sentAt })
    } catch (caught) {
      setEmailError(fieldErrorsOf(caught).email ?? messageOf(caught))
    } finally {
      setSending(false)
    }
  }

  async function openLink() {
    const person = await magic.open(link?.sent.demoToken)
    if (!person) return
    const wanted = location.pathname
    const from = (location.state as { from?: string } | null)?.from ?? wanted
    const role =
      person.roles.find((candidate) => from.startsWith(`/${candidate}`)) ?? person.roles[0]
    if (!role) return
    signIn({ personId: person.id, activeRole: role })
    setOpen(false)
    navigate(returnPathAfterSignIn(location.state, role), { replace: true })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <Button
        variant="secondary"
        onClick={() => setOpen(true)}
        iconStart={<EnvelopeSimpleIcon weight="bold" aria-hidden />}
      >
        Sign in with email
      </Button>
      <DialogContent
        title={link ? 'Check your email' : 'Sign in with email'}
        description={
          link
            ? `We sent a sign-in link to ${link.sent.sentTo}.`
            : 'For accounts you made with Sign up in this browser. We’ll send you a link, so there’s no password.'
        }
      >
        {link ? (
          <div className="flex flex-col gap-4">
            <DemoInbox
              sent={link.sent}
              sentAt={link.sentAt}
              purpose="sign-in"
              opening={magic.opening}
              error={magic.error}
              onOpen={openLink}
            />
            <p className="text-small text-muted">
              No account yet?{' '}
              <Link to="/signup" className={inlineLinkClass} onClick={() => setOpen(false)}>
                Sign up instead
              </Link>
              . Or{' '}
              <button type="button" onClick={reset} className={inlineLinkClass}>
                use a different email
              </button>
              .
            </p>
          </div>
        ) : (
          <form onSubmit={send} noValidate className="flex flex-col gap-5">
            <Input
              label="Email"
              type="email"
              inputMode="email"
              autoComplete="email"
              spellCheck={false}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={emailError}
            />
            <Button
              type="submit"
              loading={sending}
              size="lg"
              className="max-sm:w-full sm:self-start"
            >
              Send me a link
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
