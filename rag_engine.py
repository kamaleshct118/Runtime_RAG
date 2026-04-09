import os
import re
import shutil
from langchain_community.document_loaders import PyMuPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.llms import Ollama

class RuntimeRAG:
    def __init__(self, model_name="llama3", embedding_model="all-MiniLM-L6-v2"):
        print(f"[*] Initializing Embedding Model: {embedding_model}...")
        self.embeddings = HuggingFaceEmbeddings(model_name=embedding_model)
        self.llm = Ollama(model=model_name)
        self.vector_db = None
        self.db_root = "vectorstore"
        self.upload_dir = "uploads"
        
        # Ensure directories exist
        os.makedirs(self.db_root, exist_ok=True)
        os.makedirs(self.upload_dir, exist_ok=True)

    def clean_text(self, text):
        """Sanitizes PDF text."""
        text = re.sub(r'\n+', '\n', text)
        text = re.sub(r'\s+', ' ', text)
        return text.strip()

    def get_safe_filename(self, file_path):
        """Extracts a sanitized filename to use as a folder name."""
        base = os.path.basename(file_path)
        name = os.path.splitext(base)[0]
        # Remove non-alphanumeric characters for safety
        return re.sub(r'[^a-zA-Z0-9]', '_', name)

    def ingest_new_document(self, file_path):
        """Processes a new PDF, copies it to uploads, and saves unique index."""
        if not os.path.exists(file_path):
            return False, f"Error: File {file_path} not found."

        doc_id = self.get_safe_filename(file_path)
        dest_pdf = os.path.join(self.upload_dir, os.path.basename(file_path))
        index_dir = os.path.join(self.db_root, doc_id)

        # 1. Copy file to uploads for record-keeping
        try:
            shutil.copy2(file_path, dest_pdf)
        except Exception as e:
            return False, f"Error copying file: {e}"

        print(f"[*] Loading and parsing: {dest_pdf}")
        loader = PyMuPDFLoader(dest_pdf)
        documents = loader.load()

        # Clean documents
        for doc in documents:
            doc.page_content = self.clean_text(doc.page_content)

        # Semantic Chunking
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=400,
            chunk_overlap=50,
            separators=["\n\n", "\n", ".", " ", ""]
        )
        chunks = text_splitter.split_documents(documents)
        
        # Create store
        print(f"[*] Generating embeddings for '{doc_id}'...")
        self.vector_db = FAISS.from_documents(chunks, self.embeddings)
        
        # Save to unique directory
        self.vector_db.save_local(index_dir)
        return True, f"Success: Index for '{doc_id}' created in {index_dir}"

    def list_available_indexes(self):
        """Returns a list of folders in the vectorstore directory."""
        if not os.path.exists(self.db_root):
            return []
        # Return only directories that contain a FAISS index
        return [d for d in os.listdir(self.db_root) 
                if os.path.isdir(os.path.join(self.db_root, d))]

    def load_index_by_name(self, index_name):
        """Loads a specific FAISS index by folder name."""
        index_path = os.path.join(self.db_root, index_name)
        if not os.path.exists(index_path):
            return False, f"Error: Index '{index_name}' not found."
        
        print(f"[*] Loading index: {index_name}...")
        self.vector_db = FAISS.load_local(
            index_path, 
            self.embeddings, 
            allow_dangerous_deserialization=True
        )
        return True, f"Success: '{index_name}' is now active."

    def ask(self, question):
        """Retrieves and generates answer."""
        if not self.vector_db:
            return "Error: No active index. Load one first.", []

        docs = self.vector_db.similarity_search(question, k=4)
        context = "\n---\n".join([f"[Page {d.metadata.get('page', '??')}]: {d.page_content}" for d in docs])
        
        prompt = f"""
        Answer strictly from context. If not found, say 'Not in document.'
        
        CONTEXT:
        {context}
        
        QUESTION:
        {question}
        """
        return self.llm.invoke(prompt), docs
