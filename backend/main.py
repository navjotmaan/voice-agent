import asyncio
import json
import os

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket
from websockets.asyncio.client import connect
from websockets.exceptions import ConnectionClosed

from gemini import forward_gemini_messages, send_audio_chunk

load_dotenv()

app = FastAPI()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MODEL_NAME = "gemini-3.1-flash-live-preview"

WS_URL = (
    "wss://generativelanguage.googleapis.com/ws/"
    "google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"
    f"?key={GEMINI_API_KEY}"
)

knowledge_base_function = {
    "type": "function",
    "name": "search_knowledge_base",
    "description":
        "Searches the knowledge base before answering.",
    "parameters": {
        "type": "OBJECT",
        "properties": {
        "query": {
            "type": "STRING",
            "description":
            "A concise semantic search query describing the information needed from the knowledge base."
        }
        },
        "required": ["query"]
    }
}

SYSTEM_PROMPT = """
You are an AI assistant with access to a knowledge base.

You MUST call search_knowledge_base function before answering. And if the related context doesn't exist in the knowledge base, you have to reply saying you don't know.
"""

def build_setup_message() -> dict:
    return {
        "setup": {
            "model": f"models/{MODEL_NAME}",
            "generationConfig": {"responseModalities": ["AUDIO"]},
            "tools": [{"functionDeclarations": knowledge_base_function}],
            "inputAudioTranscription": {},
            "outputAudioTranscription": {},
            "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        }
    }


async def browser_to_gemini(browser_ws: WebSocket, gemini_ws):
    """Replaces ws.on('message'). Returns on stop or disconnect."""
    while True:
        message = await browser_ws.receive()

        if message["type"] == "websocket.disconnect":
            return

        if message.get("text") is not None:
            try:
                msg = json.loads(message["text"])
            except json.JSONDecodeError:
                continue
            if isinstance(msg, dict) and msg.get("action") == "stop":
                print("Stopping")
                return
            continue

        if message.get("bytes") is not None:  # raw PCM
            await send_audio_chunk(gemini_ws, message["bytes"])


@app.websocket("/ws")
async def ws_endpoint(browser_ws: WebSocket):
    await browser_ws.accept()  # required, or the browser gets a 403
    print("Browser connected")

    try:
        async with connect(WS_URL) as gemini_ws:
            print("Gemini connected")
            await gemini_ws.send(json.dumps(build_setup_message()))

            tasks = [
                asyncio.create_task(browser_to_gemini(browser_ws, gemini_ws)),
                asyncio.create_task(forward_gemini_messages(gemini_ws, browser_ws)),
            ]
            done, pending = await asyncio.wait(
                tasks, return_when=asyncio.FIRST_COMPLETED
            )
            for task in pending:
                task.cancel()
            await asyncio.gather(*pending, return_exceptions=True)
            for task in done:
                task.result()

    except ConnectionClosed:
        pass
    except Exception as e:
        print("Error:", e)
    finally:
        print("Browser disconnected")
        try:
            await browser_ws.close()  # no-op if already closed
        except RuntimeError:
            pass