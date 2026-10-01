import { describe, expect, it } from 'vitest'
import { describeIdea } from './ideas'

// Hints while in check must say how the move gets out of check.
describe('describeIdea: hints while in check', () => {
  // 1.e4 e5 2.f3 Qh4+: White is in check.
  const QH4 = 'rnb1kbnr/pppp1ppp/8/4p3/4P2q/5P2/PPPP2PP/RNBQKBNR w KQkq - 1 3'

  it('a block says it blocks (and what it attacks)', () => {
    expect(describeIdea(QH4, 'g2g3', { pv: ['g2g3', 'h4e7', 'b1c3'] })).toBe(
      'Gets out of check by blocking with your pawn, and it attacks their queen.',
    )
  })

  it('a king move says the king steps out', () => {
    expect(describeIdea(QH4, 'e1e2', { pv: ['e1e2', 'h4f2', 'e2d3'] })).toBe('Gets out of check: your king steps to e2.')
  })

  it('taking the checking piece says so', () => {
    const fen = '4k3/8/8/8/8/8/5q2/6K1 w - - 0 1'
    expect(describeIdea(fen, 'g1f2', { pv: ['g1f2', 'e8d7', 'f2e3'] })).toBe('Gets out of check by taking the checking queen for free.')
  })

  it('double check: only the king can move', () => {
    const fen = '4k3/8/8/8/8/5n2/8/r3K3 w - - 0 1'
    expect(describeIdea(fen, 'e1e2', { pv: ['e1e2', 'a1a2', 'e2f3'] })).toBe('Double check, so only the king can move: it steps to e2.')
  })

  it('a mate still comes first', () => {
    const fen = '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1'
    expect(describeIdea(fen, 'a1a8', { pv: ['a1a8'], mate: 1 })).toBe('Checkmate! This ends the game right now.')
  })
})
