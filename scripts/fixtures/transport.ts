import { lasaUtterance } from "@/gate"
import { lasaRiskFor } from "@/lasa"
import type { SessionFixture } from "@/realtime/protocol"
import { agentFrame, begin, created, ended, fixture, sttFrame, turn, userSaid } from "./frames"

export function echoPhantom(): SessionFixture {
  const id = "fixture-echo-phantom"
  return fixture({
    name: "echo-phantom",
    description:
      "the agent's own re-ask leaks back through the microphone and arrives as an STT turn during playback; it must be discarded because it matches the last transcript.agent line, or the drug name enters provenance without the human ever saying it",
    frames: [
      begin(0, id),
      created(10),
      userSaid(1500, "Hydromorphone", 1),
      sttFrame(1600, turn({ turnOrder: 1, startMs: 1500, specs: [["Morphine", 1.0]] })),
      agentFrame(2400, { type: "reply.started" }),
      agentFrame(2440, {
        type: "transcript.agent",
        text: lasaUtterance(lasaRiskFor("morphine")),
      }),
      sttFrame(
        3100,
        turn({
          turnOrder: 2,
          startMs: 3100,
          turnConfidence: 0.88,
          specs: [
            ["morphine", 0.93],
            ["and", 0.9],
            ["hydromorphone", 0.92],
            ["are", 0.91],
            ["on", 0.9],
          ],
        }),
      ),
      agentFrame(5200, { type: "reply.done" }),
      userSaid(6000, "Hydromorphone", 3),
      sttFrame(6100, turn({ turnOrder: 3, startMs: 6000, specs: [["Hydromorphone", 0.98]] })),
      ...ended(7500),
    ],
  })
}

export function socket3007(): SessionFixture {
  const id = "fixture-socket-3007"
  return fixture({
    name: "socket-3007",
    description:
      "an audio chunk outside the 50-1000 ms window closes the STT socket with 3007; the error frame carries the real reason, not the truncated close reason",
    frames: [
      begin(0, id),
      created(10),
      userSaid(1500, "Lisinopril", 1),
      sttFrame(1600, turn({ turnOrder: 1, startMs: 1500, specs: [["Lisinopril", 0.97]] })),
      agentFrame(2500, {
        type: "error",
        error: {
          code: "3007",
          message:
            "audio chunk duration outside the accepted 50-1000 ms window; the socket is closing",
        },
      }),
      ...ended(2600),
    ],
  })
}
