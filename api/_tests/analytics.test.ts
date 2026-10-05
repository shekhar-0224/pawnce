import { describe, expect, it } from 'vitest'
import { handle, memoryStore, normalizePath, readStats } from '../analytics.ts'

const NOW = Date.parse('2026-10-05T12:00:00Z')
const post = (body: unknown, country = 'IN') =>
  new Request('http://x/api/analytics', { method: 'POST', body: JSON.stringify(body), headers: { 'x-vercel-ip-country': country } })
const env = { ADMIN_PASSWORD: 'secret' }

describe('analytics API', () => {
  it('records events and adds them up for the dashboard', async () => {
    const store = memoryStore()
    const send = (b: object, c?: string) => handle(post({ vid: 'v1', sid: 's1', w: 390, ...b }, c), env, store, NOW)
    await send({ e: 'page_view', p: { path: '/', first: true, ref: 'https://www.google.com/search' } })
    await send({ e: 'page_view', p: { path: '/game/abc123/summary' } })
    await send({ e: 'game_start', p: { bot: 'frog', side: 'white', tc: 'none' } })
    await send({ e: 'game_end', p: { bot: 'frog', result: 'win', reason: 'checkmate', moves: 24, ms: 300000 } })
    await handle(post({ vid: 'v2', sid: 's2', w: 1440, e: 'page_view', p: { path: '/', first: true } }, 'US'), env, store, NOW)
    const s = await readStats(store, 7, NOW)
    expect(s.visitors).toBe(2)
    expect(s.players).toBe(1)
    expect(s.finishers).toBe(1)
    expect(s.totals['e:page_view']).toBe(3)
    expect(s.totals['p:/game/*/summary']).toBe(1)
    expect(s.totals['ref:google.com']).toBe(1)
    expect(s.totals['ref:direct']).toBe(1)
    expect(s.totals['c:IN']).toBe(1)
    expect(s.totals['dev:phone']).toBe(2)
    expect(s.totals['dev:desktop']).toBe(1)
    expect(s.totals['res:win']).toBe(1)
    expect(s.totals['sum:secs']).toBe(300)
    expect(s.days.at(-1)?.visitors).toBe(2)
    expect(s.recent[0].e).toBe('page_view')
  })

  it('ignores unknown events and unknown properties', async () => {
    const store = memoryStore()
    await handle(post({ vid: 'v', sid: 's', e: 'hack', p: { x: 1 } }), env, store, NOW)
    await handle(post({ vid: 'v', sid: 's', e: 'hint', p: { evil: 'x' } }), env, store, NOW)
    const s = await readStats(store, 1, NOW)
    expect(Object.keys(s.totals)).toEqual(['e:hint'])
  })

  it('the dashboard needs the password', async () => {
    const store = memoryStore()
    const get = (auth?: string) => handle(new Request('http://x/api/analytics?days=7', { headers: auth ? { authorization: auth } : {} }), env, store, NOW)
    expect((await get()).status).toBe(401)
    expect((await get('Bearer nope')).status).toBe(401)
    expect((await get('Bearer secret')).status).toBe(200)
    expect((await handle(new Request('http://x/api/analytics'), {}, store, NOW)).status).toBe(503)
  })

  it('without a database, recording is a silent no-op', async () => {
    expect((await handle(post({ vid: 'v', sid: 's', e: 'hint' }), env, null, NOW)).status).toBe(204)
  })

  it('pages, not ids', () => {
    expect(normalizePath('/words/fork')).toBe('/words/*')
    expect(normalizePath('/play')).toBe('/play')
  })
})
