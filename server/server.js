import 'dotenv/config';
import { WebSocketServer, WebSocket } from 'ws';
import { setupGeminiListeners, sendAudioChunk } from './gemini.js';
import { searchUserMemory, searchWeb, findJobs } from './function-declaration.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = 'gemini-3.1-flash-live-preview';

const WS_URL =
  `wss://generativelanguage.googleapis.com/ws/` +
  `google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent` +
  `?key=${GEMINI_API_KEY}`;

const wss = new WebSocketServer({ port: 5050 });

wss.on('connection', (ws) => {
  console.log('Browser connected');

  const geminiWS = new WebSocket(WS_URL);

  geminiWS.on('open', () => {
    console.log('Gemini connected');

    const setupMessage = {
      setup: {
        model: `models/${MODEL_NAME}`,
        generationConfig: {
          responseModalities: ['AUDIO'],
        },
        tools: [
          {
            functionDeclarations: [
              searchUserMemory, 
              searchWeb, 
              findJobs
            ]
          }
        ],
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        systemInstruction: {
          parts: [
            {
              text: `
                You are a personal AI assistant with access to the user's personal knowledge base.

                You MUST call search_user_memory whenever the user's question requires
                information about the user's personal goals, background, skills, projects,
                preferences, experiences, or current situation.

                You MUST call search_web whenever user asks to search anything from the web.

                You MUST call find_jobs whenever user asks to find jobs and companies.

                When user asks for any advice or guidance, consider user's data, suggest what will help based on  that and also suggest what the user needs to change and what mistakes he/she's making.

                you MUST call search_user_memory before answering.

                For ordinary questions that do not require personal information,
                do not call the tool.
                `
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