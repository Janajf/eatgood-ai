# EatGood AI

AI-powered restaurant search that understands natural language. Instead of filtering by category or price range, you describe what you want — "romantic Italian, not too expensive" or "quick lunch with outdoor seating" — and EatGood AI finds the best matches.

## How it works

EatGood AI uses a Retrieval-Augmented Generation (RAG) pipeline:

1. **Ingest** — Restaurant data is loaded from the Yelp dataset and converted into natural language descriptions
2. **Embed** — Each description is vectorized using a sentence-transformer model (`all-MiniLM-L6-v2`)
3. **Index** — Vectors are stored in a FAISS index for fast similarity search
4. **Retrieve** — At search time, the query is embedded and matched against the index
5. **Generate** — Claude (Haiku) synthesizes the results into a conversational summary

Multi-turn search is supported: follow-up queries like "something cheaper?" are resolved using the session's search history as context.

## Tech stack

| Layer | Technology |
|---|---|
| AI / Search | FAISS, sentence-transformers, Anthropic API |
| Backend (Python) | FastAPI, Pydantic |
| Backend (Java) | Spring Boot, Spring Security, PostgreSQL |
| Frontend | React, Vite |
| Data | Yelp Open Dataset |

## Project structure

```
eatgood-ai/
├── backend-python/      # FastAPI RAG service
│   ├── main.py          # API routes and app lifecycle
│   ├── rag_engine.py    # FAISS indexing and retrieval
│   ├── llm_client.py    # Anthropic API integration
│   └── requirements.txt
├── backend-java/        # Spring Boot auth service (in progress)
│   └── api-gateway/     # User auth, JWT, search history
├── frontend/            # React + Vite UI
│   └── src/
│       └── App.jsx
└── docs/
```

## Running locally

### Python backend

```bash
cd backend-python
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

Visit `http://localhost:8001/docs` for the interactive API explorer.

> **Note:** The Yelp dataset file (`yelp_academic_dataset_business.json`) is required but not included in this repo due to size. Download it from the [Yelp Dataset](https://www.yelp.com/dataset) page and place it in `backend-python/`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Environment variables

Create a `.env` file in `backend-python/`:

```
ANTHROPIC_API_KEY=your_key_here
```

## Roadmap

- [ ] Java auth service — user accounts, JWT authentication
- [ ] Search history — per-user history saved to PostgreSQL
- [ ] Additional cities — expand beyond Philadelphia
- [ ] Unit tests — pytest (Python), JUnit (Java)
- [ ] Deployment — Railway (backends), Vercel (frontend)
