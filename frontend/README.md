# DocMind RAG Frontend

This is the interactive React (Next.js) user interface for the local Runtime RAG AI system. It features a modern, clean sidebar design for document management and a main chat interface with citation blocks.

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your computer.

### Installation

1. Navigate to this frontend directory:
   ```bash
   cd frontend/docuchat-rag-interface
   ```
2. Install the necessary dependencies via npm:
   ```bash
   npm install
   ```

### Running the Application

1. Ensure your **Python Backend is running** on `http://localhost:8000` (e.g. `python api.py` from your backend folder).
2. Start the frontend development server:
   ```bash
   npm run dev
   ```
3. Open your browser and navigate to: **`http://localhost:3000`**

### Configuration
The backend connection URL is explicitly defined in `app/page.tsx` as `const BASE_URL = "http://localhost:8000"`. If you ever change your FastAPI server's port, make sure to update this constant.
