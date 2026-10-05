/*
 * Anonymous usage events for the /admin dashboard (see api/analytics.ts).
 *
 * No names, no emails, no IP addresses: a random id for this browser (to
 * count unique visitors) and one for this visit. Events are sent with
 * sendBeacon so they never slow the game down, and failures are ignored.
 * Your own browser stops being counted once you open /admin.
 */
type Props = Record<string, string | number | boolean | null | undefined>

const NO_TRACK_KEY = 'pawnce.noTrack'

function id(storage: Storage | undefined, key: string): string {
  try {
    const existing = storage?.getItem(key)
    if (existing) return existing
    const fresh = crypto.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
    storage?.setItem(key, fresh)
    return fresh
  } catch {
    return 'anon'
  }
}

export function trackingOff(): boolean {
  try {
    if (localStorage.getItem('pawnce.forceTrack') === '1') return false // tests
    // Automated browsers (bots, test runs) aren't real visitors.
    return localStorage.getItem(NO_TRACK_KEY) === '1' || navigator.webdriver === true
  } catch {
    return false
  }
}

/** Stop (or start again) counting this browser, e.g. the owner's own visits. */
export function setTrackingOff(off: boolean) {
  try {
    if (off) localStorage.setItem(NO_TRACK_KEY, '1')
    else localStorage.removeItem(NO_TRACK_KEY)
  } catch {
    // Not saved; fine.
  }
}

/** Record one event. Never throws, never waits. */
export function track(e: string, p: Props = {}) {
  if (typeof window === 'undefined' || trackingOff()) return
  try {
    const props = Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== null))
    const body = JSON.stringify({
      e,
      p: props,
      vid: id(localStorage, 'pawnce.vid'),
      sid: id(sessionStorage, 'pawnce.sid'),
      w: window.innerWidth,
    })
    const blob = new Blob([body], { type: 'application/json' })
    if (!navigator.sendBeacon?.('/api/analytics', blob)) {
      void fetch('/api/analytics', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => undefined)
    }
  } catch {
    // analytics must never break the app
  }
}

let firstView = true
let lastPath: string | null = null
/** A page view; the first one of a visit also notes where the visitor came from. */
export function trackPage(path: string) {
  if (path === lastPath) return // the same page reported twice (e.g. React dev double effects)
  lastPath = path
  const first = firstView
  firstView = false
  track('page_view', { path, first, ref: first && document.referrer && !document.referrer.includes(location.host) ? document.referrer : undefined })
}
