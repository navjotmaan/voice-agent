'use client';

import { useState, useRef } from "react";
import PCMStreamPlayer from "./pcm-player";

export default function VoiceAgent() {
  const [recording, setRecording] = useState(false);
  // const [transcript, setTranscript] = useState("");
  // const [partialText, setPartialText] = useState("");

  const socket = useRef<WebSocket | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const source = useRef<MediaStreamAudioSourceNode | null>(null);
  const processor = useRef<AudioWorkletNode | null>(null);
  const player = useRef<PCMStreamPlayer | null>(null);

  async function startSession() {
    socket.current = new WebSocket('ws://localhost:5050');
    socket.current.binaryType = 'arraybuffer';

    // setTranscript("");
    setRecording(true);

    if (!player.current) {
      player.current = new PCMStreamPlayer();
    }
    // This is called from the button's onClick, so it counts as a user gesture
    await player.current.resume();

    socket.current.onopen = async () => {
      // console.log('websocket connection....');

      try {
        stream.current = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

        audioContext.current = new AudioContext({ sampleRate: 16000 });

        await audioContext.current.audioWorklet.addModule('pcm-processor.js');

        source.current = audioContext.current.createMediaStreamSource(stream.current);
        processor.current = new AudioWorkletNode(audioContext.current, 'pcm-processor');
        
        processor.current.port.onmessage = (event) => {
          if (socket.current?.readyState !== WebSocket.OPEN) return;

          const pcmBuffer = event.data;
          socket.current.send(pcmBuffer);
        }

        source.current.connect(processor.current);

      } catch (error) {
        console.error(error);
      }
    };

    socket.current.onmessage = (event) => {
      if (typeof event.data === "string") {
        const message = JSON.parse(event.data);

        if (message.type === "done") {
          // setPartialText("");
          return;
        }
        // if (message.text) {
        //   if (message.end_of_turn) {
        //     setTranscript((prev) => (prev ? `${prev}\n${message.text}` : message.text));
        //     setPartialText("");
        //   } else {
        //     setPartialText(message.text);
        //   }
        // }
        // return;
      }

      if (event.data instanceof ArrayBuffer) {
        player.current?.enqueue(event.data);
        return;
      }
    };

    socket.current.onerror = (error) => console.error("Websocket error:", error);
    socket.current.onclose = () => console.log("Websocket closed");
  };

  const endSession = () => {
    // 1. Stop all tracks in the MediaStream (turns off microphone hardware/indicator)
    if (stream.current) {
      stream.current.getTracks().forEach((track) => track.stop());
      stream.current = null;
    }

    // 2. Disconnect and close the AudioWorklet processor
    if (processor.current) {
      processor.current.port.onmessage = null;
      processor.current.disconnect();
      processor.current = null;
    }

    // 3. Close the AudioContext to release audio resources
    if (audioContext.current && audioContext.current.state !== 'closed') {
      audioContext.current.close();
      audioContext.current = null;
    }

    if (socket.current?.readyState === WebSocket.OPEN) {
      socket.current.send(JSON.stringify({ action: "stop" }));
    }

    setRecording(false);
  };

  return (
    <div className="flex flex-col flex-1 items-center justify-center gap-5 bg-zinc-50 font-sans dark:bg-black">
      {/* <p>Parital text: {partialText}</p>
      <p>Transcript: {transcript ? transcript : "No transcript available."}</p>  */}


      <div
        className="w-full flex flex-col items-center justify-center gap-8"
      >
      <style>{`
        @keyframes pulseRing {
          0%   { transform: scale(0.85); opacity: 0.55; }
          70%  { transform: scale(1.55); opacity: 0; }
          100% { transform: scale(1.55); opacity: 0; }
        }
        @keyframes glowBreathe {
          0%, 100% {
            box-shadow: 0 0 18px 3px rgba(239,68,68,0.45),
                        0 0 40px 12px rgba(239,68,68,0.2);
          }
          50% {
            box-shadow: 0 0 30px 8px rgba(239,68,68,0.75),
                        0 0 65px 20px rgba(239,68,68,0.35);
          }
        }
        .rb-ring {
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          border: 2px solid rgba(248,113,113,0.7);
          animation: pulseRing 2s cubic-bezier(0.4,0,0.6,1) infinite;
        }
        .rb-circle-recording {
          animation: glowBreathe 1.6s ease-in-out infinite;
          border-color: #f87171 !important;
        }
        .rb-btn {
          transition: transform 150ms ease, filter 150ms ease, box-shadow 150ms ease;
        }
        .rb-btn:hover {
          transform: scale(1.06);
          filter: brightness(1.2);
        }
        .rb-btn:active {
          transform: scale(0.94);
        }
      `}</style>
 
      <div
        style={{ width: 200, height: 200, position: "relative" }}
        className="flex items-center justify-center"
      >
        {recording && (
          <>
            <span className="rb-ring" style={{ animationDelay: "0s" }} />
            <span className="rb-ring" style={{ animationDelay: "0.65s" }} />
            <span className="rb-ring" style={{ animationDelay: "1.3s" }} />
          </>
        )}
        <span
          style={{
            width: 200,
            height: 200,
            borderWidth: 3,
            borderStyle: "solid",
            borderColor: recording ? "#f87171" : "white",
            borderRadius: "9999px",
            transition: "border-color 400ms ease",
          }}
          className={recording ? "rb-circle-recording" : ""}
        />
      </div>
 
      <button
        className={`rb-btn border-2 font-bold py-2 px-4 rounded-xl cursor-pointer ${
          recording ? "border-red-500 text-red-300" : "border-yellow-300 text-yellow-300"
        }`}
        style={{
          boxShadow: recording
            ? "0 0 0 rgba(239,68,68,0)"
            : "0 0 0 rgba(253,224,71,0)",
        }}
        onClick={recording ? endSession : startSession}
      >
        {recording ? "End Session" : "Start Session"}
      </button>
      </div>
    </div>
  );
}