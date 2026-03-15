#!/bin/bash
# Test Bravo Model Routing

echo "🦊 Testing Bravo Model Routing Configuration"
echo "=============================================="

# Test health
echo "1. Health Check:"
curl -s http://127.0.0.1:18797/health | jq '{status, name, uptime}'

echo -e "\n2. Current Configuration:"
echo "Primary: anthropic/claude-sonnet-4-20250514"
echo "Specialist: ollama/nemotron-3-super:latest"
echo "Fallbacks: openai/gpt-4.1, xai/grok-3-mini-fast, ollama/qwen3.5:27b, ollama/qwen3.5:9b"

echo -e "\n3. GPU Status:"
/usr/lib/wsl/lib/nvidia-smi --query-gpu=name,memory.total,memory.used,utilization.gpu --format=csv,noheader,nounits | head -1

echo -e "\n4. Ollama Models Available:"
ollama list | grep -E "(nemotron|qwen)"

echo -e "\n5. Service Status:"
export DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/$(id -u)/bus
systemctl --user is-active bravo.service

echo -e "\nBravo is configured for:"
echo "• General conversation → Claude Sonnet-4 (best quality)"
echo "• Security audits → Nemotron-3-Super (120B GPU model)"  
echo "• Deep analysis → Nemotron-3-Super (large context)"
echo "• All other tasks → Smart fallback chain"