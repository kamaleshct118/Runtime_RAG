import os
import re
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_openai import ChatOpenAI
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
        _embeddings_cache = HuggingFaceEmbeddings(
            model_name=config.EMBED_MODEL,
            model_kwargs={'trust_remote_code': True}
        )
    return _embeddings_cache

def get_llm():
    global _llm_cache
    if _llm_cache is None:
        # We strip() to handle accidental spaces in config.py
        _llm_cache = ChatOpenAI(
            model=config.MODEL_NAME.strip(),
            api_key=config.GROQ_API_KEY,
            base_url=config.GROQ_BASE_URL,
        )
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
    # SMART PROMPT: Tells the LLM to fix typos and find the core "Need"
    prompt = f"""You are an expert search strategist. 
    Your task is to analyze the user's question and generate exactly 3 highly effective search queries to retrieve the most relevant information from a vector database of documents.
    
    Instructions:
    1. Identify the core semantic intent of the question.
    2. Correct any spelling or grammatical errors.
    3. Use synonyms and alternative phrasing the document author might have used.
    4. Output EXACTLY 3 queries. Output them one per line. Do NOT use bullet points, numbering, or introductory text.
    
    User Question: {original_query}
    """
    response = llm.invoke(prompt)
    response_text = response.content if hasattr(response, 'content') else response
    
    # Pre-processing: Remove numbers (1., 2.) and bullets (-, *)
    raw_lines = response_text.split('\n')
    clean_queries = []
    for line in raw_lines:
        q = re.sub(r'^\d+[\.\)]\s*', '', line.strip()) # Remove '1.' or '1)'
        q = re.sub(r'^[\-\*•]\s*', '', q)            # Remove '-', '*', etc.
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
    # GROUNDED PROMPT: Stops the AI from inventing code or repeating itself
    prompt = f"""You are an advanced analytical AI assistant. Your task is to provide answers based STRICTLY and ONLY on the provided context.
    
    ### Instructions:
    1. **Strict Context Adherence**: If the provided context does NOT contain the answer to the user's question, you must respond EXACTLY with: "Information not found in the provided documents." - DO NOT explain what the context is about, DO NOT generate headers, and DO NOT use outside knowledge.
    2. **Synthesize & Structure**: If (and ONLY IF) the context contains the answer, use professional markdown formatting (bold text, bullet points, headers) to structure your response.
    3. **No External Knowledge**: Never pull in facts, names, or general knowledge from outside the provided documents. 
    4. **Direct Answers**: Do not write meta-commentary like "Based on the context provided...". Provide the parsed answer directly.
    
    ### Context:
    {context}
    
    ### User Question:
    {question}
    
    Provide your detailed, formatted response below:
    """
    
    print(f"[*] Synthesizing grounded answer from {len(docs)} segments...")
    response = llm.invoke(prompt)
    response_text = response.content if hasattr(response, 'content') else response
    return response_text, docs

def list_indexes():
    if not os.path.exists(config.VECTOR_DIR):
        return []
    return [d for d in os.listdir(config.VECTOR_DIR) if os.path.isdir(os.path.join(config.VECTOR_DIR, d))]
