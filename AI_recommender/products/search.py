import os
import psycopg
from pgvector.psycopg import register_vector
from smolagents import tool
from embedding import generate_embedding

DATABASE_URL = os.getenv("DATABASE_URL")

@tool
def search_products_by_similarity(query: str, limit: int = 5) -> list[dict]:
    """
    Search for products matching a natural language user query using semantic search.
    Useful when customers describe features, uses, or types of products they want.
    Args:
    query: keywords describing what the user wants, e.g. "running shoes"
    """
    query_vector = generate_embedding(query)

    with psycopg.connect(DATABASE_URL) as conn:
        register_vector(conn)
        with conn.cursor() as cur:
            sql = """
                SELECT 
                    "id", 
                    "title", 
                    "description", 
                    "price",
                    1 - ("embedding" <=> %s) AS similarity_score
                FROM "Product"
                WHERE "embedding" IS NOT NULL
                ORDER BY "embedding" <=> %s ASC
                LIMIT %s;
            """
            cur.execute(sql, (query_vector, query_vector, limit))
            rows = cur.fetchall()

    return [
        {
            "id": row[0],
            "title": row[1],
            "description": row[2],
            "price": row[3],
            "similarity": round(float(row[4]), 3),
        }
        for row in rows
    ]


@tool
def search_catalog(query: str, max_price: float) -> list:
    """Find products matching a query and budget. If there are no in-budget matches,
    return closest-price products from the requested category as alternatives.

    Args:
        query: Keywords describing the desired product/category.
        max_price: Maximum budget in USD.
    """
    words = [w for w in query.lower().split() if w.strip()]
    matches = []
    for product in CATALOG:
        text = f"{product.get('title', '')} {product.get('description', '')} {product.get('category', '')}".lower()
        if not words or any(word in text for word in words):
            matches.append(dict(product))

    in_budget = [p for p in matches if float(p.get("price", 0) or 0) <= max_price]
    if in_budget:
        in_budget.sort(key=lambda p: float(p.get("price", 0) or 0))
        results = in_budget[:10]
        for p in results:
            p["budgetMatch"] = True
            p["budgetNote"] = "Within the requested budget."
        return results

    # No matching category item is within budget: offer closest options and be transparent.
    matches.sort(key=lambda p: abs(float(p.get("price", 0) or 0) - max_price))
    results = matches[:5]
    for p in results:
        p["budgetMatch"] = False
        price = float(p.get("price", 0) or 0)
        p["budgetNote"] = (
            f"${price:.2f} is ${price - max_price:.2f} over budget."
            if price > max_price else "Within the requested budget."
        )
    return results