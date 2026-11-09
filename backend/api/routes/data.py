from pydantic import BaseModel
from fastapi import APIRouter
from services.embeddings import create_chunks

router = APIRouter()

class TextPayload(BaseModel):
    text: str

@router.post("/api/save-data")
async def save_data(payload: TextPayload):
    received_text = payload.text
    create_chunks(received_text)

    # print(f"Received {len(received_text)} characters.")
    
    return {"status": "success", "length": len(received_text)}