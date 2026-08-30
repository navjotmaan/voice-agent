import 'dotenv/config';
import { WebSocketServer, WebSocket } from 'ws';
import querystring from 'querystring';
import { setupGeminiListeners, sendTextMessage } from './gemini.js';

const ASSEMBLY_API_KEY = process.env.ASSEMBLYAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const MODEL_NAME = "gemini-3.1-flash-live-preview";
const WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${GEMINI_API_KEY}`;

const params = { speech_model: "universal-3-5-pro", sample_rate: 16000 };
const endpoint = `wss://streaming.assemblyai.com/v3/ws?${querystring.stringify(params)}`;

const wss = new WebSocketServer({ port: 5050 });
const MIN_CHUNK_SIZE = 3200; 

wss.on('connection', (ws) => {
  // console.log('WS connection established....');

  let audioBuffer = Buffer.alloc(0);

  const assemblyWS = new WebSocket(endpoint, { headers: { Authorization: ASSEMBLY_API_KEY } });
  const geminiWS = new WebSocket(WS_URL);

  geminiWS.on('open', () => {
    // console.log('Gemini webSocket Connected');
    setupGeminiListeners(geminiWS, ws); 

    const setupMessage = {
      setup: {
        model: `models/${MODEL_NAME}`,
        generationConfig: {
          responseModalities: ['AUDIO'],
        },
        outputAudioTranscription: {},
        systemInstruction: {
          parts: [{ text: 'Give precise and to the point response.' }]
        }
        }
    };

    geminiWS.send(JSON.stringify(setupMessage));
    // console.log('Configuration sent');
  });

  ws.on("message", (data, isBinary) => {
    if (!isBinary) {
      try {
        const msg = JSON.parse(data);

        if (msg.action === "stop" && assemblyWS.readyState === WebSocket.OPEN) {
          // Send any remaining buffered audio before terminating
          if (audioBuffer.length > 0) {
            assemblyWS.send(audioBuffer);
            audioBuffer = Buffer.alloc(0);
          }

          assemblyWS.send(JSON.stringify({ type: "Terminate" }));
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "done" }));
            ws.close();
            geminiWS.close();
          }
        }
      } catch (e) {
        return;
      }
    }

    if (assemblyWS.readyState === WebSocket.OPEN) {
      // Append incoming frame to our server-side buffer
      audioBuffer = Buffer.concat([audioBuffer, Buffer.from(data)]);

      // Only send to AssemblyAI when we have accumulated >= 100ms of audio
      while (audioBuffer.length >= MIN_CHUNK_SIZE) {
        const chunkToSend = audioBuffer.subarray(0, MIN_CHUNK_SIZE);
        audioBuffer = audioBuffer.subarray(MIN_CHUNK_SIZE);
        assemblyWS.send(chunkToSend);
      }
    }
  });

  assemblyWS.on("message", (msg) => {
    const data = JSON.parse(msg);

    if (data.type === 'Turn') {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          text: data.transcript,
          end_of_turn: data.end_of_turn,
        }));

        if (data.end_of_turn && data.transcript?.trim()) {
          sendTextMessage(geminiWS, data.transcript);
        }
      }
    }
  });

  assemblyWS.on("error", (error) => {
    console.error("AssemblyAI WebSocket error:", error);
  });

  assemblyWS.on("close", () => {
    console.log("AssemblyAI WebSocket closed");
  });

  ws.on("close", () => {
    console.log("Client WebSocket closed");

    if (assemblyWS.readyState === WebSocket.OPEN) {
      assemblyWS.send(
        JSON.stringify({
          type: "Terminate",
        })
      );
    }

    if (geminiWS.readyState === WebSocket.OPEN) {
      geminiWS.close();
    }
  });
});

console.log('WebSocket server running on ws://localhost:5050');