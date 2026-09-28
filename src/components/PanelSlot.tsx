/*
 * Reserved spots in the game side panel for features from later phases.
 * They render nothing today, so the player sees no placeholders.
 *
 *   "move-explain" Phase 4: card that names and explains the last move
 */
export type SlotName = 'move-explain'

export function PanelSlot(_props: { name: SlotName }) {
  return null
}
