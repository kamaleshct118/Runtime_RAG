<div align="center">
  <h1>Runtime RAG: Advanced Document Intelligence Engine</h1>
  <p>A high-performance, full-stack Retrieval-Augmented Generation (RAG) framework utilizing FastAPI, Next.js, FAISS, and the Groq API for lightning-fast, highly accurate document analysis.</p>
</div>

---

## 🎯 What is this Experiment About?

**Runtime RAG** is an advanced exploration into building a "NotebookLLM-like" experience. The goal of this experiment is to create a blazing-fast, hallucination-free AI assistant that can read, understand, and answer questions about your private PDF documents. 

By leveraging the **Groq API** (using `ChatOpenAI` wrappers), this framework achieves dramatically reduced inference latency while maintaining the intelligence of massive models. It goes beyond standard "toy" RAG tutorials by implementing enterprise-grade retrieval techniques like **Multi-Query Semantic Expansion** and **Contextual Neighborhood Searching**.

Whether you are a beginner looking to understand how AI reads documents, a learner studying advanced search algorithms, or an expert analyzing full-stack RAG pipelines, this repository serves as a comprehensive blueprint.

---

## ⚡ Architectural Design: The Groq API & Hybrid Privacy

This framework is built specifically around the **Groq API** to maximize speed without sacrificing data security. Here is an analysis of the technical design:

* **The Groq API Advantage:** Standard local RAG systems or traditional cloud APIs can cause latency spikes, breaking the "conversational" feel of an assistant. Groq utilizes custom LPU (Language Processing Unit) hardware designed specifically for blazing-fast inference. The generation layer processes massive context windows and outputs answers at over 800 tokens per second, resulting in a near-instantaneous user experience.
* **The Hybrid Privacy Approach:** While generation relies on the lightning-fast Groq API, we preserve maximum privacy in the *Retrieval* phase. The embeddings (`HuggingFaceEmbeddings`) and the vector database (`FAISS`) **run entirely locally on your machine**. Your entire PDF is never uploaded to a cloud server. Only the specific, highly-filtered context chunks required to answer a single question are securely sent over the Groq API. This achieves the perfect balance: the absolute privacy and cost-efficiency of local vector search combined with the unmatched speed of cloud-based LPU inference.

---

## 🧠 Theoretical Concepts & Architecture Walkthrough

At its core, a RAG system prevents AI hallucinations by forcing the LLM to read relevant document snippets *before* it answers a question. Here is how the system is organized and exactly what every component does.

### 1. The Ingestion Pipeline (`backend/loader.py`)

* **What it does:** Extracts text from uploaded PDFs and slices it into manageable pieces.
* **Why it is used:** LLMs have limited "context windows" (memory). You cannot feed a 1,000-page book into an AI all at once. We must break the book into "chunks."
* **The Theory:** We use a `RecursiveCharacterTextSplitter`. Instead of cutting blindly every 400 characters, it recursively looks for double newlines (`\n\n`), then single newlines, then periods. This guarantees that **sentences and paragraphs are not cut in half**, preserving semantic meaning.
* **Similar Tech:** `PyPDF2` (Slower, worse formatting preservation). We use `PyMuPDFLoader` because it is currently the industry standard for fast, highly accurate PDF parsing in Python.

### 2. The Vectorizer & Storage (`backend/indexer.py`)

* **What it does:** Converts human text chunks into massive arrays of numbers (vectors) and saves them to a database.
* **Why it is used:** Computers cannot measure the "distance" between words, but they can measure the distance between numbers. By converting text into vectors using `HuggingFaceEmbeddings`, the system can instantly find text that means the same thing, even if different words are used.
* **The Theory:** We use **FAISS** (Facebook AI Similarity Search) as our database. It uses L2 (Euclidean) distance or Cosine Similarity to find vectors pointing in the same direction.
* **Similar Tech:** `ChromaDB` or `Pinecone`. Pinecone is cloud-based (costs money, requires internet). ChromaDB is great, but FAISS is exceptionally lightweight and perfectly suited for fast, localized RAM-based retrieval without spinning up Docker containers.

### 3. The Brain & Retrieval Engine (`backend/retriever.py`)

This file contains the "secret sauce" of the project, elevating it above basic RAG systems.

* **What it does:** Intercepts the user's question, optimizes it, searches the FAISS database, and forces the LLM to write a grounded answer.
* **The Theory (Multi-Query Expansion):** Beginners often ask vague or misspelled questions. Instead of taking the user's prompt directly to the database, we pass it to the Groq LLM first with a strict prompt: *"Generate exactly 3 highly effective search queries."* This casts a wider net and drastically improves search recall.
* **The Theory (Neighborhood Search):** If the system detects the user is asking for a "summary," and it finds relevant text on Page 1, it automatically triggers a secondary search to grab Pages 2 and 3. This ensures the AI doesn't miss the rest of an Introduction that spans a page break.
* **Why it is used:** To completely eliminate AI hallucinations. The prompt explicitly threatens the LLM: *If the context does not contain the answer, respond EXACTLY with "Information not found".*

### 4. The API Layer (`backend/api.py`)

* **What it does:** The bridge between the Python AI logic and the outside world.
* **Why it is used:** To serve the AI over standard HTTP protocols so a web frontend can interact with it.
* **Similar Tech:** `Flask` or `Django`. We use **FastAPI** because it is asynchronous, natively supports Pydantic data validation (ensuring the frontend sends the correct JSON payloads), and auto-generates Swagger documentation.

### 5. The Frontend Interface (`frontend/`)

* **What it does:** A sleek, modern web interface built with **Next.js** and React.
* **Why it is used:** To provide a ChatGPT-like user experience where users can upload PDFs visually, view the parsing status, and chat with their documents.
* **Similar Tech:** `Streamlit` or `Gradio`. While Streamlit is great for rapid prototyping, a custom Next.js frontend allows for infinitely more control over the UI/UX, animations, and complex state management (like rendering chat histories).

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- A free [Groq API Key](https://console.groq.com/keys)

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment and install dependencies:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. Configure your API keys in `config.py` (duplicate `config.example.py` if needed):
   ```python
   # backend/config.py
   GROQ_API_KEY = "gsk_your_api_key_here"
   MODEL_NAME = "llama3-8b-8192" # Or any supported Groq model
   ```
4. Start the FastAPI server:
   ```bash
   python api.py
   ```
   *The API will be live at `http://localhost:8000`*

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   *The UI will be accessible at `http://localhost:3000`*

---

## 🛠️ Future Roadmap

- **Conversational Memory:** Injecting Chat History arrays into the multi-query prompt to allow for follow-up questions ("What did you mean by that?").
- **Cross-Document Search:** Allowing the FAISS indexer to load multiple documents into RAM simultaneously for comparative analysis.
- **Support for More Extensions:** Expanding `loader.py` to handle `.docx`, `.csv`, and Markdown files.

> **Note to Learners:** If you are studying this codebase, pay special attention to `backend/retriever.py`. Understanding how `generate_queries` and the grounded Prompt Engineering work is crucial to mastering modern AI application development.
