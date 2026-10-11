// This code processes the audio in a different thread for effective processing

class PCMProcessor extends AudioWorkletProcessor {
    process(inputs, outputs, parameters) {
        const input = inputs[0];

        // convert the standard 32-bit floating-point audio data into 16-bit PCM binary data
        if (input && input.length > 0) {
            const float32 = input[0];

            if (float32.length > 0) {
                const int16 = new Int16Array(float32.length);
                for (let i = 0; i < float32.length; i++) {
                    const s = Math.max(-1, Math.min(1, float32[i]));
                    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
                }

                // Send the converted PCM 16-bit binary buffer back to the main UI thread via a MessagePort.
                this.port.postMessage(int16.buffer, [int16.buffer]);
            }
        }
        // Keep this processor alive for next audio block
        return true;
    }
}

// Register this class under the string name 'pcm-processor'
registerProcessor('pcm-processor', PCMProcessor);