import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from models import Base

load_dotenv()

url = os.getenv("DATABASE_URL")

engine = create_engine(url, echo=True)

with engine.begin() as conn:
    conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))

Base.metadata.create_all(engine)