
from langchain_huggingface import HuggingFaceEmbeddings
from pydantic import BaseModel, Field

# Load once when the service starts.
embedding_model = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)


class ProductEmbeddingRequest(BaseModel):
    productId: str = Field(min_length=1)
    name: str = Field(min_length=1, max_length=500)
    description: str = Field(min_length=1, max_length=10000)
    category: str | None = None


class ProductEmbeddingResponse(BaseModel):
    productId: str
    embedding: list[float]
    dimensions: int



def generate_embedding(text: str) -> list[float]:
    """Pure embedding function reusable anywhere (tools, endpoints, scripts)."""
    # LangChain / embedding_model returns a list of embeddings
    vectors = embedding_model.embed_documents([text])
    return vectors[0]

def build_product_search_text(name: str, description: str, category: str | None = None) -> str:
    """Standardizes product formatting for consistent vector search."""
    return (
        f"Product: {name}. "
        f"Description: {description}. "
        f"Category: {category or 'Not specified'}."
    )


