export function setupGeminiListeners(geminiWS, ws) {
  geminiWS.onmessage = (event) => {
    const response = JSON.parse(event.data);

    if (response.setupComplete) {
      console.log('Gemini setup complete');
      return;
    }

    if (response.serverContent) {
      const serverContent = response.serverContent;
      // Receiving Audio
      if (serverContent.modelTurn?.parts) {
        for (const part of serverContent.modelTurn.parts) {
          if (part.inlineData) {
            const audioData = part.inlineData.data; // Base64 encoded string
            // console.log(`Received audio data (base64 len: ${audioData.length})`);
            const audioBuffer = Buffer.from(audioData, 'base64'); // decode to raw PCM bytes
            ws.send(audioBuffer); // Buffer → ws sends this as a binary frame
          }
        }
      }
    }

    if (response.serverContent?.turnComplete) {
      console.log();
    }
  };

  geminiWS.on('error', (error) => {
    console.error('WebSocket Error:', error);
  });

  geminiWS.on('close', (code, reason) => {
    console.log(`Gemini webSocket Closed (Code: ${code}, Reason: ${reason.toString()})`);
  });
}

export function sendTextMessage(geminiWS, text) {
  if (geminiWS.readyState === WebSocket.OPEN) {
    const clientMessage = {
      clientContent: {
        turns: [{ role: 'user', parts: [{ text }] }],
        turnComplete: true
      }
    };
    geminiWS.send(JSON.stringify(clientMessage));
    // console.log('Text message sent:', text);
  } else {
    console.warn('WebSocket not open.');
  }
}