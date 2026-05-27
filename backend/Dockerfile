FROM python:3.10-slim

# Install system dependencies (build essentials, curl for health checks)
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set up working directory in container
WORKDIR /app

# Copy requirements file first to take advantage of Docker layer caching
COPY requirements.txt .

# Install python packages
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your application code
COPY . .

# Hugging Face Spaces binds container ports to 7860 automatically
ENV PORT=7860
ENV ENV=production

# Expose port 7860
EXPOSE 7860

# Start Uvicorn via python main.py entrypoint
CMD ["python", "main.py"]
