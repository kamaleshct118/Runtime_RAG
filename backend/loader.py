import re
import os
import shutil
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
import config

def process_pdf(file_path):
    """
    Step 1: Read PDF
    Step 2: Clean text
    Step 3: Split into chunks
    """
    # Create safe document ID and copy to uploads folder
    base_name = os.path.basename(file_path)
    doc_id = re.sub(r'[^a-zA-Z0-9]', '_', os.path.splitext(base_name)[0])
    
    os.makedirs(config.UPLOAD_DIR, exist_ok=True)
    dest_path = os.path.join(config.UPLOAD_DIR, base_name)
    if os.path.abspath(file_path) != os.path.abspath(dest_path):
        shutil.copy2(file_path, dest_path)
    
    print(f"[*] Extracting text from {base_name}...")
    loader = PyMuPDFLoader(dest_path)
    docs = loader.load()
    
    # Simple cleaning
    for d in docs:
        d.page_content = re.sub(r'\s+', ' ', d.page_content).strip()
    
    print(f"[*] Splitting into chunks...")
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=400, 
        chunk_overlap=50,
        separators=["\n\n", "\n", ".", " ", ""]
    )
    chunks = splitter.split_documents(docs)
    
    return chunks, doc_id
