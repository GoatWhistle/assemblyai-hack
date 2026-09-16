const DEFAULT_FRAME = 1024

class CaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super()
    const requested = options && options.processorOptions && options.processorOptions.frameSize
    this.frameSize = typeof requested === "number" && requested > 0 ? requested : DEFAULT_FRAME
    this.buffer = new Float32Array(this.frameSize)
    this.filled = 0
    this.muted = false
    this.port.onmessage = (event) => {
      const data = event.data
      if (data && data.type === "mute") {
        this.muted = data.muted === true
      }
    }
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0]
    if (!channel) {
      return true
    }
    let peak = 0
    for (let i = 0; i < channel.length; i += 1) {
      const sample = channel[i]
      const magnitude = sample < 0 ? -sample : sample
      if (magnitude > peak) {
        peak = magnitude
      }
      this.buffer[this.filled] = sample
      this.filled += 1
      if (this.filled === this.frameSize) {
        const frame = this.buffer.slice(0)
        this.port.postMessage({ type: "frame", frame, muted: this.muted, peak }, [frame.buffer])
        this.filled = 0
        peak = 0
      }
    }
    return true
  }
}

registerProcessor("capture-processor", CaptureProcessor)
