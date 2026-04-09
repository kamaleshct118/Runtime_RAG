import os
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
import config

def create_index(chunks, doc_id):
    """
    Step 4: Generate Embeddings
    Step 5: Save FAISS index to disk
    """
    print(f"[*] Starting embedding process for: {doc_id}")
    embeddings = HuggingFaceEmbeddings(model_name=config.EMBED_MODEL)
    
    # Convert text chunks to vector math
    vector_db = FAISS.from_documents(chunks, embeddings)
    
    # Save folder
    save_path = os.path.join(config.VECTOR_DIR, doc_id)
    os.makedirs(config.VECTOR_DIR, exist_ok=True)
    vector_db.save_local(save_path)
    
    print(f"[+] Success! FAISS index created.")
    return doc_id
