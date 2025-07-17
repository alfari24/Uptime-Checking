#!/bin/bash

echo "Testing Self-Hosted Status Monitor..."

# Test 1: Health check
echo "1. Testing health endpoint..."
if curl -s -f http://localhost:3001/health > /dev/null; then
    echo "✓ Health endpoint working"
else
    echo "✗ Health endpoint failed"
    exit 1
fi

# Test 2: Status API
echo "2. Testing status API..."
STATUS_RESPONSE=$(curl -s http://localhost:3001/api/status)
if echo "$STATUS_RESPONSE" | jq -e '.monitors' > /dev/null; then
    echo "✓ Status API working"
else
    echo "✗ Status API failed"
    exit 1
fi

# Test 3: Config API
echo "3. Testing config API..."
CONFIG_RESPONSE=$(curl -s http://localhost:3001/api/config)
if echo "$CONFIG_RESPONSE" | jq -e '.title' > /dev/null; then
    echo "✓ Config API working"
else
    echo "✗ Config API failed"
    exit 1
fi

# Test 4: Monitor status
echo "4. Testing monitor status..."
MONITOR_UP=$(echo "$STATUS_RESPONSE" | jq -r '.monitors["localhost-test"].up')
if [ "$MONITOR_UP" = "true" ]; then
    echo "✓ Monitor is up and working"
else
    echo "✗ Monitor is down"
    exit 1
fi

# Test 5: Database file exists
echo "5. Testing database creation..."
if [ -f "./test-status.db" ]; then
    echo "✓ Database file created"
else
    echo "✗ Database file not found"
    exit 1
fi

echo ""
echo "All tests passed! ✓"
echo "Self-hosted status monitor is working correctly."