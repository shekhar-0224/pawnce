/*
 * Talks to Stockfish running in a Web Worker.
 *
 * We use the single-threaded "lite" build, which works on any static host
 * (no special security headers needed). Its files are copied to
 * /public/stockfish by scripts/copy-stockfish.mjs.
 *
 * Stockfish speaks UCI, a plain-text protocol: we send lines like
 * "position fen ..." and "go movetime 300", it answers "bestmove e2e4".
 */

const ENGINE_URL = `${import.meta.env.BASE_URL}stockfish/stockfish-19-lite-single.js`

export type SearchOptions = {
  fen: string
  skillLevel: number
  movetimeMs: number
  depth?: number
}

type Waiter = { match: (line: string) => boolean; resolve: (line: string) => void }

class StockfishEngine {
  private worker: Worker | null = null
  private ready: Promise<void> | null = null
  private waiters: Waiter[] = []
  private queue: Promise<unknown> = Promise.resolve()

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

  /** Ask for the best move in UCI form ("e2e4", "e7e8q"), or null if none. */
  bestMove(opts: SearchOptions): Promise<string | null> {
    // Searches run one at a time, in order.
    const run = async () => {
      await this.init()
      this.send(`setoption name Skill Level value ${opts.skillLevel}`)
      this.send(`position fen ${opts.fen}`)
      const limits = [`movetime ${opts.movetimeMs}`]
      if (opts.depth) limits.push(`depth ${opts.depth}`)
      const done = this.waitFor((l) => l.startsWith('bestmove'))
      this.send(`go ${limits.join(' ')}`)
      const line = await done
      const move = line.split(/\s+/)[1]
      return move && move !== '(none)' ? move : null
    }
    const result = this.queue.then(run, run)
    this.queue = result.catch(() => undefined)
    return result
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
    const i = this.waiters.findIndex((w) => w.match(line))
    if (i >= 0) {
      const [w] = this.waiters.splice(i, 1)
      w.resolve(line)
    }
  }
}

/** One shared engine for the whole app. */
export const engine = new StockfishEngine()
