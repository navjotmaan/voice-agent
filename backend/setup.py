import json
from fastapi import WebSocket
from services.gemini import send_audio_chunk

MODEL_NAME = "gemini-3.1-flash-live-preview"

knowledge_base_function = {
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
You are an AI assistant from BrightSmile Dental Care clinic with access to the knowledge base and details of the clinic.

You MUST call search_knowledge_base function to get the details before answering. And if the related context doesn't exist in the knowledge base, you have to reply saying I don't know.
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