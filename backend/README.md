---
title: Runtime RAG Backend
emoji: ⚡
colorFrom: blue
colorTo: indigo
sdk: docker
pinned: false
---

# ⚡ Runtime RAG Backend API

This repository contains the high-fidelity, production-ready backend for the **Runtime RAG** system. It is a stateless FastAPI server powered by **Supabase pgvector** and **Supabase Storage**, designed to handle massive vector embeddings and high-performance similarity retrievals in real-time.

## 🚀 Key Features

* **100% Stateless Container Architecture:** Engineered perfectly to run on Hugging Face Spaces (using a lightweight `Dockerfile`). Since all documents and embeddings are stored persistently on the Supabase Cloud, your Space is completely immune to container crashes or restarts.
* **Hybrid Search Strategy:** Implements a dynamic multi-query strategy, utilizing local CPU-optimized Nomic embeddings (`nomic-embed-text-v1.5`) and LLM synthesis powered by Groq's high-speed inference engine (`llama-3.3-70b-versatile`).
* **Supabase pgvector Extension:** Replaces legacy, local FAISS vector stores. Cosine similarity queries are executed directly inside a Postgres database utilizing advanced HNSW indexes for sub-5ms retrieval speeds.
* **Stateless PDF Object Storage:** Integrates securely with Supabase Storage buckets (`document-uploads`) to upload and stream source PDFs, enabling coordinate-based citation lookups and side-by-side reading in the frontend.

## 🛠️ Tech Stack

* **Framework:** FastAPI (Python 3.10)
* **Embedding Model:** `nomic-ai/nomic-embed-text-v1.5` (CPU-optimized)
* **LLM Engine:** Groq API (ChatOpenAI wrapper)
* **Storage & DB:** Supabase Client (PostgreSQL, pgvector, Object Storage)
* **Containerization:** Docker

## 🔑 Environment Variables & Settings

Configure these secrets inside your Hugging Face Space Settings:

```env
MODEL_NAME="llama-3.3-70b-versatile"
GROQ_API_KEY="your-groq-api-key"
GROQ_BASE_URL="https://api.groq.com/openai/v1"
EMBED_MODEL="nomic-ai/nomic-embed-text-v1.5"

PORT=7860
ENV="production"

SUPABASE_URL="https://your-project-id.supabase.co"
SUPABASE_KEY="your-anon-or-service-role-key"
```

## 🐳 Running Locally with Docker

To build and run this container locally:

```bash
docker build -t runtime-rag-backend .
docker run -p 8000:7860 --env-file .env runtime-rag-backend
```
