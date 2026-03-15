# Charlie — Standalone AI Runtime

A lightweight, pure TypeScript AI bot framework with multi-provider LLM support. Built from scratch to be **100% independent** with zero external dependencies.

## What is Charlie?

Charlie is a standalone AI runtime that provides a Telegram bot and HTTP API backed by any combination of LLM providers, wrapped in a clean, minimal architecture.

- **15,200 lines of TypeScript** — 100% owned code, no external frameworks
- **Fastify HTTP gateway** + **grammY Telegram bot** — dual interfaces, single runtime
- **Multi-provider LLM** with automatic fallback (Anthropic, OpenAI, X.AI, Perplexity, Ollama)
- **Web search integration** — Brave Search API for current information
- **Sub-second boot time** — 14 npm dependencies, minimal surface area
- **Zero-cost mode** — run entirely on local models via Ollama

## Quick Start

```bash
git clone https://github.com/dlhiwig/charlie.git
cd charlie && npm install && npx tsc

# Configure your API keys
cp config/charlie.example.json config/charlie.json
# Edit charlie.json with your API keys and bot token

# Start Charlie
node dist/main.js --config=config/charlie.json
```

## Configuration

Charlie uses a single JSON configuration file:

```json
{
  "gateway": {
    "port": 18798,
    "bind": "127.0.0.1",
    "authToken": "your-secure-token"
  },
  "telegram": {
    "botToken": "your-bot-token",
    "allowFrom": ["your-telegram-id"]
  },
  "models": {
    "primary": "anthropic/claude-sonnet-4-20250514",
    "fallbacks": ["openai/gpt-4.1", "ollama/qwen3.5:9b"],
    "providers": {
      "anthropic": {
        "baseUrl": "https://api.anthropic.com",
        "apiKey": "your-key"
      }
    }
  }
}
```

## Features

### Multi-Provider LLM Support
- **Anthropic Claude** — Primary reasoning and conversation
- **OpenAI GPT** — Reliable fallback with strong capabilities  
- **X.AI Grok** — Cost-effective alternative
- **Perplexity Sonar** — Web-enhanced responses
- **Ollama Local** — Free local models (qwen3.5, llama3, etc)

### Web Search Integration
- **Brave Search API** — Current information retrieval
- **Token-efficient** — Smart content extraction
- **Auto-detection** — Triggers on current/recent queries

### Deployment Options
- **Standalone Binary** — Single process, easy deployment
- **Docker Container** — Containerized deployment
- **SystemD Service** — Background daemon mode
- **Cloud Ready** — Deploy to any VPS or cloud platform

### HTTP API
```bash
# Health check
GET /health

# Send message to bot
POST /api/v1/agent/message
{
  "message": "What's the latest in AI?",
  "sessionKey": "user123"
}

# Web search
POST /api/v1/search
{
  "query": "latest AI developments",
  "count": 5
}
```

### Telegram Bot
- **Natural conversation** with multi-provider LLM
- **Web search** via `/search` command or auto-detection
- **Session persistence** with conversation memory
- **Rate limiting** and user allowlists

## Architecture

```
Charlie Runtime
├── Gateway (Fastify HTTP/WebSocket)
│   ├── Health endpoints
│   ├── Agent API
│   └── Web search API
├── Telegram Bot (grammY)
│   ├── Message handling
│   ├── Command processing
│   └── Session management
├── LLM Engine
│   ├── Multi-provider routing
│   ├── Automatic fallback
│   └── Token optimization
└── Web Tools
    ├── Brave Search API
    ├── Content extraction
    └── Smart triggering
```

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Development mode (watch)
npm run dev

# Type checking
npm run typecheck

# Clean build
npm run clean
```

## Production Deployment

### SystemD Service
```bash
# Create service file
sudo cp scripts/charlie.service /etc/systemd/system/
sudo systemctl enable charlie
sudo systemctl start charlie
```

### Docker
```bash
# Build image
docker build -t charlie .

# Run container
docker run -d \
  --name charlie \
  -p 18798:18798 \
  -v ./config:/app/config \
  charlie
```

### Environment Variables
```bash
# API Keys
export ANTHROPIC_API_KEY="your-key"
export OPENAI_API_KEY="your-key"
export XAI_API_KEY="your-key"
export BRAVE_SEARCH_API_KEY="your-key"

# Telegram
export TELEGRAM_BOT_TOKEN="your-token"

# Runtime
export NODE_ENV="production"
export CHARLIE_CONFIG_PATH="/path/to/charlie.json"
```

## Use Cases

### Personal AI Assistant
- **Telegram chat** with multi-provider AI
- **Web search** for current information
- **Session memory** across conversations
- **Multiple fallback models** for reliability

### Development Tool
- **HTTP API** for integration into other apps
- **Webhook support** for automated workflows  
- **Multi-tenant** with session keys
- **Token optimization** for cost control

### Business Bot
- **Customer service** automation
- **Information retrieval** with web search
- **Multi-language** support via different models
- **Usage tracking** and rate limiting

## Security

- **API authentication** via bearer tokens
- **User allowlists** for Telegram access
- **Rate limiting** to prevent abuse
- **Local-first** — no data sent to external analytics
- **Audit logging** for all requests

## Performance

- **Sub-second startup** — Fast boot and restart
- **Low memory** — <100MB typical usage
- **Token efficient** — Smart content optimization
- **Concurrent requests** — Non-blocking async architecture
- **Graceful fallback** — Auto-retry with backup models

## Contributing

Charlie is open source (MIT license). Contributions welcome:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable  
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- **GitHub Issues**: Report bugs or request features
- **Documentation**: See `docs/` directory
- **Examples**: Check `examples/` for usage patterns

---

**Charlie** — Clean, simple, powerful AI runtime. Built for developers who want full control without the complexity.