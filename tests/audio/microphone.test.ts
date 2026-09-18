import { afterEach, describe, expect, it, vi } from "vitest"
import {
  MicrophoneFailureReason,
  MicrophonePermissionError,
  requestMicrophone,
} from "@/audio/microphone"

function domException(name: string): DOMException {
  return new DOMException(`synthetic ${name}`, name)
}

function stubMediaDevices(getUserMedia: (() => Promise<MediaStream>) | undefined) {
  const navigatorStub = getUserMedia === undefined ? {} : { mediaDevices: { getUserMedia } }
  vi.stubGlobal("navigator", navigatorStub)
}

function stubSecureContext(secure: boolean) {
  vi.stubGlobal("window", { ...globalThis.window, isSecureContext: secure })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("requestMicrophone separates the real failure modes, because they need different words", () => {
  it("classifies a permission refusal as denied", async () => {
    stubSecureContext(true)
    stubMediaDevices(async () => {
      throw domException("NotAllowedError")
    })
    await expect(requestMicrophone()).rejects.toMatchObject({
      reason: MicrophoneFailureReason.Denied,
    })
  })

  it("classifies no input device as absent, not as a refusal", async () => {
    stubSecureContext(true)
    stubMediaDevices(async () => {
      throw domException("NotFoundError")
    })
    let caught: unknown
    try {
      await requestMicrophone()
    } catch (error) {
      caught = error
    }
    expect(caught).toBeInstanceOf(MicrophonePermissionError)
    expect(
      (caught as MicrophonePermissionError).reason,
      "a judge with no microphone at all did not refuse anything; the words must say so",
    ).toBe(MicrophoneFailureReason.NoDevice)
  })

  it("classifies a busy device distinctly from an absent one", async () => {
    stubSecureContext(true)
    stubMediaDevices(async () => {
      throw domException("NotReadableError")
    })
    await expect(requestMicrophone()).rejects.toMatchObject({
      reason: MicrophoneFailureReason.DeviceBusy,
    })
  })

  it("classifies an insecure context ahead of whatever the device error says", async () => {
    stubSecureContext(false)
    stubMediaDevices(async () => {
      throw domException("NotAllowedError")
    })
    await expect(requestMicrophone()).rejects.toMatchObject({
      reason: MicrophoneFailureReason.InsecureContext,
    })
  })

  it("classifies a missing mediaDevices object as insecure context when the page itself is insecure", async () => {
    stubSecureContext(false)
    stubMediaDevices(undefined)
    await expect(requestMicrophone()).rejects.toMatchObject({
      reason: MicrophoneFailureReason.InsecureContext,
    })
  })

  it("falls back to unknown for a device error this table does not name", async () => {
    stubSecureContext(true)
    stubMediaDevices(async () => {
      throw domException("AbortError")
    })
    await expect(requestMicrophone()).rejects.toMatchObject({
      reason: MicrophoneFailureReason.Unknown,
    })
  })

  it("resolves with the stream on success, unaffected by the new classification", async () => {
    const stream = { getTracks: () => [] } as unknown as MediaStream
    stubSecureContext(true)
    stubMediaDevices(async () => stream)
    await expect(requestMicrophone()).resolves.toBe(stream)
  })
})
