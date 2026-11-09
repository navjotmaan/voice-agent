from google import genai
from google.genai import types
import db.queries as query
from langchain_text_splitters import RecursiveCharacterTextSplitter

from dotenv import load_dotenv
load_dotenv()

client = genai.Client()


def create_embeddings(contents):
    return client.models.embed_content(
            model="gemini-embedding-2",
            contents=contents,
            config=types.EmbedContentConfig(output_dimensionality=768),
        )


def create_chunks(data):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,    # max characters per chunk
        chunk_overlap=150,  # characters shared between neighboring chunks
    )

    chunks = splitter.split_text(data)
    # chunks is a list of strings, ready to embed

    result = create_embeddings([types.Content(parts=[types.Part(text=f"title: Test doc | text: {t}")]) for t in chunks])
    assert len(result.embeddings) == len(chunks)

    query.save_data_into_db(data, chunks, result.embeddings)