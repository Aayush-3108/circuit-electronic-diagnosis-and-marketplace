FROM python:3.11-slim

# Install system libraries needed by Pillow / OpenCV / Ultralytics
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code and models
COPY . .

# Ensure data directory exists for SQLite
RUN mkdir -p /app/data

EXPOSE 8000

# Run Uvicorn listening on the dynamically assigned platform PORT (fallback to 8000)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
