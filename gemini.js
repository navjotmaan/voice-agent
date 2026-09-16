import { createEmbedding } from "./rag/embeddings.js";
import { searchUserMemory } from './db/query.js';

export function setupGeminiListeners(geminiWS, ws) {
  geminiWS.onmessage = async (event) => {
    const response = JSON.parse(event.data);

    if (response.setupComplete) {
      console.log('Gemini setup complete');
      return;
    }

    // Gemini wants to use a tool
    if (response.toolCall) {
      const functionResponses = [];

      for (const functionCall of response.toolCall.functionCalls) {

        if (functionCall.name === "search_user_memory") {
          const query = functionCall.args.query;
          // console.log("RAG query:", query);

          const queryEmbedding = await createEmbedding(query);

          const results = await searchUserMemory(queryEmbedding);
      
          const context = results
          .map(result => result.content)
          .join("\n\n");

          functionResponses.push({
            id: functionCall.id,
            name: functionCall.name,
            response: {
              result: context
            }
          });
        }
      }

      const toolResponse = {
        toolResponse: {
          functionResponses
        }
      };

      geminiWS.send(JSON.stringify(toolResponse));

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

    if (serverContent.inputTranscription) {
      // console.log(
      //   'User:',
      //   serverContent.inputTranscription.text
      // );

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'input',
          text: serverContent.inputTranscription.text
        }));
      }
    }

    if (serverContent.outputTranscription) {
      // console.log(
      //   'Gemini:',
      //   serverContent.outputTranscription.text
      // );

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'output',
          text: serverContent.outputTranscription.text
        }));
      }
    }

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

// This function send the audio chunks to Gemini
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