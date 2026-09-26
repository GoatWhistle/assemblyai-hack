import type { EchoGuard } from "@/audio/echo-guard"
import { type SessionBinding, type WordSpan, wordSpanFromTurnWord } from "@/domain"
import type { AgentClientEvents } from "@/realtime/agent-client"
import type { CloseExplanation } from "@/realtime/close-codes"
import type { SttClientEvents } from "@/realtime/stt-client"
import { checkBeginModel } from "@/realtime/stt-model"
import type { AgentAudioSink } from "./agent-audio"
import type { AgentTurnAssembler } from "./agent-turns"
import type { ReplyWatchdog } from "./session-timers"

export type CallerTurn = {
  readonly transcript: string
  readonly turnOrder: number
  readonly isFormatted: boolean
  readonly words: readonly WordSpan[]
}

export type SocketName = "stt" | "agent"

export type SessionWiring = {
  readonly guard: EchoGuard
  readonly audio: AgentAudioSink
  readonly turns: AgentTurnAssembler
  readonly watchdog: ReplyWatchdog
  readonly activity: () => void
  readonly setSttMuted: (muted: boolean) => void
  readonly setAgentSpeaking: (speaking: boolean) => void
  readonly onAgentLine?: (text: string) => void
  readonly onTranscriptTurn?: (turn: CallerTurn, discarded: boolean) => void
  readonly onEchoDiscarded: (overlap: number) => void
  readonly onClose: (
    socket: SocketName,
    explanation: CloseExplanation,
    expected: boolean,
  ) => void
  readonly onBound: (binding: SessionBinding) => void
  readonly onModel: (model: string | null) => void
  readonly onModelMismatch: (model: string) => void
  readonly onAgentError: (code: string, message: string) => void
  readonly onAgentAudio?: (base64: string) => void
}

export function releaseHalfDuplex(wiring: SessionWiring): void {
  wiring.guard.replyDone()
  wiring.setSttMuted(false)
  wiring.setAgentSpeaking(false)
}

export function agentEventsFor(wiring: SessionWiring): AgentClientEvents {
  return {
    onBound: (binding) => wiring.onBound(binding),
    onReplyStarted: (replyId) => {
      wiring.activity()
      wiring.guard.replyStarted()
      wiring.setSttMuted(true)
      wiring.setAgentSpeaking(true)
      wiring.watchdog.replyStarted()
      wiring.audio.beginReply()
      wiring.turns.started(replyId)
    },
    onReplyDone: (status, replyId) => {
      wiring.activity()
      wiring.watchdog.replyDone()
      releaseHalfDuplex(wiring)
      if (status === "interrupted") {
        wiring.audio.interrupt()
      }
      wiring.turns.done(status, replyId, wiring.audio.settleReply())
    },
    onAgentTranscript: (text, replyId, interrupted) => {
      wiring.guard.noteAgentTranscript(text)
      wiring.onAgentLine?.(text)
      wiring.turns.transcript(text, replyId, interrupted)
    },
    onUserTranscript: () => wiring.activity(),
    onReplyAudio: (base64) => {
      wiring.watchdog.replyProgress()
      wiring.onAgentAudio?.(base64)
      wiring.audio.enqueue(base64)
    },
    onAgentError: (code, message) => wiring.onAgentError(code, message),
    onSpeechStarted: () => {
      wiring.activity()
      wiring.audio.interrupt()
    },
    onClose: (explanation, expected) => wiring.onClose("agent", explanation, expected),
  }
}

export function sttEventsFor(wiring: SessionWiring): SttClientEvents {
  return {
    onBegin: (begin) => {
      wiring.onModel(checkBeginModel(begin).model)
    },
    onModelMismatch: (model) => wiring.onModelMismatch(model),
    onTurn: (turn) => {
      if (turn.transcript.trim().length > 0) {
        wiring.activity()
      }
      if (!turn.end_of_turn) {
        return
      }
      const caller: CallerTurn = {
        transcript: turn.transcript,
        turnOrder: turn.turn_order,
        isFormatted: turn.turn_is_formatted,
        words: turn.words.map((word) => wordSpanFromTurnWord(word)),
      }
      const verdict = wiring.guard.inspectTurn(turn.transcript)
      if (verdict.discard) {
        wiring.onEchoDiscarded(verdict.overlap)
        wiring.onTranscriptTurn?.(caller, true)
        return
      }
      wiring.onTranscriptTurn?.(caller, false)
    },
    onClose: (explanation, expected) => wiring.onClose("stt", explanation, expected),
  }
}
