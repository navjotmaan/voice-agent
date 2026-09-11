// This code takes PCM audio data sent by Gemini,
// converts it to 32-bit floating-point audio,
// and plays the response.

export default class PCMStreamPlayer {
  private ctx: AudioContext;
  private nextStartTime = 0;
  private sampleRate = 24000;

  // Keep track of every source that has been scheduled
  private sources = new Set<AudioBufferSourceNode>();

  constructor() {
    this.ctx = new AudioContext({ sampleRate: this.sampleRate });
  }

  async resume() {
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
  }

  enqueue(arrayBuffer: ArrayBuffer) {
    const view = new DataView(arrayBuffer);
    const sampleCount = arrayBuffer.byteLength / 2;
    const float32 = new Float32Array(sampleCount);

    for (let i = 0; i < sampleCount; i++) {
      const int16 = view.getInt16(i * 2, true);

      float32[i] =
        int16 < 0
          ? int16 / 0x8000
          : int16 / 0x7fff;
    }

    const audioBuffer = this.ctx.createBuffer(
      1,
      sampleCount,
      this.sampleRate
    );

    audioBuffer.getChannelData(0).set(float32);

    const src = this.ctx.createBufferSource();
    src.buffer = audioBuffer;
    src.connect(this.ctx.destination);

    // Track this source
    this.sources.add(src);

    // Remove it from the set when it naturally finishes
    src.onended = () => {
      this.sources.delete(src);
    };

    const startAt = Math.max(
      this.nextStartTime,
      this.ctx.currentTime
    );

    src.start(startAt);

    this.nextStartTime = startAt + audioBuffer.duration;
  }

  interrupt() {
    // Stop every currently playing/scheduled audio source
    for (const src of this.sources) {
      try {
        src.stop();
      } catch {
        // Source may already have stopped
      }

      src.disconnect();
    }

    // Clear all tracked sources
    this.sources.clear();

    // Forget the old playback schedule
    this.nextStartTime = this.ctx.currentTime;
  }

  async close() {
    this.interrupt();

    if (this.ctx.state !== "closed") {
      await this.ctx.close();
    }
  }
}