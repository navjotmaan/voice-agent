# AI Voice Agent
A personal AI voice agent that uses the user's personal data to provide context-aware and personalized answers.

## Technology/Tools
- **Gemini Live API** — speech-to-speech interaction with built-in VAD and barge-in
- **PostgreSQL + pgvector** — stores embeddings and performs vector similarity search
- **RAG pipeline** — retrieves relevant information from the user's personal data
- **Gemini embedding model** — generates embeddings for user data and search queries

## How it works
Most of the voice interaction is handled by the Gemini Live API.

- **Speech-to-speech:** The user speaks to Gemini, which handles speech recognition, reasoning, and generating the voice response.
- **Voice Activity Detection (VAD):** Gemini detects when the user is speaking and when it should respond.
- **Barge-in:** If the user interrupts Gemini while it is responding, Gemini stops the current response and listens to the user.
- **Function calling:** When Gemini needs information from the user's personal data, it calls the `search_user_memory` function.
- **Embeddings:** The Gemini embedding model is used to create vector embeddings for the user's data and search queries.

## RAG Flow
For example, suppose the user asks:

> "What skills should I learn?"

The flow is:

1. Gemini receives the user's question.
2. Gemini determines that it needs the user's personal data to provide a relevant answer.
3. Gemini calls the `search_user_memory` function with a query such as:
`"user's current learning goals and priorities"`
4. The server creates an embedding for the query.
5. The query embedding is compared with the stored embeddings in PostgreSQL using pgvector.
6. The most relevant chunks of the user's data are returned.
7. The server sends those chunks back to Gemini as the tool result.
8. Gemini uses the retrieved context to generate the final response.

So, the flow is:

> User → Gemini Live API → Function Call → Node Server → Embedding → pgvector → Retrieved Context → Gemini → Voice Response

## Getting Started

### Pre-requisite
- Node 18+
- PostgreSQL with the `pgvector` extension
- Gemini API key

Clone the repository and install dependencies:

```bash
git clone git@github.com:navjotmaan/voice-agent.git
cd voice-agent
npm install
```

Make sure you're on the `gemini-live` branch:

```bash
git switch gemini-live
```

## Configuration
1. Copy the variables from `.env.example` into your `.env`:
    ```bash
    cp .env.example .env
    ```
    Then add your values to `.env`.

2. Create a `user-data` directory in the project root and add Markdown files containing the user's personal data.

    For example:

    ```text
    user-data/
    ├── career.md
    ├── goals.md
    └── projects.md
    ```

    See `rag/ingest.js` for the files used by the ingestion script and modify them according to your own data files.

## Usage

After adding your user data, run the ingestion script once to create embeddings and store the data in the database:

```bash
node rag/ingest.js
```

Start the Next.js application:
```bash
npm run dev
```
Then, in another terminal tab, start the voice server:
```bash
node server.js
```
Open the application in your browser and start a voice conversation.