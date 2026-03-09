#!/bin/bash
# ─── AquaNext IoT Gateway Startup Script ───
# Run this from the iot_gateway directory: bash start.sh

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo "════════════════════════════════════════"
echo "  AquaNext IoT Gateway"
echo "════════════════════════════════════════"

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "❌ venv not found! Run: python3 -m venv venv && ./venv/bin/pip install -r requirements.txt"
    exit 1
fi

echo "✅ Starting IoT Gateway API..."
echo "   Press Ctrl+C to stop."
echo ""

./venv/bin/python3 app.py
