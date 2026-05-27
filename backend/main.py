from fastapi import FastAPI, UploadFile, File, HTTPException, Path
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import os
import shutil
import logging

import env
import loader
import indexer
import retriever

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Runtime RAG API", 
    description="Complete Backend API for the local interactive RAG system",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Data Models ---

class QuestionRequest(BaseModel):
    query: str
    doc_id: str

class SourceData(BaseModel):
    page: int
    content: str

class AskResponse(BaseModel):
    answer: str
    sources: List[SourceData]
    pages: List[int]

class DocumentListResponse(BaseModel):
    documents: List[str]

class UploadResponse(BaseModel):
    message: str
    doc_id: str

# --- API Endpoints ---

@app.get("/health", tags=["System"])
def health_check():
    """Check if the backend is actively running."""
    return {"status": "healthy", "service": "Runtime RAG API"}

MAX_FILE_SIZE = 15 * 1024 * 1024  # 15 MB in bytes

@app.post("/upload", response_model=UploadResponse, tags=["Document Management"])
async def upload_document(file: UploadFile = File(...)):
    """Uploads a PDF, processes it, creates an index, and returns the new Doc ID."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
        
    # Check file size
    file.file.seek(0, 2) # Go to the end of the file
    file_size = file.file.tell() # Get the size
    file.file.seek(0) # Go back to the beginning so it can be read normally later
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 15MB.")
    
    os.makedirs(env.UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(env.UPLOAD_DIR, file.filename)
    
    # Save uploaded file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        import supabase_client
        # Flow: Load -> Split -> Embed -> Save
        chunks, doc_id = loader.process_pdf(file_path)
        
        if supabase_client.is_supabase_enabled():
            print(f"[*] Supabase detected. Uploading PDF '{file.filename}' to storage...")
            supabase_client.upload_pdf_to_supabase(file_path, file.filename)
            
            print(f"[*] Saving document metadata for '{doc_id}'...")
            supabase_client.save_document_metadata(doc_id, file.filename, file.filename)
            
            print(f"[*] Processing embeddings and saving to Supabase pgvector...")
            supabase_client.save_document_chunks(doc_id, chunks, retriever.get_embeddings())
            
            # Clean up local temporary file in cloud mode to keep disk clean!
            if os.path.exists(file_path):
                os.remove(file_path)
        else:
            active_doc_id = indexer.create_index(chunks, doc_id)
            # Pre-load the DB into memory to make the first question fast
            retriever.load_db(active_doc_id)
            
        return {"message": "Success! Document processed and indexed.", "doc_id": doc_id}
    except Exception as e:
        logger.error(f"Error processing PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")

@app.get("/documents", response_model=DocumentListResponse, tags=["Document Management"])
def get_documents():
    """Retrieve all available indexed documents."""
    idx_list = retriever.list_indexes()
    return {"documents": idx_list}

@app.delete("/documents/{doc_id}", tags=["Document Management"])
def delete_document(doc_id: str = Path(..., title="The ID of the document to delete")):
    """Deletes a document's vector store index and original uploaded file from the system."""
    import re
    import supabase_client
    
    if supabase_client.is_supabase_enabled():
        try:
            print(f"[*] Deleting document '{doc_id}' from Supabase...")
            client = supabase_client.get_supabase_client()
            
            # Query documents table to find the storage filename
            res = client.table("documents").select("storage_path").eq("id", doc_id).execute()
            storage_path = None
            if res.data and len(res.data) > 0:
                storage_path = res.data[0]["storage_path"]
            
            # Delete metadata (cascade delete handles chunk vectors!)
            supabase_client.delete_supabase_document(doc_id)
            
            # Delete PDF file
            if storage_path:
                supabase_client.delete_pdf_from_supabase(storage_path)
                
            return {
                "message": f"Document '{doc_id}' successfully deleted from Supabase.",
                "vector_deleted": True,
                "original_file_deleted": True
            }
        except Exception as e:
            logger.error(f"Error deleting Supabase document {doc_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Could not delete document from Supabase: {str(e)}")
    else:
        doc_path = os.path.join(env.VECTOR_DIR, doc_id)
        if not os.path.exists(doc_path):
            raise HTTPException(status_code=404, detail="Document index not found")
            
        try:
            # 1. Remove FAISS index folder (vectorstore)
            shutil.rmtree(doc_path)
            
            # 2. Find and delete the original PDF file in uploads folder
            uploaded_file_deleted = False
            if os.path.exists(env.UPLOAD_DIR):
                for filename in os.listdir(env.UPLOAD_DIR):
                    name_without_ext, _ = os.path.splitext(filename)
                    sanitized_name = re.sub(r'[^a-zA-Z0-9]', '_', name_without_ext)
                    if sanitized_name == doc_id:
                        file_to_delete = os.path.join(env.UPLOAD_DIR, filename)
                        if os.path.exists(file_to_delete):
                            os.remove(file_to_delete)
                            uploaded_file_deleted = True
                            logger.info(f"Deleted original uploaded file: {filename}")
            
            # Clear it from memory if it's the active document
            if getattr(retriever, '_active_id', None) == doc_id:
                retriever._active_db = None
                retriever._active_id = None
                
            logger.info(f"Deleted vector index for document: {doc_id}")
            return {
                "message": f"Document '{doc_id}' and its associated files were successfully deleted.",
                "vector_deleted": True,
                "original_file_deleted": uploaded_file_deleted
            }
        except Exception as e:
            logger.error(f"Error deleting document {doc_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Could not delete document: {str(e)}")

@app.post("/ask", response_model=AskResponse, tags=["Inference"])
def ask_question(request: QuestionRequest):
    """Sends a query against a specific document index and returns the answer with sources."""
    if not request.doc_id or not request.query:
        raise HTTPException(status_code=400, detail="Missing doc_id or query")
        
    try:
        # Load DB if not already active
        retriever.load_db(request.doc_id)
        
        answer, sources = retriever.ask_question(request.query, request.doc_id)
        
        if answer.startswith("Error:"):
            raise HTTPException(status_code=404, detail=answer)
            
        # Format sources
        source_data = []
        
        print("\n" + "."*20 + " RETRIEVED CHUNKS " + "."*20)
        for i, doc in enumerate(sources):
            page_num = doc.metadata.get('page', 0) + 1
            chunk_preview = doc.page_content[:200] + "..."
            
            # Print to backend terminal
            print(f"\n[Chunk {i+1} | Page {page_num}]:")
            print(f"{chunk_preview}")
            
            # Save for frontend response
            source_data.append({
                "page": page_num,
                "content": chunk_preview
            })
        print("."*48 + "\n")
            
        # Extract unique pages
        pages = sorted(list(set([s.metadata.get('page', 0) + 1 for s in sources])))
        
        print("\n" + "-"*20 + " AI RESPONSE " + "-"*20)
        print(f"{answer}")
        print("-"*(40 + 13))
        print(f"Final Sources: Page(s) {', '.join(map(str, pages))}\n")
        
        return {
            "answer": answer.strip(),
            "sources": source_data,
            "pages": pages
        }
    except Exception as e:
        logger.error(f"Error during ask query: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    # Use environment-driven port for deployment platforms like Hugging Face Spaces (defaults to 7860)
    port = int(os.getenv("PORT", 8000))
    # Determine reload based on environment (defaults to True for local development)
    is_dev = os.getenv("ENV", "development") == "development"
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=is_dev)
