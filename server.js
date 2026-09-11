import 'dotenv/config';
import { WebSocketServer, WebSocket } from 'ws';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = 'gemini-3.1-flash-live-preview';

const WS_URL =
  `wss://generativelanguage.googleapis.com/ws/` +
  `google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent` +
  `?key=${GEMINI_API_KEY}`;

const wss = new WebSocketServer({ port: 5050 });

export function setupGeminiListeners(geminiWS, ws) {
  geminiWS.onmessage = (event) => {
    const response = JSON.parse(event.data);

    if (response.setupComplete) {
      console.log('Gemini setup complete');
      return;
    }

    if (!response.serverContent) {
      return;
    }

    const serverContent = response.serverContent;

    if (serverContent.modelTurn?.parts) {
      for (const part of serverContent.modelTurn.parts) {
        if (part.inlineData) {
          const audioData = part.inlineData.data;

          const audioBuffer = Buffer.from(
            audioData,
            'base64'
          );

          if (ws.readyState === WebSocket.OPEN) {
            ws.send(audioBuffer);
          }
        }
      }
    }

    // if (serverContent.inputTranscription) {
    //   console.log(
    //     'User:',
    //     serverContent.inputTranscription.text
    //   );

    //   if (ws.readyState === WebSocket.OPEN) {
    //     ws.send(JSON.stringify({
    //       type: 'transcript',
    //       text: serverContent.inputTranscription.text
    //     }));
    //   }
    // }

    // if (serverContent.outputTranscription) {
    //   console.log(
    //     'Gemini:',
    //     serverContent.outputTranscription.text
    //   );
    // }

    if (serverContent.interrupted) {
      console.log('Gemini interrupted');

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'interrupt'
        }));
      }
    }

    if (serverContent.turnComplete) {
      console.log('Gemini turn complete');

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'turnComplete'
        }));
      }
    }
  };

  geminiWS.onerror = (error) => {
    console.error('Gemini WebSocket error:', error);
  };

  geminiWS.onclose = (event) => {
    console.log(
      'Gemini WebSocket closed:',
      event.code,
      event.reason?.toString()
    );
  };
}

export function sendAudioChunk(geminiWS, chunk) {
  if (geminiWS.readyState !== WebSocket.OPEN) {
    return;
  }

  const audioMessage = {
    realtimeInput: {
      audio: {
        data: chunk.toString('base64'),
        mimeType: 'audio/pcm;rate=16000'
      }
    }
  };

  geminiWS.send(JSON.stringify(audioMessage));
}

wss.on('connection', (ws) => {
  console.log('Browser connected');

  const geminiWS = new WebSocket(WS_URL);

  geminiWS.on('open', () => {
    console.log('Gemini connected');

    const setupMessage = {
      setup: {
        model: `models/${MODEL_NAME}`,
        generationConfig: {
          responseModalities: ['AUDIO']
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        systemInstruction: {
          parts: [
            {
              text: 'Give precise and to the point responses.'
            }
          ]
        }
      }
    };

    geminiWS.send(JSON.stringify(setupMessage));
  });

  setupGeminiListeners(geminiWS, ws);

  ws.on('message', (data, isBinary) => {

    if (!isBinary) {
      try {
        const msg = JSON.parse(data);

        if (msg.action === 'stop') {
          console.log('Stopping');

          if (geminiWS.readyState === WebSocket.OPEN) {
            geminiWS.close();
          }

          ws.close();
        }

      } catch {
        // Ignore invalid JSON
      }

      return;
    }

    // Browser sent raw PCM
    if (geminiWS.readyState === WebSocket.OPEN) {
      sendAudioChunk(geminiWS, Buffer.from(data));
    }
  });

  ws.on('close', () => {
    console.log('Browser disconnected');

    if (geminiWS.readyState === WebSocket.OPEN) {
      geminiWS.close();
    }
  });
});

console.log('WebSocket server running on ws://localhost:5050');