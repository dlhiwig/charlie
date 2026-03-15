#!/bin/bash
# Bravo System Service Launcher
# For GPU-accelerated Nemotron-3-Super deployment

set -e

# Environment setup
export NODE_ENV=production
export CUDA_VISIBLE_DEVICES=0
export NVIDIA_VISIBLE_DEVICES=0

# Bravo directories
BRAVO_HOME="/home/toba/bravo"
CONFIG_FILE="${BRAVO_HOME}/config/bravo.production.json"
PID_FILE="/var/run/bravo.pid"
LOG_FILE="/home/toba/.bravo/bravo.log"

# Ensure directories exist
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p /home/toba/.bravo

# Change to Bravo directory
cd "$BRAVO_HOME"

# Pre-flight checks
echo "[$(date)] Starting Bravo pre-flight checks..." >> "$LOG_FILE"

# Check GPU availability
if ! /usr/lib/wsl/lib/nvidia-smi > /dev/null 2>&1; then
    echo "[$(date)] WARNING: GPU not detected, falling back to CPU-only mode" >> "$LOG_FILE"
    export OLLAMA_GPU=false
else
    echo "[$(date)] GPU detected: RTX 4090, enabling acceleration" >> "$LOG_FILE"
    export OLLAMA_GPU=true
fi

# Check Ollama service
if ! curl -s http://127.0.0.1:11434/api/tags > /dev/null; then
    echo "[$(date)] ERROR: Ollama service not available at localhost:11434" >> "$LOG_FILE"
    exit 1
fi

# Check if Nemotron is available
if ! curl -s http://127.0.0.1:11434/api/tags | jq -e '.models[] | select(.name == "nemotron-3-super:latest")' > /dev/null; then
    echo "[$(date)] WARNING: Nemotron-3-Super not found, using fallback models" >> "$LOG_FILE"
fi

# Start Bravo
echo "[$(date)] Launching Bravo..." >> "$LOG_FILE"
exec node dist/main.js --config="$CONFIG_FILE" >> "$LOG_FILE" 2>&1