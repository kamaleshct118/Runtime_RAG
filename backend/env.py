import os
from dotenv import load_dotenv

# Load key-value pairs from a local .env file if it exists
load_dotenv()

# Find the absolute directory this file lives in
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Core Model Configurations
MODEL_NAME = os.getenv("MODEL_NAME", "llama-3.3-70b-versatile")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_BASE_URL = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
EMBED_MODEL = os.getenv("EMBED_MODEL", "nomic-ai/nomic-embed-text-v1.5")

# Local Storage Directory Paths (absolute resolution)
VECTOR_DIR = os.getenv("VECTOR_DIR", os.path.join(BASE_DIR, "vectorstore"))
UPLOAD_DIR = os.getenv("UPLOAD_DIR", os.path.join(BASE_DIR, "uploads"))
