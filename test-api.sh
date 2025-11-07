#!/bin/bash
echo "🧪 Testing Parallel Routes API"
echo "=============================="
echo ""

# Wait for server to be ready
echo "Waiting for server..."
sleep 2

# Test 1: ETH → USDC (should work)
echo "Test 1: ETH → USDC"
RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3000/api/parallel-routes \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "fromChain": 1,
    "toChain": 1,
    "fromToken": "0x0000000000000000000000000000000000000000",
    "toToken": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "fromAmount": "1000000000000000000",
    "fromAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9",
    "slippage": 0.5
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ SUCCESS!"
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
else
  echo "❌ FAILED"
  echo "$BODY"
fi

echo ""
echo ""

# Test 2: ETH → PROOF
echo "Test 2: ETH → PROOF"
RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3000/api/parallel-routes \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "fromChain": 1,
    "toChain": 1,
    "fromToken": "0x0000000000000000000000000000000000000000",
    "toToken": "0x9b4a69de6ca0defdd02c0c4ce6cb84de5202944e",
    "fromAmount": "1000000000000000000",
    "fromAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9",
    "slippage": 0.5
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
  echo "✅ API Working (404 means no routes found, which is OK)"
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
else
  echo "❌ FAILED"
  echo "$BODY"
fi
