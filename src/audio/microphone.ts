import { Chunker } from "./chunker"
import {
  AGENT_SAMPLE_RATE,
  floatToPcm16,
  pcm16Bytes,
  resampleLinear,
  STT_SAMPLE_RATE,
} from "./resample"

export const CAPTURE_SAMPLE_RATE = 48000
export const CHUNK_MS = 100
export const WORKLET_URL = "/worklets/capture-processor.js"

export const MIC_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1,
  },
  video: false,
}

export type CaptureSinks = {
  readonly onSttFrame: (bytes: Uint8Array) => void
  readonly onAgentFrame: (samples: Int16Array) => void
  readonly onLevel?: (peak: number) => void
}

export class MicrophonePermissionError extends Error {
  readonly code = "MIC_PERMISSION_DENIED"

  constructor(cause: unknown) {
    super("the microphone permission was refused or no input device is available")
    this.name = "MicrophonePermissionError"
    this.cause = cause
  }
}

export type MicrophoneCapture = {
  readonly contextSampleRate: number
  setSttMuted: (muted: boolean) => void
  stop: () => Promise<void>
}

export async function requestMicrophone(): Promise<MediaStream> {
  const media = globalThis.navigator?.mediaDevices
  if (media === undefined) {
    throw new MicrophonePermissionError(new Error("mediaDevices is unavailable"))
  }
  try {
    return await media.getUserMedia(MIC_CONSTRAINTS)
  } catch (cause) {
    throw new MicrophonePermissionError(cause)
  }
}

export async function startCapture(
  stream: MediaStream,
  sinks: CaptureSinks,
): Promise<MicrophoneCapture> {
  const context = new AudioContext({ sampleRate: CAPTURE_SAMPLE_RATE })
  await context.audioWorklet.addModule(WORKLET_URL)
  const source = context.createMediaStreamSource(stream)
  const node = new AudioWorkletNode(context, "capture-processor", {
    numberOfInputs: 1,
    numberOfOutputs: 0,
    processorOptions: { frameSize: 1024 },
  })
  source.connect(node)

  const sttChunker = new Chunker(STT_SAMPLE_RATE, CHUNK_MS)
  const agentChunker = new Chunker(AGENT_SAMPLE_RATE, CHUNK_MS)
  let sttMuted = false

  node.port.onmessage = (event: MessageEvent) => {
    const data = event.data as { type?: string; frame?: Float32Array; peak?: number }
    if (data.type !== "frame" || data.frame === undefined) {
      return
    }
    const frame = data.frame
    if (sinks.onLevel !== undefined && typeof data.peak === "number") {
      sinks.onLevel(data.peak)
    }
    const agentFrames = agentChunker.push(
      resampleLinear(frame, context.sampleRate, AGENT_SAMPLE_RATE),
    )
    for (const chunk of agentFrames) {
      sinks.onAgentFrame(floatToPcm16(chunk))
    }
    if (sttMuted) {
      return
    }
    const sttFrames = sttChunker.push(
      resampleLinear(frame, context.sampleRate, STT_SAMPLE_RATE),
    )
    for (const chunk of sttFrames) {
      sinks.onSttFrame(pcm16Bytes(floatToPcm16(chunk)))
    }
  }

  return {
    contextSampleRate: context.sampleRate,
    setSttMuted: (muted: boolean) => {
      sttMuted = muted
      node.port.postMessage({ type: "mute", muted })
      if (muted) {
        sttChunker.reset()
      }
    },
    stop: async () => {
      node.port.onmessage = null
      try {
        source.disconnect()
        node.disconnect()
      } catch {
        void 0
      }
      for (const track of stream.getTracks()) {
        track.stop()
      }
      await context.close()
    },
  }
}
