import os
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, select

from db.models import User, Document, Chunk
import embeddings

from dotenv import load_dotenv
load_dotenv()

url = os.getenv("DATABASE_URL")
engine = create_engine(url, echo=True)


def save_data_into_db(full_text, chunks, embeddings):
    with Session(engine) as session:
        user = session.scalar(select(User).where(User.google_id == "test123"))
        if user is None:
            user = User(google_id="test123", name="Test", email="test@example.com")

        doc = Document(user=user, title="Test doc", document=full_text)

        for i, (text, emb) in enumerate(zip(chunks, embeddings)):
            session.add(Chunk(
                user=user,
                document=doc,
                chunk_index=i,
                chunk=text,
                embedding_model="gemini-embedding-2",
                embedding=emb.values,
            ))

        session.commit()


def search_knowledge_base(question, k=5):
    print('searching knowledge base...')

    result = embeddings.create_embeddings(f"task: search result | query: {question}")
    q_emb = result.embeddings[0].values

    distance = Chunk.embedding.cosine_distance(q_emb)
    stmt = (
        select(Chunk, distance.label("distance"))
        .where(Chunk.user_id == 4)
        .order_by(distance)
        .limit(k)
    )

    with Session(engine) as session:
        rows = session.execute(stmt).all()
        return [(chunk.chunk, dist) for chunk, dist in rows]