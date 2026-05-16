#!/usr/bin/env bash
set -e

IMAGE_NAME="claude-dev"
DOCKERFILE="Dockerfile.claude"

# Build image if not exists or --build flag passed
if [[ "$1" == "--build" ]] || ! docker image inspect "$IMAGE_NAME" &>/dev/null; then
  echo "Building image: $IMAGE_NAME ..."
  docker build -f "$DOCKERFILE" -t "$IMAGE_NAME" .
  shift 2>/dev/null || true
fi

# ANTHROPIC_API_KEY must be set in the host environment
if [[ -z "$ANTHROPIC_API_KEY" ]]; then
  echo "Error: ANTHROPIC_API_KEY is not set." >&2
  echo "Run: export ANTHROPIC_API_KEY=sk-ant-..." >&2
  exit 1
fi

# Mount current directory as /workspace (bidirectional sync via bind mount)
# Mount ~/.claude to persist login session across container restarts
docker run -it --rm \
  --name claude-workspace \
  -v "$(pwd):/workspace" \
  -v "$HOME/.claude:/home/developer/.claude" \
  -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
  -w /workspace \
  "$IMAGE_NAME" \
  "${@:-claude}"
