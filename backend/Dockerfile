FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim

WORKDIR /app

# Copy dependency files first for layer caching
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# Copy application code
COPY . .

# Ensure epub storage directory exists
RUN mkdir -p /app/epubs

ENV PYTHONUNBUFFERED=1

EXPOSE 8090

CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8090"]
