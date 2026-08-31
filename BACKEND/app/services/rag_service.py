import uuid
import logging
from typing import List, Optional
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from app.config import settings

logger = logging.getLogger("NWIS.RAG")


class RAGService:
    """
    Retrieval-Augmented Generation service.
    Manages Qdrant vector DB, embedding model, and semantic search.
    """

    def __init__(self):
        self._client: Optional[QdrantClient] = None
        self._embeddings = None
        self._splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=50
        )

    @property
    def client(self) -> QdrantClient:
        if self._client is None:
            logger.info(f"Connecting to Qdrant at {settings.QDRANT_URL}...")
            self._client = QdrantClient(url=settings.QDRANT_URL)
        return self._client

    @property
    def embeddings(self) -> HuggingFaceEmbeddings:
        if self._embeddings is None:
            logger.info("Loading embedding model (all-MiniLM-L6-v2)...")
            self._embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
            logger.info("Embedding model ready.")
        return self._embeddings

    def ensure_collection(self):
        """Create the Qdrant collection if it doesn't exist."""
        try:
            if not self.client.collection_exists(settings.QDRANT_COLLECTION):
                self.client.create_collection(
                    collection_name=settings.QDRANT_COLLECTION,
                    vectors_config=VectorParams(size=384, distance=Distance.COSINE),
                )
                logger.info(f"Created Qdrant collection '{settings.QDRANT_COLLECTION}'")
            else:
                logger.info(f"Qdrant collection '{settings.QDRANT_COLLECTION}' exists.")
        except Exception as e:
            logger.warning(f"Qdrant connection failed: {e}. RAG features will be unavailable.")

    def index_document(self, doc_id: str, raw_text: str, source_filename: str, ai_metadata: dict):
        """
        Chunk a document's text, embed each chunk, and upsert into Qdrant
        with a reference back to the PostgreSQL document ID.
        """
        if not raw_text.strip():
            return 0

        chunks = self._splitter.split_text(raw_text)
        points = []

        for chunk in chunks:
            vector = self.embeddings.embed_query(chunk)
            payload = {
                "postgres_doc_id": doc_id,
                "page_content": chunk,
                "source": source_filename,
                "ai_metadata": ai_metadata,
            }
            points.append(
                PointStruct(id=str(uuid.uuid4()), vector=vector, payload=payload)
            )

        if points:
            self.client.upsert(collection_name=settings.QDRANT_COLLECTION, points=points)
            logger.info(f"Indexed {len(points)} chunks for doc '{source_filename}'")

        return len(points)

    def delete_document_vectors(self, doc_id: str):
        """Remove all vectors associated with a specific PostgreSQL document ID."""
        try:
            self.client.delete(
                collection_name=settings.QDRANT_COLLECTION,
                points_selector=Filter(
                    must=[
                        FieldCondition(
                            key="postgres_doc_id",
                            match=MatchValue(value=doc_id)
                        )
                    ]
                )
            )
            logger.info(f"Deleted vectors for doc_id={doc_id}")
        except Exception as e:
            logger.error(f"Failed to delete vectors for doc_id={doc_id}: {e}")

    def search_knowledge(self, query: str, top_k: int = 5) -> List[dict]:
        """
        Semantic search across all indexed drilling reports.
        Returns the most relevant text chunks with metadata.
        """
        try:
            query_vector = self.embeddings.embed_query(query)
            results = self.client.query_points(
                collection_name=settings.QDRANT_COLLECTION,
                query=query_vector,
                limit=top_k,
            )

            hits = []
            for point in results.points:
                hits.append({
                    "content": point.payload.get("page_content", ""),
                    "source": point.payload.get("source", "Unknown"),
                    "doc_id": point.payload.get("postgres_doc_id", ""),
                    "score": point.score,
                    "ai_metadata": point.payload.get("ai_metadata", {}),
                })
            return hits

        except Exception as e:
            logger.error(f"RAG search failed: {e}")
            return []

    def get_mitigation_for_warning(self, warning_type: str) -> tuple:
        """
        Retrieves the best mitigation SOP from the knowledge base
        for a specific warning type (e.g., 'Stuck Pipe').
        Returns (mitigation_text, source_document).
        """
        query = f"Mitigation and standard operating procedure for {warning_type}"
        results = self.search_knowledge(query, top_k=1)

        if results:
            return results[0]["content"], results[0]["source"]
        return "No historical mitigation record found. Follow standard SOP.", "N/A"


# Singleton instance
rag_service = RAGService()
