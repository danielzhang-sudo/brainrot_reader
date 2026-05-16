FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim

WORKDIR /app

# Install ffmpeg and deno (yt-dlp requires a JS runtime; deno is enabled by default)
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg unzip curl ca-certificates && \
    rm -rf /var/lib/apt/lists/* && \
    curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh && \
    chmod +x /usr/local/bin/deno

# Copy dependency files first for layer caching
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# Copy application code
COPY . .

# Ensure storage directories exist
RUN mkdir -p /app/epubs /app/music

ENV PYTHONUNBUFFERED=1

EXPOSE 8090

CMD ["uv", "run", "python", "main.py"]
