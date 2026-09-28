/*
 * Reserved spots in the game side panel for features from later phases.
 * They render nothing today, so the player sees no placeholders.
 *
 *   "win-rope"     Phase 3: live win % bar (the "rope")
 *   "hint-orbs"    Phase 3: 2 hint orbs per game (Stockfish MultiPV = 3)
 *   "move-explain" Phase 4: card that names and explains the last move
 */
export type SlotName = 'win-rope' | 'hint-orbs' | 'move-explain'

export function PanelSlot(_props: { name: SlotName }) {
  return null
}
