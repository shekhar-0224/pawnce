import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState, type CSSProperties } from 'react'
import {
  type Arrow,
  Chessboard,
  type PieceRenderObject,
  type SquareRenderer,
  defaultArrowOptions,
} from 'react-chessboard'
import type { Chess } from 'chess.js'
import {
  type Color,
  type Move,
  type PieceSymbol,
  type Side,
  type Square,
  capturedSquare,
  isPromotionMove,
  kingSquare,
  legalMovesFrom,
  previewPawnMove,
} from '../chess/game'
import { color, font } from '../theme'
import { pieceCode, pieceSet } from '../theme/pieces'
import type { MoveInput } from './useGame'
import { PromotionPicker } from './PromotionPicker'

type Props = {
  game: Chess
  orientation: Side
  myColor: Color
  /** Whether the player may move right now. */
  canMove: boolean
  lastMove?: Move
  onMove: (move: MoveInput) => boolean
  /** Arrows to draw on the board (used by hints). */
  arrows?: Arrow[]
}

const MOVE_MS = 200
const CAPTURE_MS = 180

const layer: CSSProperties = { position: 'absolute', inset: 0, pointerEvents: 'none' }

export function ChessBoard({
  game,
  orientation,
  myColor,
  canMove,
  lastMove,
  onMove,
  arrows = [],
}: Props) {
  const [selected, setSelected] = useState<Square | null>(null)
  const [promotion, setPromotion] = useState<{ from: Square; to: Square } | null>(null)

  const fen = game.fen()
  const ply = game.history().length

  // Legal destinations for the selected piece.
  const targets = useMemo(() => {
    if (!selected || !canMove) return new Map<Square, Move>()
    return new Map(legalMovesFrom(game, selected).map((m) => [m.to, m]))
  }, [game, selected, canMove])

  const checkSquare = game.inCheck() ? kingSquare(game, game.turn()) : undefined

  // The piece captured by the last move, so it can shrink away.
  const capture = useMemo(() => {
    if (!lastMove?.captured) return null
    const victimColor: Color = lastMove.color === 'w' ? 'b' : 'w'
    return {
      square: capturedSquare(lastMove)!,
      code: pieceCode(victimColor, lastMove.captured),
      color: victimColor,
    }
  }, [lastMove])

  // While the capturing piece slides in, the real captured piece is hidden
  // and a shrinking copy is drawn in its place (see squareRenderer).
  const pieces = useMemo<PieceRenderObject>(() => {
    if (!capture) return pieceSet
    const wrapped: PieceRenderObject = {}
    for (const [code, Render] of Object.entries(pieceSet)) {
      wrapped[code] = (props) =>
        props?.square === capture.square && code[0] === capture.color ? (
          <span />
        ) : (
          <Render {...props} />
        )
    }
    return wrapped
  }, [capture])

  function tryMove(from: Square, to: Square): boolean {
    if (isPromotionMove(game, from, to)) {
      setPromotion({ from, to })
      setSelected(null)
      return true
    }
    setSelected(null)
    return onMove({ from, to })
  }

  function handleSquareClick(square: Square, pieceType: string | undefined) {
    if (!canMove || promotion) return
    if (selected && targets.has(square)) {
      tryMove(selected, square)
      return
    }
    if (pieceType && pieceType[0] === myColor && square !== selected) {
      setSelected(square)
    } else {
      setSelected(null)
    }
  }

  const squareRenderer: SquareRenderer = ({ square, children }) => {
    const sq = square as Square
    const isLast = lastMove && (lastMove.from === sq || lastMove.to === sq)
    const target = targets.get(sq)
    const isCaptureTarget = target && (target.captured || target.isEnPassant())
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {isLast && <div style={{ ...layer, background: color.lastMove }} />}
        {sq === selected && (
          <div
            style={{
              ...layer,
              background: 'color-mix(in srgb, var(--accent) 22%, transparent)',
              boxShadow: `inset 0 0 0 4px ${color.accent}`,
            }}
          />
        )}
        {sq === checkSquare && (
          <motion.div
            key={`check-${ply}`}
            style={{
              ...layer,
              background: `radial-gradient(circle, ${color.danger} 0%, color-mix(in srgb, var(--danger) 55%, transparent) 55%, transparent 80%)`,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.25, 1, 0.6] }}
            transition={{ duration: 1, ease: 'easeInOut' }}
          />
        )}
        {/* Positioned so the piece paints above the highlight layers. */}
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>{children}</div>
        {capture && sq === capture.square && (
          <CaptureGhost key={`cap-${ply}`} code={capture.code} square={sq} />
        )}
        {target && !isCaptureTarget && (
          <div style={{ ...layer, display: 'grid', placeItems: 'center' }}>
            <div
              style={{
                width: '30%',
                height: '30%',
                borderRadius: '50%',
                background: 'var(--move-dot)',
              }}
            />
          </div>
        )}
        {isCaptureTarget && (
          <div
            style={{
              ...layer,
              inset: '4%',
              borderRadius: '50%',
              boxShadow: `inset 0 0 0 5px color-mix(in srgb, var(--accent) 85%, transparent)`,
            }}
          />
        )}
      </div>
    )
  }

  const displayFen = promotion ? previewPawnMove(game, promotion.from, promotion.to) : fen

  const notation: CSSProperties = { fontFamily: font.body, fontWeight: 700, fontSize: 11 }

  return (
    <div className="relative w-full">
      <Chessboard
        options={{
          id: 'pawnce',
          position: displayFen,
          boardOrientation: orientation,
          pieces,
          animationDurationInMs: MOVE_MS,
          allowDrawingArrows: false,
          arrows,
          arrowOptions: { ...defaultArrowOptions, opacity: 0.85, arrowWidthDenominator: 6 },
          allowDragging: canMove && !promotion,
          allowDragOffBoard: false,
          dragActivationDistance: 4,
          canDragPiece: ({ piece }) => canMove && piece.pieceType[0] === myColor,
          boardStyle: {
            borderRadius: 8,
            overflow: 'hidden',
          },
          lightSquareStyle: { backgroundColor: color.boardLight },
          darkSquareStyle: { backgroundColor: color.boardDark },
          dropSquareStyle: { boxShadow: `inset 0 0 0 4px ${color.accent}` },
          draggingPieceStyle: { transform: 'scale(1.15)', filter: 'drop-shadow(0 6px 8px rgba(0,0,0,.35))' },
          lightSquareNotationStyle: { ...notation, color: color.boardDark },
          darkSquareNotationStyle: { ...notation, color: color.boardLight },
          alphaNotationStyle: { ...notation, position: 'absolute', bottom: 1, right: 4 },
          numericNotationStyle: { ...notation, position: 'absolute', top: 2, left: 4 },
          squareRenderer,
          onSquareClick: ({ square, piece }) =>
            handleSquareClick(square as Square, piece?.pieceType),
          onPieceDrag: ({ square }) => {
            if (canMove && square) setSelected(square as Square)
          },
          onPieceDragCancel: () => setSelected(null),
          onPieceDrop: ({ sourceSquare, targetSquare }) => {
            if (!canMove || !targetSquare || sourceSquare === targetSquare) return false
            const legal = legalMovesFrom(game, sourceSquare as Square).some(
              (m) => m.to === targetSquare,
            )
            if (!legal) {
              setSelected(null)
              return false
            }
            return tryMove(sourceSquare as Square, targetSquare as Square)
          },
        }}
      />
      <AnimatePresence>
        {promotion && (
          <PromotionPicker
            color={myColor}
            onPick={(piece: PieceSymbol) => {
              const { from, to } = promotion
              setPromotion(null)
              onMove({ from, to, promotion: piece })
            }}
            onCancel={() => setPromotion(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/** A copy of the captured piece that shrinks and fades away. */
function CaptureGhost({ code, square }: { code: string; square: Square }) {
  const Piece = pieceSet[code]
  return (
    <motion.div
      style={{ ...layer, zIndex: 5 }}
      initial={{ scale: 1, opacity: 1 }}
      animate={{ scale: 0.35, opacity: 0 }}
      transition={{ duration: CAPTURE_MS / 1000, ease: 'easeOut' }}
    >
      <Piece square={square} />
    </motion.div>
  )
}
