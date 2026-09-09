import logging
import os

import anthropic

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

client = anthropic.Anthropic()

MODEL = "claude-haiku-4-5-20251001"
# Haiku is fast and cheap — ideal for summary generation

MAX_TOKENS = 300
# 2-3 sentence summaries fit comfortably within 300 tokens,
# keeping latency and cost low.


def build_prompt(query: str, chunks: list, history: list = []) -> str:
    """
    Build the user message sent to Claude for summary generation.

    Formats restaurant chunks into readable text and prepends
    conversation history so follow-up queries have context.
    """
    restaurant_lines = []
    for i, chunk in enumerate(chunks, start=1):
        line = (
            f"{i}. {chunk['name']} — {chunk['categories']}\n"
            f"   {chunk['address']} | ⭐ {chunk['stars']} ({chunk['review_count']} reviews)"
        )
        restaurant_lines.append(line)

    restaurants_text = "\n".join(restaurant_lines)

    history_text = ""
    if history:
        history_text = f"Previous searches in this session: {' → '.join(history)}\n"

    return (
        f"{history_text}"
        f"The user searched for: \"{query}\"\n\n"
        f"Here are the top restaurant matches:\n\n"
        f"{restaurants_text}\n\n"
        f"In 2-3 sentences, explain why these results are a good match "
        f"for what the user asked for. Be specific — mention restaurant "
        f"names and what makes them relevant. Keep it conversational, "
        f"like a knowledgeable local friend giving a recommendation."
    )


def generate_summary(query: str, chunks: list, history: list = []) -> str:
    """
    Call Claude to generate a natural language summary explaining
    why the retrieved restaurants match the user's query.

    This is the Generate step in the RAG pipeline:
      Retrieve (FAISS) → Augment (chunks as context) → Generate (Claude)
    """
    if not chunks:
        return "No matching restaurants were found for your search. Try a different query or city."

    prompt = build_prompt(query, chunks, history)

    try:
        response = client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=(
                "You are EatGood AI, a friendly and knowledgeable dining companion. "
                "You help people find great restaurants by explaining why specific places "
                "match what they're looking for. Be warm, specific, and concise. "
                "Never make up details that aren't in the data you're given."
            ),
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text

    except anthropic.APIError as e:
        logger.error(f"Anthropic API error: {e}")
        return "Unable to generate a summary right now. Here are your results above."

    except Exception as e:
        logger.error(f"Summary generation failed: {e}")
        return "Unable to generate a summary right now. Here are your results above."


if __name__ == "__main__":
    test_chunks = [
        {
            "name": "Vetri Cucina",
            "categories": "Italian, Fine Dining",
            "address": "1312 Spruce St, Philadelphia",
            "stars": 4.5,
            "review_count": 892
        },
        {
            "name": "Positano Coast",
            "categories": "Italian, Seafood",
            "address": "212 Walnut St, Philadelphia",
            "stars": 4.2,
            "review_count": 634
        },
        {
            "name": "Brigantessa",
            "categories": "Italian, Pizza",
            "address": "1520 E Passyunk Ave, Philadelphia",
            "stars": 4.4,
            "review_count": 511
        }
    ]

    summary = generate_summary(
        query="romantic Italian dinner, not too expensive",
        chunks=test_chunks
    )
    print("Summary:", summary)

    summary2 = generate_summary(
        query="something a bit more casual",
        chunks=test_chunks,
        history=["romantic Italian dinner, not too expensive"]
    )
    print("Follow-up:", summary2)
