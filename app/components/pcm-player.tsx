// This code takes the PCM audio data sent by Gemini and converts it into 32-bit floating-point audio to play the response

export default class PCMStreamPlayer {
  private ctx: AudioContext;
  private nextStartTime = 0;
  private sampleRate = 24000;

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
      float32[i] = int16 < 0 ? int16 / 0x8000 : int16 / 0x7fff;
    }

    const audioBuffer = this.ctx.createBuffer(1, sampleCount, this.sampleRate);
    audioBuffer.getChannelData(0).set(float32);

    const src = this.ctx.createBufferSource();
    src.buffer = audioBuffer;
    src.connect(this.ctx.destination);

    const startAt = Math.max(this.nextStartTime, this.ctx.currentTime);
    src.start(startAt);
    this.nextStartTime = startAt + audioBuffer.duration;
  }

  async close() {
    if (this.ctx.state !== "closed") {
      await this.ctx.close();
    }
  }
}