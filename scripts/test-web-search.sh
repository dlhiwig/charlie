#!/bin/bash
# Test Bravo Web Search Integration

echo "🦊 Testing Bravo Web Search with Brave API"
echo "=========================================="

AUTH_TOKEN="bravo-gateway-auth-token-2026"
BASE_URL="http://127.0.0.1:18797"

echo "1. Testing tools status:"
curl -s -H "Authorization: Bearer $AUTH_TOKEN" "$BASE_URL/api/v1/tools/status" | jq .

echo -e "\n2. Testing quick search:"
curl -s -H "Authorization: Bearer $AUTH_TOKEN" "$BASE_URL/api/v1/search/quick?q=OpenAI+ChatGPT+2026" | jq '.success, .totalResults, .results[0].title'

echo -e "\n3. Testing POST search:"
curl -s -H "Authorization: Bearer $AUTH_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"query": "NVIDIA RTX 4090 specifications", "count": 3}' \
     "$BASE_URL/api/v1/search" | jq '.success, .totalResults'

echo -e "\n4. Testing Brave API directly:"
curl -s -H "Accept: application/json" \
     -H "X-Subscription-Token: BSAFCa9BRKBDLeW9dHg9ocUMFa1Q-6Z" \
     "https://api.search.brave.com/res/v1/web/search?q=test+query&count=2" | jq '.web.results | length'

echo -e "\nWeb search integration test complete."