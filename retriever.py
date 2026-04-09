import os
import re
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.llms import Ollama
import config

# Global variables to "cache" the models in RAM
# This makes subsequent questions INSTANT
_embeddings_cache = None
_llm_cache = None
_active_db = None
_active_id = None

def get_embeddings():
    global _embeddings_cache
    if _embeddings_cache is None:
        print(f"[*] Loading Embedding Model ({config.EMBED_MODEL})...")
        _embeddings_cache = HuggingFaceEmbeddings(model_name=config.EMBED_MODEL)
    return _embeddings_cache

def get_llm():
    global _llm_cache
    if _llm_cache is None:
        _llm_cache = Ollama(model=config.MODEL_NAME)
    return _llm_cache

def load_db(doc_id):
    """Loads a DB into memory and keeps it there."""
    global _active_db, _active_id
    
    if _active_id == doc_id and _active_db is not None:
        return _active_db # Already loaded!
    
    db_path = os.path.join(config.VECTOR_DIR, doc_id)
    if not os.path.exists(db_path):
        return None
        
    print(f"[*] Loading Document Index '{doc_id}' into RAM...")
    _active_db = FAISS.load_local(
        db_path, 
        get_embeddings(), 
        allow_dangerous_deserialization=True
    )
    _active_id = doc_id
    return _active_db

def generate_queries(original_query):
    """Uses the LLM to expand one query into three different perspectives."""
    llm = get_llm()
    # We use a more "Robotic" prompt to stop the LLM from chatting
    prompt = f"""
    [INST] Generate 3 search queries for a PDF retriever. 
    Strictly output one query per line. No numbers. No bullets. No intro.
    
    Topic: {original_query}
    [/INST]
    """
    response = llm.invoke(prompt)
    
    # Pre-processing: Remove numbers (1., 2.) and bullets (-, *)
    raw_lines = response.split('\n')
    clean_queries = []
    for line in raw_lines:
        q = re.sub(r'^\d+[\.\)]\s*', '', line.strip()) # Remove '1.' or '1)'
        q = re.sub(r'^[\-\*\•]\s*', '', q)            # Remove '-', '*', etc.
        if q and len(q) > 5:
            clean_queries.append(q)
    
    # DEBUG PRINT
    print("\n" + "~"*20 + " CLEAN SEARCH TERMS " + "~"*20)
    for q in clean_queries[:3]: print(f" -> {q}")
    print("~"*52 + "\n")
    
    clean_queries.append(original_query)
    return list(set(clean_queries[:4]))

def ask_question(question, doc_id):
    db = load_db(doc_id)
    if db is None:
        return "Error: Document index not found.", []

    # 1. Multi-Query Search
    search_queries = generate_queries(question)
    
    unique_docs = {}
    is_summary_query = any(word in question.lower() for word in ["abstract", "summary", "summarise", "intro"])
    
    for q in search_queries:
        # Get more candidates
        results = db.similarity_search(q, k=5) 
        for d in results:
            unique_docs[d.page_content] = d
            
            # --- NEW: THE NEIGHBORHOOD RULE ---
            # If we hit a page in the front of the book (0-8), 
            # we should also search for the pages immediately surrounding it.
            pg = d.metadata.get('page', 999)
            if is_summary_query and pg < 10:
                print(f"[*] Found potential front-matter on Page {pg+1}. Expanding neighborhood search...")
                # Broaden search for that specific page area
                adj_results = db.similarity_search(f"Page {pg+1} {pg+2} {pg} content", k=3)
                for adj in adj_results:
                    unique_docs[adj.page_content] = adj

    all_docs = list(unique_docs.values())
    
    if is_summary_query:
        all_docs.sort(key=lambda x: x.metadata.get('page', 999))

    # Take a larger context for Summaries (8 chunks)
    docs = all_docs[:8] 
    context = "\n---\n".join([f"[CONTENT]: {d.page_content}" for d in docs])
    
    llm = get_llm()
    prompt = f"""
    You are a professional report analyst. 
    Task: Summarize the '{question}' based on the context.
    
    Rules:
    - Focus on the section labeled 'ABSTRACT' or 'EXECUTIVE SUMMARY'.
    - If you see names and signatures, that is the Declaration/Acknowledgement, NOT the abstract.
    - If the abstract is found, provide a 3-paragraph summary.
    
    CONTEXT:
    {context}
    
    QUESTION:
    {question}
    """
    
    print(f"[*] Analyzing {len(docs)} segments for the final answer...")
    return llm.invoke(prompt), docs

def list_indexes():
    if not os.path.exists(config.VECTOR_DIR):
        return []
    return [d for d in os.listdir(config.VECTOR_DIR) if os.path.isdir(os.path.join(config.VECTOR_DIR, d))]
