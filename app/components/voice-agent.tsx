'use client';

import { useState, useRef } from "react";
import PCMStreamPlayer from "./pcm-player";
import AudioOrbCard from "./animation/ring";
import LoadingOrb from "./animation/loading";
import ReactMarkdown from 'react-markdown';
import WebSearchResult from "./web-result";

export interface WebSearchResponse {
  id: number;
  url: string;
  title: string;
}

export default function VoiceAgent() {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");

  const [loading, setLoading] = useState(false);
  const [webSearchResult, setWebSearchResult] = useState<WebSearchResponse[]>([]);
  const [jobSearchResult, setJobSearchResult] = useState<WebSearchResponse[]>([]);

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

        if (message.type === "interrupt") {
          player.current?.interrupt();
          return;
        }

        if (message.type === "input") {
          setTranscript(message.text);
          setLoading(true);
          setResponse("");
        }

        if (message.type === "output") {
          setResponse((prev) => (prev ? `${prev}\n${message.text}` : message.text));
        }

        if (message.type === 'web_search_result') {
          setWebSearchResult(message.text);
          setLoading(false);
        }

        if (message.type === 'job_search_result') {
          setJobSearchResult(message.text);
          setLoading(false);
        }
      }

      if (event.data instanceof ArrayBuffer) {
        player.current?.enqueue(event.data);
        return;
      }
    };

    socket.current.onerror = (error) => console.error("Websocket error:", error);
    socket.current.onclose = () => console.log("Websocket closed");
  };

  async function endSession() {
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

    // 4. STOP GEMINI AUDIO IMMEDIATELY
    if (player.current) {
      await player.current.close();
      player.current = null;
    }

    if (socket.current?.readyState === WebSocket.OPEN) {
      socket.current.send(JSON.stringify({ action: "stop" }));
    }

    setRecording(false);
  };

  return (
    <div className="flex flex-1 items-center justify-center lg:gap-20 lg:m-20 m-10 bg-zinc-50 font-sans dark:bg-black">

      <div className="flex flex-col justify-center items-center gap-10">
        <AudioOrbCard animate={recording} />
 
        <button
          onClick={recording ? endSession : startSession}
          className={`group relative cursor-pointer overflow-hidden rounded-2xl border px-6 py-2.5 font-semibold tracking-wide backdrop-blur-md transition-all duration-300 ease-out active:scale-95 ${
            recording
              ? "border-red-400/50 bg-red-950/30 text-red-200 shadow-[0_0_18px_2px_rgba(248,113,113,0.35)] hover:border-red-300/70 hover:shadow-[0_0_26px_4px_rgba(248,113,113,0.55)]"
              : "border-violet-400/50 bg-violet-950/30 text-violet-100 shadow-[0_0_18px_2px_rgba(168,85,247,0.35)] hover:border-violet-300/70 hover:shadow-[0_0_26px_4px_rgba(168,85,247,0.55)]"
          }`}
        >
          <span
            className={`pointer-events-none absolute inset-0 rounded-2xl opacity-50 blur-md transition-opacity duration-300 group-hover:opacity-70 ${
              recording ? "bg-red-500/30" : "bg-violet-500/30"
            }`}
          />
          <span className="relative flex items-center justify-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                recording ? "bg-red-400 animate-pulse" : "bg-violet-300"
              }`}
            />
            {recording ? "End Session" : "Start Session"}
          </span>
        </button>
      </div>

      {transcript && 
        <div className="hidden md:block bg-purple-800/40 py-10 px-6 rounded-xl flex-1 w-60 h-[500px] overflow-y-auto">
          <p className="mb-8"><b>You:</b> {transcript}</p> 
          <p><b>Agent Response:</b></p>

          {loading && <LoadingOrb />}
          
          {jobSearchResult.length > 0 && WebSearchResult(jobSearchResult)} 
          {webSearchResult.length > 0 && WebSearchResult(webSearchResult)} 
          
          <ReactMarkdown>{response}</ReactMarkdown>
        </div>
      }
    </div>
  );
}