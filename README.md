# Advanced Document Intelligence & Semantic Synthesis Engine

An experimental, high-performance **Local RAG (Retrieval-Augmented Generation) Framework** designed to emulate the analytical depth of "NotebookLLM" within a completely private, local environment. This project explores the frontiers of semantic document understanding by implementing sophisticated retrieval architectures and grounded synthesis pipelines.

## 🚀 Core Methodologies Implemented

This project transcends basic vector search by implementing a multi-layered retrieval strategy to ensure maximum accuracy and contextual relevance.

### 1. Multi-Query Semantic Expansion
To bridge the gap between user intent and document terminology, I **implemented a multi-query expansion layer**. The system utilizes a local LLM to decompose a single user query into multiple semantic perspectives. This technique:
- Corrects orthographic variations and technical typos in the input.
- Generates diversified search vectors to capture information that might be phrased differently across sections.
- Enhances recall by aggregating results from several "semantic viewpoints."

### 2. The "Neighborhood Search" Rule
Recognizing that relevant information is often contiguous rather than isolated, I **tried out a neighborhood-based retrieval strategy**. When the engine detects queries targeting early document segments (e.g., abstracts, introductions), it dynamically expands its search radius to the surrounding pages. This ensures that the context provided to the LLM is comprehensive and structurally coherent.

### 3. High-Fidelity Grounded Synthesis
The generation pipeline is strictly **grounded on the retrieved context**. I implemented a "Zero-Hallucination" prompt architecture that enforces:
- **Strict Factual Adherence**: The model is prohibited from inventing data, formulas, or code not present in the source.
- **Consolidated Summarization**: Multiple overlapping chunks are synthesized into a coherent, non-repetitive response.
- **Source Transparency**: Every answer is derived from specific page-level metadata preserved during the ingestion process.

---

## 🛠️ Technical Architecture

The engine is built on a robust, local-first stack optimized for speed and privacy:

- **Inference Engine**: [Ollama](https://ollama.ai/) running customized models (e.g., Mistral/Llama3) for high-reasoning tokens.
- **Vector Database**: [FAISS](https://github.com/facebookresearch/faiss) for efficient similarity search with `all-MiniLM-L6-v2` embeddings.
- **Orchestration**: Built with **LangChain**, utilizing `RecursiveCharacterTextSplitter` for semantic chunking and `PyMuPDF` for high-accuracy PDF parsing.
- **Optimization Layer**: I implemented a **RAM-based caching system** for both the embedding models and vector stores. This ensures that subsequent interactions are nearly instantaneous, as model weights and indices remain resident in memory.

---

## 📈 Performance & Experience

By leveraging **semantic chunking** (400-token windows with 50-token overlap), the engine maintains the granular nuance of technical documents while providing enough context for the LLM to understand complex relationships. The result is a project that successfully **tries out a "NotebookLLM-like" experience**—allowing users to interact with their personal library of documents with zero data leakage to the cloud.

---

## 🖥️ Getting Started

### Prerequisites
- Python 3.10+
- [Ollama](https://ollama.com/) installed and running locally.

### Installation
1. Clone the repository and navigate to the project directory.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Configure your local model in `config.py`:
   ```python
   MODEL_NAME = "mistral-custom:latest"
   EMBED_MODEL = "all-MiniLM-L6-v2"
   ```

### Operational Workflow
1. **Ingestion**: Drop your PDFs into the `uploads/` directory.
2. **Indexing**: Run the indexer to generate the FAISS vector stores.
3. **Inference**: Use the interactive CLI or API to query your documents.

---

> [!NOTE]  
> This project was developed as a deep dive into **Agentic Retrieval** and **Local Document Intelligence**. It serves as a proof-of-concept for high-accuracy, private document analysis.
