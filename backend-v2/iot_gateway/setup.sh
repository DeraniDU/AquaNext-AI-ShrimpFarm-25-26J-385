#!/bin/bash

# Quick setup script for IoT Gateway
# Run this from the iot_gateway directory

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     AquaNext IoT Gateway - Quick Setup                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+"
    exit 1
fi

echo "✅ Python 3 found: $(python3 --version)"
echo ""

# Create virtual environment
echo "[1/5] Creating virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✅ Virtual environment created"
else
    echo "⚠️  Virtual environment already exists"
fi

# Activate virtual environment
echo "[2/5] Activating virtual environment..."
source venv/bin/activate
echo "✅ Virtual environment activated"

# Install dependencies
echo "[3/5] Installing Python dependencies..."
pip install --upgrade pip setuptools wheel > /dev/null 2>&1
pip install -r requirements.txt
echo "✅ Dependencies installed"

# Create .env file if it doesn't exist
echo "[4/5] Checking environment configuration..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "✅ Created .env file (edit with your MongoDB URI if needed)"
else
    echo "⚠️  .env file already exists"
fi

# Check MongoDB
echo "[5/5] Checking MongoDB connection..."
python3 << 'PYTHON_EOF'
try:
    from pymongo import MongoClient
    import os
    from dotenv import load_dotenv
    
    load_dotenv()
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
    
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    client.admin.command('ping')
    print(f"✅ MongoDB is running at {mongo_uri}")
except Exception as e:
    print(f"⚠️  MongoDB connection failed: {e}")
    print("")
    print("   🔧 To fix, either:")
    print("   - Start MongoDB: brew services start mongodb-community")
    print("   - Or run Docker: docker run -d -p 27017:27017 mongo:7.0")
    print("")
    print("   📖 See README.md for detailed MongoDB setup")

PYTHON_EOF

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    Setup Complete!                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "🚀 To start the API server:"
echo "   python app.py"
echo ""
echo "📖 For complete instructions, see: README.md"
echo ""
echo "🔧 Next steps:"
echo "   1. Update .env with your MongoDB URI (if not local)"
echo "   2. Update ESP32 firmware WiFi credentials"
echo "   3. Update SERVER_ADDRESS in ESP32 firmware with your PC's IP"
echo "   4. Upload firmware to ESP32"
echo "   5. Start Flask API: python app.py"
echo "   6. Power on ESP32 and check Serial Monitor"
echo ""
