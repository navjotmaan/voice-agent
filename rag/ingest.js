// Run this file once to add the user's data into the database
// Or every time you update the data

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEmbedding } from "./embeddings.js";
import { saveChunk } from '../db/query.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); 

function chunkMarkdown(text) {
  const sections = text
    .split(/(?=^#{1,6}\s)/gm)
    .map(section => section.trim())
    .filter(Boolean);

  return sections;
}

// Add all file names
const fileNames = ['career.md', 'decisions.md', 'goals.md', 'learning-style.md', 'preferences.md', 'priorities.md', 'profile.md', 'projects.md', 'skills.md'];

async function readFileContent() {
    try {
        // Loop through every file
        for (let i = 0; i < fileNames.length; i++) {
            const filePath = path.join(__dirname, '..', 'user-data', fileNames[i]);
            const data = await fs.readFile(filePath, 'utf8');

            // Divide the file content into chunks
            const chunks = chunkMarkdown(data);

            // For each chunk, create an embedding and store it in the db
            for (const chunk of chunks) {
                const embedding = await createEmbedding(chunk);
                await saveChunk(chunk, embedding);
            }
        }
        
    } catch (err) {
        console.error('Error reading file:', err);
    }
}

readFileContent();