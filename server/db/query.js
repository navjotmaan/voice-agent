import { pool } from "./pool.js";

export async function saveChunk(content, embedding) {
  await pool.query(
    `INSERT INTO documents (content, embedding)
     VALUES ($1, $2)`,
    [content, JSON.stringify(embedding)]
  );
}

export async function searchUserMemory(embedding) {
  const result = await pool.query(
    `
    SELECT 
      content,
      embedding <=> $1 AS distance
    FROM documents
    ORDER BY embedding <=> $1
    LIMIT 5;
    `,
    [JSON.stringify(embedding)]
  );

  return result.rows;
}