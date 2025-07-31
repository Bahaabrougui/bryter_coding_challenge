# Game Rulebook Chatbot – Local RAG PoC

This project is a local Retrieval-Augmented Generation (RAG) proof-of-concept
designed to ingest and query game rulebooks in PDF format using a local
embedding server (optionally openAI API) and vector store.

---

## Prerequisites

- **Docker**
- **Node.js** 18.x
- **pnpm** (preferred package manager)

---

## Environment Setup

Create a `.env` file or export the following environment variables:

```env
GROQ_API_KEY="<your_groq_api_key>"

# ChromaDB (Vector Store)
CHROMA_URL="http://localhost:8000"
CHROMA_COLLECTION="games-rule-books" # Or other name of choice

# Text Embeddings Inference (TEI)
TEI_URL="http://localhost:8080"
EMBEDDING_MODEL="sentence-transformers/all-MiniLM-L6-v2" # Or other model of choice, compatible with TEI

# Optional, use OpenAI API instead of locally hosted TEI server, omit to use TEI
OPENAI_API_KEY="<your_openai_api_key>
```

## 🐳 Run Docker Services

Start the vector store and local TEI server:

```
cd setup
docker compose --env-file ../.env up -d
```
If you don’t have a .env file:
```
cd setup
docker compose up -d
```

**Note**: If you prefer OpenAI embeddings, only start ChromaDB:
```
docker compose up -d chromadb
```

## 📦 Install Dependencies
```
pnpm install
```

## 🤖 Usage

Ingest PDFs:
```
pnpm ingest
```

To use OpenAI embeddings instead:
```
pnpm ingest-with-open-ai
```

Live Chat:
```
pnpm chat
```

**Note**: PoC tested only with embeddings on a local TEI server due 
to unavailability of openAI API Key.

## Limitations
- **CPU-only Inference**: TEI runs on CPU, which along with document and
database batching, slows ingestion. To improve performance:
  - Use OpenAI embeddings (pnpm ingest-with-open-ai)
  - Or host TEI on a GPU (e.g. serverless cloud GPU instance)

=> The right solution is use-case specific and will depend on throughput and costs assessments and other factors.


- **No unified logging system**: Logs are currently `console.log` and
`console.error`. They are not centralized or exposed to monitoring systems
like Prometheus, Azure Monitor, etc. This makes observability and
debugging in concurrent scenarios harder.


- **Concurrent logging chaos**: The ingestion pipeline uses a tiny worker pool. 
If more than one PDF is being processed, underlying methods logs verbosely, 
resulting in logs becoming interleaved and unreadable due to async concurrency.


- **Re-ingestion is skipped only by filename**: Each document’s `metadata.source`
is the filename. This prevents re-ingesting PDFs already present in the
vectorstore which is useful if we want to test after adding a new document to our PDFs folder.  
In production, a content-based hash (e.g. SHA256 of text)
should be stored in metadata as well and used to detect changes. Moreover event-driven
pipelines will help prevent re-ingestion.


- **Not event-driven**: Currently, the ingestion pipeline is manually triggered.
In production, a cloud function would monitor file storage and trigger
ingestion on file creation or update events.


- **CLI-only, no API or frontend**: The chatbot is currently accessed via CLI
and is not exposed through an API or UI.


- **No persistent chat history**: Conversations are ephemeral, per CLI session,
and not stored per user or across sessions.


## Final notes:
To achieve the lowest possible latency, the ingestion cloud function, vector database, 
and embedding server should be deployed in the same cloud region, ideally within 
the same availability zone. Utilizing the cloud provider’s internal backbone 
network ensures both speed and security. If the chatbot is exposed as an API , 
it should also be deployed as close as possible to the other components. 
For further latency optimization, all services can be co-located in the same 
physical data center, if supported by the cloud provider.

## Example chat:
```
👤 You: Hi

🤖 It's nice to meet you. Is there something I can help you with, or would you like to learn more about a specific game? 

👤 You: Yes, do you know PathFinder game ?
📑 Retrieving relevant docs..
✅ Docs retrieved. Took me 0.147 seconds !
📑 Retrieving relevant docs..
✅ Docs retrieved. Took me 0.127 seconds !

🤖 I see you're interested in the Pathfinder game. It's a tabletop role-playing game where players create characters and embark on adventures set in a fantasy world. The game has a wide range of rules and options for character creation, combat, and exploration. 

Would you like to know more about character creation, combat mechanics, or something else specific to the Pathfinder game? 

👤 You: Yes are there critical hits ?
📑 Retrieving relevant docs..
✅ Docs retrieved. Took me 0.196 seconds !

🤖 Yes, in the Pathfinder game, critical hits are a crucial aspect of combat. When you score a critical hit, you deal extra damage to your opponent. The amount of extra damage depends on the weapon you're using and its critical multiplier. 

For example, if you're using a weapon with a x2 critical multiplier, you'll deal double the normal damage on a critical hit. Some weapons have even higher multipliers, such as x3 or x4, which can lead to significant amounts of extra damage.

Additionally, some feats and abilities can add extra effects to critical hits, such as causing the opponent to become exhausted or applying additional damage. 

Would you like to know more about critical hits or is there something else you'd like to explore in the Pathfinder game? 

👤 You: All good now, bye

🤖 It was a pleasure helping you with the Pathfinder game rules. If you have any more questions or need further assistance in the future, don't hesitate to reach out. Have a great day and happy gaming! Bye! 

👤 You: exit
👋 Session ended.

```