import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useSession } from './hooks'
import { hasSessionParams, sessionFromParams, withoutSessionParams } from './session'

/**
 * Applies ?as=<personId>&role=<role>[&for=<landlordId>] from the URL to this tab's session, then
 * takes the parameters out of the address so a reload or a shared link doesn't carry them. Used
 * by the demo page's iframes and the persona shortcuts. Mount once, inside the router.
 */
export function SessionFromUrl() {
  const location = useLocation()
  const navigate = useNavigate()
  const { signIn } = useSession()

  // A passive effect: on first load the router only starts listening to history in its own
  // layout effect, after its children's, so an earlier navigate would be lost. Until this runs,
  // the portal gate waits rather than redirecting.
  useEffect(() => {
    if (!hasSessionParams(location.search)) return
    const session = sessionFromParams(location.search, location.pathname)
    if (session) signIn(session)
    navigate(
      {
        pathname: location.pathname,
        search: withoutSessionParams(location.search),
        hash: location.hash,
      },
      { replace: true, state: location.state },
    )
  }, [location, navigate, signIn])

  return null
}
