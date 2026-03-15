# Bravo Model Routing Strategy

## Primary Model: Claude Sonnet-4
**Best-in-class conversational AI for general use**
- Superior reasoning and safety training
- Excellent instruction following
- Natural conversation flow
- Reliable for all standard tasks

## Specialist Model: Nemotron-3-Super (GPU-Accelerated)
**120B parameter model reserved for specialized tasks**
- **Code Security Audits** - Deep vulnerability analysis
- **Formal Verification** - Mathematical proof checking
- **Complex Analysis** - Multi-step reasoning on technical problems
- **Deep Research** - Comprehensive investigation requiring large context

## Fallback Chain
1. **OpenAI GPT-4.1** - Reliable alternative when Claude unavailable
2. **X.AI Grok-3-Mini** - Fast, cost-effective fallback
3. **Qwen 3.5 27B** - Local model with strong capabilities
4. **Qwen 3.5 9B** - Fast local fallback

## Routing Logic
- **Default:** All requests → Claude Sonnet-4
- **Keywords trigger Nemotron:** "audit", "security", "formal verify", "deep analysis"
- **Manual override:** Specify model in request
- **GPU required:** Nemotron falls back to Claude if GPU unavailable

## Performance Characteristics
| Model | Speed | Quality | Cost | Use Case |
|-------|-------|---------|------|----------|
| Claude Sonnet-4 | Fast | Excellent | $$ | General conversation |
| Nemotron-3-Super | Slow | High | Free | Specialist analysis |
| GPT-4.1 | Fast | Good | $$ | Fallback |
| Qwen 27B | Medium | Good | Free | Local processing |

This architecture maximizes both conversational quality and analytical power while maintaining cost efficiency.