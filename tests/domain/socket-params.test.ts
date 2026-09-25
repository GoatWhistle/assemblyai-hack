import { describe, expect, it } from "vitest"
import {
  SocketParamError,
  STT_MODEL,
  undocumentedAgentInput,
  undocumentedSttParams,
  unknownSocketParams,
} from "@/domain"

describe("H10: every socket parameter is checked against its own socket's documented list", () => {
  it("accepts the streaming parameters Readback actually sends", () => {
    expect(
      undocumentedSttParams({
        token: "t",
        speech_model: STT_MODEL,
        sample_rate: 16000,
        encoding: "pcm_s16le",
        domain: "medical-v1",
        format_turns: true,
        keyterms_prompt: [],
        min_turn_silence: 400,
        max_turn_silence: 1280,
        voice_focus: "near-field",
      }),
    ).toEqual([])
  })

  it("refuses the agent's min_silence on the streaming socket and names the right counterpart", () => {
    const offending = undocumentedSttParams({ min_silence: 400 })
    expect(offending).toEqual(["min_silence"])
    expect(new SocketParamError("stt", offending).message).toMatch(/min_turn_silence/)
  })

  it("refuses the streaming min_turn_silence inside the agent's turn_detection", () => {
    const offending = undocumentedAgentInput({ turn_detection: { min_turn_silence: 400 } })
    expect(offending).toEqual(["turn_detection.min_turn_silence"])
    expect(new SocketParamError("agent", offending).message).toMatch(/min_silence/)
  })

  it("accepts the documented agent input fields", () => {
    expect(
      undocumentedAgentInput({
        format: { encoding: "audio/pcm" },
        keyterms: [],
        turn_detection: { vad_threshold: 0.6, interrupt_response: true },
      }),
    ).toEqual([])
  })

  it("refuses an invented key on either socket", () => {
    expect(undocumentedSttParams({ speech_modle: "x" })).toEqual(["speech_modle"])
    expect(undocumentedAgentInput({ voice_focuss: "x" })).toEqual(["voice_focuss"])
  })

  it("pins the model to universal-3-5-pro, never the retired universal-3-pro", () => {
    expect(STT_MODEL).toBe("universal-3-5-pro")
  })
})

describe("H10: the scope-keyed form the browser consumes agrees with the object form", () => {
  it("reports the same offenders through unknownSocketParams", () => {
    expect(unknownSocketParams("stt_query", ["min_silence", "sample_rate"])).toEqual([
      "min_silence",
    ])
    expect(unknownSocketParams("agent_turn_detection", ["min_turn_silence"])).toEqual([
      "min_turn_silence",
    ])
    expect(unknownSocketParams("stt_update", ["min_turn_silence"])).toEqual([])
    expect(unknownSocketParams("agent_input", ["turn_detection", "keyterms"])).toEqual([])
    expect(unknownSocketParams("agent_session", ["input", "turn_detection"])).toEqual([
      "turn_detection",
    ])
  })
})
