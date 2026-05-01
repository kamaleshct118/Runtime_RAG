import os

# CONFIGURATION FILE TEMPLATE
# Copy this file to "config.py" and fill in your actual model details and API keys.

# Dynamically find the directory this config file lives in
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_NAME = "llama-3.3-70b-versatile"
GROQ_API_KEY = "your_api_key_here"
GROQ_BASE_URL = "https://api.groq.com/openai/v1"
EMBED_MODEL = "nomic-ai/nomic-embed-text-v1.5"

# Ensure absolute paths so it functions properly even if run from root
VECTOR_DIR = os.path.join(BASE_DIR, "vectorstore")
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
