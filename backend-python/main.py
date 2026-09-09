import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

import rag_engine
import llm_client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SEED_CITIES = ["Philadelphia"]


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting EatGood AI API...")
    for city in SEED_CITIES:
        try:
            rag_engine.build_index_for_city(city)
            logger.info(f"✓ {city} index ready")
        except Exception as e:
            logger.error(f"✗ Failed to load {city}: {e}")
    logger.info("API ready. Visit http://localhost:8001/docs to explore endpoints.")
    yield
    logger.info("Shutting down EatGood AI.")


app = FastAPI(
    title="EatGood AI",
    description="AI-powered restaurant search using RAG",
    version="0.1.0",
    lifespan=lifespan
)


class SearchRequest(BaseModel):
    query: str
    city: str = "Philadelphia"
    top_k: int = 5
    history: list[str] = []


class IngestRequest(BaseModel):
    city: str


@app.get("/health")
def health():
    return {"status": "ok", "service": "EatGood AI"}


@app.get("/cities")
def get_cities():
    """Returns the list of cities that are indexed and ready to search."""
    return {"cities": rag_engine.get_available_cities()}


@app.post("/search")
def search(req: SearchRequest):
    """
    Main search endpoint. Accepts a natural language query and returns
    matching restaurants alongside an AI-generated summary.

    Supports multi-turn search — pass previous queries in `history`
    so follow-ups like "something cheaper?" resolve with context.
    """
    try:
        results = rag_engine.retrieve_chunks(
            query=req.query,
            city=req.city,
            top_k=req.top_k,
            history=req.history
        )
        summary = llm_client.generate_summary(
            query=req.query,
            chunks=results,
            history=req.history
        )
        return {
            "query": req.query,
            "city": req.city,
            "results": results,
            "summary": summary,
            "count": len(results)
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@app.post("/ingest")
def ingest(req: IngestRequest):
    """
    Builds a FAISS index for a new city on demand.
    Call this before searching a city that was not pre-loaded at startup.
    """
    try:
        count = rag_engine.build_index_for_city(req.city)
        return {
            "status": "success",
            "city": req.city,
            "restaurants_indexed": count
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingest failed: {str(e)}")
