/*
 * Talks to Stockfish running in a Web Worker.
 *
 * We use the single-threaded "lite" build, which works on any static host
 * (no special security headers needed). Its files are copied to
 * /public/stockfish by scripts/copy-stockfish.mjs.
 *
 * Stockfish speaks UCI, a plain-text protocol: we send lines like
 * "position fen ..." and "go movetime 300", it answers with "info ..."
 * lines while it thinks and "bestmove e2e4" when it's done.
 *
 * There are two engines:
 *   - `engine`  plays as the bot (weakened with Skill Level)
 *   - `analyst` judges positions at full strength (win % and hints)
 */

const ENGINE_URL = `${import.meta.env.BASE_URL}stockfish/stockfish-19-lite-single.js`

export type SearchOptions = {
  fen: string
  movetimeMs: number
  depth?: number
  /** 0 (weakest) to 20 (full strength). */
  skillLevel?: number
  /** How many best lines to return (1 to 5). */
  multiPv?: number
}

/** One line of play the engine found. Scores are from the side to move. */
export type EngineLine = {
  /** First move in UCI form, e.g. "g1f3". */
  move: string
  /** The whole expected continuation. */
  pv: string[]
  /** Centipawns (100 = one pawn ahead), when there's no forced mate. */
  cp?: number
  /** Moves to checkmate: positive if the side to move mates, negative if it gets mated. */
  mate?: number
  depth: number
}

export type SearchResult = { bestMove: string | null; lines: EngineLine[] }

type Waiter = { match: (line: string) => boolean; resolve: (line: string) => void }

class StockfishEngine {
  private worker: Worker | null = null
  private ready: Promise<void> | null = null
  private waiters: Waiter[] = []
  private queue: Promise<unknown> = Promise.resolve()
  private onInfo: ((line: string) => void) | null = null
  private searching = false
  private latestRequest = 0

  /** Start the worker (once) and wait until the engine says it's ready. */
  init(): Promise<void> {
    if (!this.ready) {
      this.ready = new Promise<void>((resolve, reject) => {
        try {
          this.worker = new Worker(ENGINE_URL)
        } catch (err) {
          reject(err)
          return
        }
        this.worker.onmessage = (e: MessageEvent) => this.onLine(String(e.data))
        this.worker.onerror = (e) => {
          e.preventDefault()
          reject(new Error(e.message || 'Stockfish failed to load'))
        }
        this.waitFor((l) => l === 'uciok')
          .then(() => {
            this.send('isready')
            return this.waitFor((l) => l === 'readyok')
          })
          .then(() => resolve())
        this.send('uci')
      }).catch((err) => {
        // Allow a later retry.
        this.ready = null
        this.worker?.terminate()
        this.worker = null
        throw err
      })
    }
    return this.ready
  }

  /** Run one search. Searches run one at a time, in the order asked. */
  search(opts: SearchOptions): Promise<SearchResult> {
    const run = async (): Promise<SearchResult> => {
      await this.init()
      if (opts.skillLevel !== undefined) {
        this.send(`setoption name Skill Level value ${opts.skillLevel}`)
      }
      this.send(`setoption name MultiPV value ${opts.multiPv ?? 1}`)
      this.send(`position fen ${opts.fen}`)

      const lines = new Map<number, EngineLine>()
      this.onInfo = (line) => {
        const parsed = parseInfo(line)
        if (parsed) lines.set(parsed.index, parsed.line)
      }
      const limits = [`movetime ${opts.movetimeMs}`]
      if (opts.depth) limits.push(`depth ${opts.depth}`)
      const done = this.waitFor((l) => l.startsWith('bestmove'))
      this.searching = true
      this.send(`go ${limits.join(' ')}`)
      const last = await done
      this.searching = false
      this.onInfo = null

      const move = last.split(/\s+/)[1]
      return {
        bestMove: move && move !== '(none)' ? move : null,
        lines: [...lines.entries()].sort((a, b) => a[0] - b[0]).map(([, l]) => l),
      }
    }
    const result = this.queue.then(run, run)
    this.queue = result.catch(() => undefined)
    return result
  }

  /** Ask for the best move in UCI form ("e2e4", "e7e8q"), or null if none. */
  async bestMove(opts: SearchOptions): Promise<string | null> {
    return (await this.search(opts)).bestMove
  }

  /**
   * Like `search`, but only the newest request matters: an older search
   * still running is cut short, and ones still waiting are skipped
   * (they resolve to null).
   */
  async analyse(opts: SearchOptions): Promise<SearchResult | null> {
    const id = ++this.latestRequest
    if (this.searching) this.send('stop')
    const result = await this.queue.then(() => {
      if (id !== this.latestRequest) return null
      return this.search(opts)
    })
    return id === this.latestRequest ? result : null
  }

  /** Tell the engine a fresh game is starting (clears its memory). */
  newGame() {
    if (this.worker) this.send('ucinewgame')
  }

  private send(cmd: string) {
    this.worker?.postMessage(cmd)
  }

  private waitFor(match: (line: string) => boolean): Promise<string> {
    return new Promise((resolve) => this.waiters.push({ match, resolve }))
  }

  private onLine(line: string) {
    if (line.startsWith('info ')) this.onInfo?.(line)
    const i = this.waiters.findIndex((w) => w.match(line))
    if (i >= 0) {
      const [w] = this.waiters.splice(i, 1)
      w.resolve(line)
    }
  }
}

/** Read an "info ... multipv 2 score cp 34 ... pv e2e4 e7e5" line. */
function parseInfo(line: string): { index: number; line: EngineLine } | null {
  if (!line.includes(' pv ') || line.includes('bound')) return null
  const score = / score (cp|mate) (-?\d+)/.exec(line)
  if (!score) return null
  const pv = line.slice(line.indexOf(' pv ') + 4).trim().split(/\s+/)
  const index = Number(/ multipv (\d+)/.exec(line)?.[1] ?? 1)
  const depth = Number(/ depth (\d+)/.exec(line)?.[1] ?? 0)
  const value = Number(score[2])
  return {
    index,
    line: {
      move: pv[0],
      pv,
      depth,
      ...(score[1] === 'cp' ? { cp: value } : { mate: value }),
    },
  }
}

/** The bot's engine. */
export const engine = new StockfishEngine()

/** A second, full-strength engine that judges positions (win %, hints). */
export const analyst = new StockfishEngine()
