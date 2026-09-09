import json
import logging
import os

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DIMENSION = 384
YELP_DATA_FILE = "yelp_academic_dataset_business.json"

logger.info("Loading embedding model...")
model = SentenceTransformer('all-MiniLM-L6-v2')
logger.info("Model loaded.")

# In-memory store of FAISS indexes, keyed by lowercase city name
city_indexes = {}


def create_chunk(row: dict) -> dict:
    """
    Convert a restaurant record into a searchable chunk.

    Builds a natural language description used for embedding alongside
    the metadata fields returned to the client in search results.
    """
    text = (
        f"{row['name']} is a {row['categories']} located at {row['address']}. "
        f"It has {row['stars']} stars and {row['review_count']} reviews."
    )
    return {
        "text": text,
        "name": row["name"],
        "categories": row["categories"],
        "address": row["address"],
        "stars": row["stars"],
        "review_count": row["review_count"],
        "city": row["city"].title(),
        "source": "Yelp dataset"
    }


def load_restaurants_from_file(city: str) -> list:
    """
    Read the local Yelp JSON file and return all restaurants
    for a given city as a list of dicts.
    """
    if not os.path.exists(YELP_DATA_FILE):
        raise FileNotFoundError(
            f"Dataset file not found: {YELP_DATA_FILE}\n"
            f"Make sure '{YELP_DATA_FILE}' is in your backend-python/ folder."
        )

    logger.info(f"Loading restaurants for {city}...")
    restaurants = []
    city_lower = city.lower().strip()

    with open(YELP_DATA_FILE, "r", encoding="utf-8") as f:
        for line in f:
            business = json.loads(line)
            if business.get("city", "").lower().strip() != city_lower:
                continue
            categories = business.get("categories") or ""
            if "Restaurants" not in categories:
                continue
            restaurants.append({
                "name": business.get("name", "Unknown"),
                "categories": categories,
                "address": business.get("address", "Address not available"),
                "stars": business.get("stars", 0),
                "review_count": business.get("review_count", 0),
                "city": business.get("city", city)
            })

    logger.info(f"Found {len(restaurants)} restaurants in {city}.")
    return restaurants


def build_index_for_city(city: str) -> int:
    """
    Load restaurants for a city, embed them, and store a FAISS index.

    Must be called once per city before searching. Results are held
    in memory for the lifetime of the server process.

    Returns the number of restaurants indexed.
    """
    restaurants = load_restaurants_from_file(city)

    if not restaurants:
        raise ValueError(
            f"No restaurants found for '{city}'. "
            f"Check spelling — try 'Philadelphia' not 'philly'."
        )

    chunks = [create_chunk(r) for r in restaurants]
    texts = [chunk["text"] for chunk in chunks]

    logger.info(f"Embedding {len(texts)} restaurants...")
    embeddings = model.encode(texts, show_progress_bar=True)

    index = faiss.IndexFlatL2(DIMENSION)
    index.add(np.array(embeddings).astype("float32"))

    city_indexes[city.lower()] = {"index": index, "chunks": chunks}
    logger.info(f"Index built for {city} — {index.ntotal} vectors stored.")

    return len(chunks)


def retrieve_chunks(query: str, city: str, top_k: int = 5, history: list = []) -> list:
    """
    Convert a natural language query to a vector and find the most
    similar restaurant vectors in the city's FAISS index.

    Supports multi-turn search: when history is provided, previous
    queries are prepended so follow-ups like "something cheaper"
    resolve with the correct context.
    """
    city_key = city.lower()

    if city_key not in city_indexes:
        raise ValueError(
            f"No index found for '{city}'. "
            f"Call /ingest first to build an index for this city."
        )

    if history:
        previous = " | ".join(history)
        contextual_query = f"Previous searches: {previous}. Now find: {query}"
    else:
        contextual_query = query

    query_embedding = model.encode([contextual_query]).astype("float32")
    index_data = city_indexes[city_key]
    _, indices = index_data["index"].search(query_embedding, top_k)
    chunks = index_data["chunks"]

    return [chunks[idx] for idx in indices[0] if idx < len(chunks)]


def get_available_cities() -> list:
    """Returns the cities that have been indexed and are ready to search."""
    return list(city_indexes.keys())


if __name__ == "__main__":
    logger.info("--- Testing RAG Engine ---")
    build_index_for_city("Philadelphia")

    results = retrieve_chunks(query="best pizza in philadelphia", city="Philadelphia", top_k=3)
    for i, r in enumerate(results, start=1):
        print(f"{i}. {r['text']}")

    results = retrieve_chunks(
        query="something cheaper",
        city="Philadelphia",
        top_k=3,
        history=["best pizza in philadelphia"]
    )
    for i, r in enumerate(results, start=1):
        print(f"{i}. {r['text']}")
