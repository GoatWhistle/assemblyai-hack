import type { AgentMessage, FixtureFrame, SessionFixture, SttMessage } from "./protocol"

export type FixturePlayerEvents = {
  onSttMessage?: (message: SttMessage, frame: FixtureFrame) => void
  onAgentMessage?: (message: AgentMessage, frame: FixtureFrame) => void
  onOutbound?: (frame: FixtureFrame) => void
  onProgress?: (playedMs: number, totalMs: number) => void
  onDone?: () => void
}

export type FixturePlayerOptions = {
  readonly speed?: number
  readonly events?: FixturePlayerEvents
  readonly scheduler?: (callback: () => void, delayMs: number) => () => void
}

const defaultScheduler = (callback: () => void, delayMs: number): (() => void) => {
  const timer = setTimeout(callback, delayMs)
  return () => clearTimeout(timer)
}

export function fixtureDurationMs(fixture: SessionFixture): number {
  return fixture.frames.reduce((max, frame) => (frame.atMs > max ? frame.atMs : max), 0)
}

function inboundFrames(fixture: SessionFixture): FixtureFrame[] {
  return [...fixture.frames].sort((a, b) => a.atMs - b.atMs)
}

export class FixturePlayer {
  private cancels: (() => void)[] = []
  private running = false
  private index = 0
  private readonly frames: FixtureFrame[]
  private readonly speed: number
  private readonly events: FixturePlayerEvents
  private readonly scheduler: (callback: () => void, delayMs: number) => () => void

  constructor(
    private readonly fixture: SessionFixture,
    options: FixturePlayerOptions = {},
  ) {
    this.frames = inboundFrames(fixture)
    this.speed = options.speed ?? 1
    this.events = options.events ?? {}
    this.scheduler = options.scheduler ?? defaultScheduler
  }

  get isRunning(): boolean {
    return this.running
  }

  get totalMs(): number {
    return fixtureDurationMs(this.fixture)
  }

  get playedFrames(): number {
    return this.index
  }

  start(): void {
    if (this.running) {
      return
    }
    this.running = true
    this.index = 0
    const total = this.totalMs
    for (const frame of this.frames) {
      const cancel = this.scheduler(() => {
        this.index += 1
        this.emit(frame)
        this.events.onProgress?.(frame.atMs, total)
        if (this.index === this.frames.length) {
          this.running = false
          this.events.onDone?.()
        }
      }, frame.atMs / this.speed)
      this.cancels.push(cancel)
    }
    if (this.frames.length === 0) {
      this.running = false
      this.events.onDone?.()
    }
  }

  stop(): void {
    for (const cancel of this.cancels) {
      cancel()
    }
    this.cancels = []
    this.running = false
  }

  drainSync(): void {
    for (const frame of this.frames) {
      this.index += 1
      this.emit(frame)
    }
    this.running = false
    this.events.onDone?.()
  }

  private emit(frame: FixtureFrame): void {
    if (frame.direction === "out") {
      this.events.onOutbound?.(frame)
      return
    }
    if (frame.socket === "stt") {
      this.events.onSttMessage?.(frame.message as SttMessage, frame)
      return
    }
    this.events.onAgentMessage?.(frame.message as AgentMessage, frame)
  }
}
