import base64
import json
import asyncio

from dotenv import load_dotenv
from fastapi import WebSocketDisconnect
from websockets.exceptions import ConnectionClosed
from db.queries import search_knowledge_base

load_dotenv()

async def send_to_browser(ws, data):
    try:
        if isinstance(data, bytes):
            await ws.send_bytes(data)
        else:
            await ws.send_text(data)
    except (WebSocketDisconnect, RuntimeError):
        pass  # browser already gone


async def json_to_browser(ws, payload: dict):
    await send_to_browser(ws, json.dumps(payload))


async def json_to_gemini(ws, payload: dict):
    try:
        await ws.send(json.dumps(payload))
    except ConnectionClosed:
        pass


async def handle_tool_call(gemini_ws, tool_call: dict):
    function_responses = []

    for fc in tool_call.get("functionCalls", []):
        name = fc["name"]
        args = fc.get("args", {})

        try:
            if name == "search_knowledge_base":
                rows = await asyncio.to_thread(search_knowledge_base, args["query"])
                context = "\n\n".join(text for text, _ in rows)
                response = {"result": context}
            else:
                response = {"error": f"Unknown function: {name}"}
        except Exception as e:
            print(f"Tool {name} failed:", e)
            response = {"error": str(e)}

        function_responses.append({
            "id": fc["id"],
            "name": name,
            "response": response,
        })

    await json_to_gemini(gemini_ws, {
        "toolResponse": {"functionResponses": function_responses}
    })


async def forward_gemini_messages(gemini_ws, browser_ws):
    tool_tasks: set[asyncio.Task] = set()

    try:
        async for raw in gemini_ws:
            response = json.loads(raw)  # str or bytes

            if "setupComplete" in response:
                print("Gemini setup complete")
                continue

            if "toolCall" in response:
                task = asyncio.create_task(
                    handle_tool_call(gemini_ws, response["toolCall"])
                )
                tool_tasks.add(task)
                task.add_done_callback(tool_tasks.discard)
                continue

            server_content = response.get("serverContent")
            if not server_content:
                continue

            # Audio from Gemini -> raw bytes to the browser
            parts = (server_content.get("modelTurn") or {}).get("parts") or []
            for part in parts:
                inline = part.get("inlineData")
                if inline:
                    await send_to_browser(browser_ws, base64.b64decode(inline["data"]))

            if "inputTranscription" in server_content:
                await json_to_browser(browser_ws, {
                    "type": "input",
                    "text": server_content["inputTranscription"].get("text"),
                })

            if "outputTranscription" in server_content:
                await json_to_browser(browser_ws, {
                    "type": "output",
                    "text": server_content["outputTranscription"].get("text"),
                })

            if server_content.get("interrupted"):
                print("Gemini interrupted")
                await json_to_browser(browser_ws, {"type": "interrupt"})

    except Exception as e:
        print("Error:", e)

    finally:
        # Don't leave tool calls running after the session ends
        for task in tool_tasks:
            task.cancel()


async def send_audio_chunk(gemini_ws, chunk: bytes):
    """Sends browser PCM audio to Gemini."""
    message = {
        "realtimeInput": {
            "audio": {
                "data": base64.b64encode(chunk).decode("ascii"),
                "mimeType": "audio/pcm;rate=16000",
            }
        }
    }
    await json_to_gemini(gemini_ws, message)