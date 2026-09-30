import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { parseUci } from './game'
import { describeLoss } from './refutation'

/** Play SAN moves from the start and return the FEN plus a helper to turn SAN lines into UCI. */
function setup(sans: string[]) {
  const g = new Chess()
  for (const s of sans) g.move(s)
  const fen = g.fen()
  const uci = (fenAt: string, line: string[]) => {
    const h = new Chess(fenAt)
    return line.map((s) => h.move(s).lan)
  }
  return { fen, uci }
}

// 1.e4 e5 2.Nf3 d6 3.Bc4 Nc6 4.d3 Na5 5.Bg5 a6 6.Nc3 c6 7.O-O f6: the pawn on f6
// attacks the bishop on g5, and the knight on a5 attacks the bishop on c4.
const BEFORE_A3 = ['e4', 'e5', 'Nf3', 'd6', 'Bc4', 'Nc6', 'd3', 'Na5', 'Bg5', 'a6', 'Nc3', 'c6', 'O-O', 'f6']

describe('describeLoss: the real loss, not the first reply', () => {
  it('7...f6 8.a3??: names the bishop on g5, still attacked by the f6 pawn', () => {
    const { fen, uci } = setup(BEFORE_A3)
    const after = new Chess(fen)
    after.move('a3')
    const pv = uci(after.fen(), ['fxg5', 'Nxg5', 'Nxc4', 'dxc4'])
    const r = describeLoss(fen, parseUci('a2a3'), pv)
    expect(r?.text).toBe('Your bishop on g5 is still attacked by the pawn on f6, and you didn’t move it.')
  })

  it('does not blame the even trade on c4 when the engine starts with Nxc4', () => {
    const { fen, uci } = setup(BEFORE_A3)
    const after = new Chess(fen)
    after.move('a3')
    // First reply is a capture White can take back evenly (dxc4); the real loss is on g5.
    const pv = uci(after.fen(), ['Nxc4', 'dxc4', 'fxg5', 'Nxg5', 'h6'])
    const r = describeLoss(fen, parseUci('a2a3'), pv)
    expect(r?.text).toContain('bishop on g5')
    expect(r?.text).not.toContain('c4')
  })

  it('the queen on a6: names the queen and the pawn that takes it', () => {
    const { fen, uci } = setup(['d4', 'd5', 'Qd3', 'Nf6'])
    const after = new Chess(fen)
    after.move('Qa6')
    const pv = uci(after.fen(), ['bxa6', 'Nf3', 'Nc6', 'Nc3'])
    const r = describeLoss(fen, parseUci('d3a6'), pv)
    expect(r?.text).toBe('Your queen on a6 can be taken by the pawn on b7 for free.')
  })

  it('the queen on a6: still names the pawn when the engine takes with the knight', () => {
    const { fen, uci } = setup(['d4', 'd5', 'Qd3', 'Nf6'])
    const after = new Chess(fen)
    after.move('Qa6')
    const pv = uci(after.fen(), ['Nxa6', 'a3', 'c6', 'Nc3'])
    expect(describeLoss(fen, parseUci('d3a6'), pv)?.text).toBe('Your queen on a6 can be taken by the pawn on b7 for free.')
  })

  it('8.a3??: a delayed recapture on c4 is still an even trade', () => {
    const { fen, uci } = setup(BEFORE_A3)
    const after = new Chess(fen)
    after.move('a3')
    // Black takes on c4 first; White plays Qe2 and only takes back later.
    const pv = uci(after.fen(), ['Nxc4', 'Qe2', 'fxg5', 'dxc4', 'h6'])
    const r = describeLoss(fen, parseUci('a2a3'), pv)
    expect(r?.text).toContain('bishop on g5')
  })

  it('8.a3??: White saves g5 instead of recapturing on c4, still names g5', () => {
    const { fen, uci } = setup(BEFORE_A3)
    const after = new Chess(fen)
    after.move('a3')
    const pv = uci(after.fen(), ['Nxc4', 'Bc1', 'Nb6', 'a4'])
    const r = describeLoss(fen, parseUci('a2a3'), pv)
    expect(r?.text).toBe('Your bishop on g5 is still attacked by the pawn on f6, and you didn’t move it.')
  })

  it('the queen on a6, left there: "still attacked" when another move is played', () => {
    // After 3.Qa6? Black didn't take; White now plays 4.Nf3?? leaving the queen en prise.
    const { fen, uci } = setup(['d4', 'd5', 'Qd3', 'Nf6', 'Qa6', 'Nc6'])
    const after = new Chess(fen)
    after.move('Nf3')
    const pv = uci(after.fen(), ['bxa6', 'e3', 'e6', 'Bxa6'])
    const r = describeLoss(fen, parseUci('g1f3'), pv)
    expect(r?.text).toBe('Your queen on a6 is still attacked by the pawn on b7, and you didn’t move it.')
  })

  it('returns null for an even trade (nothing really lost)', () => {
    const { fen, uci } = setup(['e4', 'e5', 'Nf3', 'Nc6', 'd4'])
    const after = new Chess(fen)
    after.move('exd4')
    const pv = uci(after.fen(), ['Nxd4', 'Nxd4', 'Qxd4', 'Nf6'])
    expect(describeLoss(fen, parseUci('e5d4'), pv)).toBeNull()
  })

  it('speaks from the punisher’s side for the bot’s slips', () => {
    const { fen, uci } = setup(BEFORE_A3)
    const after = new Chess(fen)
    after.move('a3')
    const pv = uci(after.fen(), ['fxg5', 'Nxg5'])
    const r = describeLoss(fen, parseUci('a2a3'), pv, 'punisher')
    expect(r?.text).toBe('Their bishop on g5 is still attacked by your pawn on f6, and they didn’t move it.')
  })
})
