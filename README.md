# AI Voice Agent
An AI voice agent that listens to you and replies in voice.

## About
This is the first version of the voice agent. The goal is to learn and understand how to build AI agents and how they work under the hood.

## Getting Started

### Pre-requisite
- Node 18+

First, clone the repo and install dependencies:

```bash
git clone git@github.com:navjotmaan/voice-agent.git
cd voice-agent
npm install
```

## Configuration
Copy the variables from `.env.example` into your `.env`:
```bash
cp .env.example .env
```

Get your [Assembly api key](https://www.assemblyai.com/) and [Gemini api key](https://aistudio.google.com/api-keys) and then open your `.env` and add values.
```
ASSEMBLYAI_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
```
## Usage
Run the Next.js UI app:
```bash
npm run dev
```
Then, in another terminal tab, start the voice server:
```bash
node server.js
```

## How it works
- `server.js` is the server that takes the input audio and sends it to AssemblyAI via WebSockets.
- It receives the transcript from AssemblyAI and sends it to Gemini.
- `gemini.js` sends the transcript to Gemini and receives the audio response.
- That audio is sent back to the client.

## Note
The console logs are there to help you test the app on each step.