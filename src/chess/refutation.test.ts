import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { parseUci } from './game'
import { describeLoss, describeMissed, explainSlip } from './refutation'

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

// 1.e4 Nc6 2.Nf3 Na5 3.Bc4 a6 4.d3 h6 5.Nc3 e5??: the pawn on e5 hangs (Nxe5 wins it).
// The knight on a5 attacks the bishop on c4, but d3 defends it: only a trade.
const BEFORE_OO = ['e4', 'Nc6', 'Nf3', 'Na5', 'Bc4', 'a6', 'd3', 'h6', 'Nc3', 'e5']

describe('explainSlip: a missed win, not the opponent’s even trade', () => {
  it('6.O-O?? after 5...e5: "You missed Nxe5, which wins the pawn on e5."', () => {
    const { fen, uci } = setup(BEFORE_OO)
    const after = new Chess(fen)
    after.move('O-O')
    const afterPv = uci(after.fen(), ['Nxc4', 'dxc4', 'd6', 'Nd5'])
    const beforePv = uci(fen, ['Nxe5', 'Nxc4', 'dxc4', 'd6', 'Nf3'])
    const r = explainSlip({
      fenBefore: fen,
      move: parseUci('e1g1'),
      after: { pv: afterPv, best: afterPv[0], mate: null },
      before: { pv: beforePv },
    })
    expect(r?.text).toBe('You missed Nxe5, which wins the pawn on e5.')
    expect(r?.text).not.toContain('c4')
  })

  it('the even trade on c4 alone is not a loss', () => {
    const { fen, uci } = setup(BEFORE_OO)
    const after = new Chess(fen)
    after.move('O-O')
    expect(describeLoss(fen, parseUci('e1g1'), uci(after.fen(), ['Nxc4', 'dxc4', 'd6', 'Nd5']))).toBeNull()
  })

  it('a real loss still comes first (8.a3?? names the g5 bishop)', () => {
    const { fen, uci } = setup(BEFORE_A3)
    const after = new Chess(fen)
    after.move('a3')
    const r = explainSlip({
      fenBefore: fen,
      move: parseUci('a2a3'),
      after: { pv: uci(after.fen(), ['fxg5', 'Nxg5', 'Nxc4', 'dxc4']), best: null, mate: null },
      before: { pv: uci(fen, ['Be3', 'Nxc4', 'dxc4']) },
    })
    expect(r?.text).toBe('Your bishop on g5 is still attacked by the pawn on f6, and you didn’t move it.')
  })

  it('nothing lost and no material missed: names the better move, no made-up threat', () => {
    const { fen, uci } = setup(BEFORE_OO)
    const after = new Chess(fen)
    after.move('O-O')
    const r = explainSlip({
      fenBefore: fen,
      move: parseUci('e1g1'),
      after: { pv: uci(after.fen(), ['Nxc4', 'dxc4', 'd6', 'Nd5']), best: null, mate: null },
      before: { pv: uci(fen, ['a3', 'd6']) },
    })
    expect(r?.text).toBe('You missed a3, a much stronger move.')
  })

  it('from your side when the bot misses a win', () => {
    const { fen, uci } = setup(BEFORE_OO)
    const r = describeMissed(fen, uci(fen, ['Nxe5', 'Nxc4', 'dxc4', 'd6', 'Nf3']), 'punisher')
    expect(r?.text).toBe('They missed Nxe5, which would have won your pawn on e5.')
  })
})

describe('describeMissed: a missed attack', () => {
  it('a winning king hunt without material yet: "starts a strong attack"', () => {
    const { fen, uci } = setup(BEFORE_OO)
    const r = describeMissed(fen, uci(fen, ['Bxf7+', 'Kxf7', 'Nxe5+', 'Kf6', 'Qh5', 'Ne7', 'Qf7+', 'Kxe5']))
    expect(r?.text).toBe('You missed Bxf7+: it starts a strong attack on their king.')
  })
})
