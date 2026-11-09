import asyncio
import json
from websockets.exceptions import ConnectionClosed
from db.queries import search_knowledge_base

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