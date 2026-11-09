import asyncio
import os
import json
from dotenv import load_dotenv

from fastapi import APIRouter, WebSocket
from websockets.asyncio.client import connect
from websockets.exceptions import ConnectionClosed

from services.gemini import forward_gemini_messages
from setup import build_setup_message, browser_to_gemini

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

WS_URL = (
    "wss://generativelanguage.googleapis.com/ws/"
    "google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"
    f"?key={GEMINI_API_KEY}"
)

router = APIRouter()

@router.websocket("/ws")
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