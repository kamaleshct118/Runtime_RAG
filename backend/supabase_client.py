import os
import logging
from typing import List, Optional
from supabase import create_client, Client

# Set up logger
logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "").strip()

_supabase_client = None

def get_supabase_client() -> Optional[Client]:
    """Retrieves or initializes the global Supabase client."""
    global _supabase_client
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None
    if _supabase_client is None:
        try:
            logger.info(f"[*] Connecting to Supabase at: {SUPABASE_URL}")
            _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
            logger.info("[+] Supabase client connected successfully.")
        except Exception as e:
            logger.error(f"[-] Error connecting to Supabase: {str(e)}")
            _supabase_client = None
    return _supabase_client

def is_supabase_enabled() -> bool:
    """Checks if the system has valid Supabase credentials configured."""
    return get_supabase_client() is not None

# --- Supabase Storage Helpers ---

def upload_pdf_to_supabase(file_path: str, filename: str) -> bool:
    """Uploads a local PDF file to the 'document-uploads' Supabase Storage bucket."""
    client = get_supabase_client()
    if not client:
        return False
    try:
        with open(file_path, "rb") as f:
            file_data = f.read()
        
        # Upload using standard storage API (upsert allowed to support overwriting)
        client.storage.from_("document-uploads").upload(
            path=filename,
            file=file_data,
            file_options={"cache-control": "3600", "upsert": "true"}
        )
        logger.info(f"[+] PDF '{filename}' uploaded successfully to Supabase Storage.")
        return True
    except Exception as e:
        logger.error(f"[-] Failed to upload PDF to Supabase Storage: {str(e)}")
        return False

def delete_pdf_from_supabase(filename: str) -> bool:
    """Deletes a PDF file from the 'document-uploads' Supabase Storage bucket."""
    client = get_supabase_client()
    if not client:
        return False
    try:
        client.storage.from_("document-uploads").remove([filename])
        logger.info(f"[+] PDF '{filename}' deleted from Supabase Storage.")
        return True
    except Exception as e:
        logger.error(f"[-] Failed to delete PDF from Supabase Storage: {str(e)}")
        return False

# --- Supabase Database (Metadata) Helpers ---

def save_document_metadata(doc_id: str, name: str, storage_path: str) -> bool:
    """Inserts or updates document details in the documents metadata table."""
    client = get_supabase_client()
    if not client:
        return False
    try:
        client.table("documents").upsert({
            "id": doc_id,
            "name": name,
            "storage_path": storage_path
        }).execute()
        logger.info(f"[+] Document metadata saved for doc_id: {doc_id}")
        return True
    except Exception as e:
        logger.error(f"[-] Failed to save document metadata: {str(e)}")
        return False

def list_supabase_documents() -> List[str]:
    """Fetches a list of all active document IDs in the Supabase catalog."""
    client = get_supabase_client()
    if not client:
        return []
    try:
        res = client.table("documents").select("id").execute()
        return [row["id"] for row in res.data]
    except Exception as e:
        logger.error(f"[-] Failed to list documents from Supabase: {str(e)}")
        return []

def delete_supabase_document(doc_id: str) -> bool:
    """Deletes document metadata. Triggers cascade deletion of all chunks."""
    client = get_supabase_client()
    if not client:
        return False
    try:
        client.table("documents").delete().eq("id", doc_id).execute()
        logger.info(f"[+] Document '{doc_id}' successfully deleted from database.")
        return True
    except Exception as e:
        logger.error(f"[-] Failed to delete document '{doc_id}' from database: {str(e)}")
        return False

# --- Supabase Database (Vector) Helpers ---

def save_document_chunks(doc_id: str, chunks: list, embeddings_model) -> bool:
    """Generates embeddings and saves chunks to the document_chunks table."""
    client = get_supabase_client()
    if not client:
        return False
    try:
        logger.info(f"[*] Starting Supabase batch insert of {len(chunks)} chunks...")
        
        # 1. Generate embeddings in batch
        texts = [doc.page_content for doc in chunks]
        embeddings = embeddings_model.embed_documents(texts)
        
        # 2. Build rows
        records = []
        for i, doc in enumerate(chunks):
            records.append({
                "doc_id": doc_id,
                "content": doc.page_content,
                "metadata": doc.metadata,
                "embedding": embeddings[i]
            })
        
        # 3. Batch insert records to respect payload limits (200 records per batch)
        batch_size = 200
        for k in range(0, len(records), batch_size):
            batch = records[k : k + batch_size]
            client.table("document_chunks").insert(batch).execute()
            
        logger.info(f"[+] Successfully saved {len(chunks)} chunks and vectors to Supabase.")
        return True
    except Exception as e:
        logger.error(f"[-] Failed to save chunks to Supabase: {str(e)}")
        return False

def search_supabase_chunks(doc_id: str, query_embedding: List[float], k: int = 5) -> list:
    """Executes the cosine similarity match RPC stored procedure in pgvector."""
    client = get_supabase_client()
    if not client:
        return []
    try:
        res = client.rpc("match_document_chunks", {
            "query_embedding": query_embedding,
            "match_threshold": 0.0,
            "match_count": k,
            "filter_doc_id": doc_id
        }).execute()
        
        from langchain_core.documents import Document
        docs = []
        for row in res.data:
            docs.append(Document(
                page_content=row["content"],
                metadata=row.get("metadata", {})
            ))
        return docs
    except Exception as e:
        logger.error(f"[-] Cosine similarity search failed: {str(e)}")
        return []
