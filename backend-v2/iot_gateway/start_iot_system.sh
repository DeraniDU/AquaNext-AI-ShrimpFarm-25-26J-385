#!/bin/bash

# 🚀 Smart Shrimp Farm - IoT System Quick Start
# ==========================================
# This script sets up and starts the entire IoT ecosystem

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🦐 Smart Shrimp Farm - IoT System Quick Start         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

PROJECT_ROOT="/Users/deranindugunasekara/Desktop/AquaNext-AI-ShrimpFarm-25-26J-385"
IOT_GATEWAY_DIR="$PROJECT_ROOT/backend-v2/iot_gateway"
VENV="$PROJECT_ROOT/.venv"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if virtual environment exists
if [ ! -d "$VENV" ]; then
    echo -e "${YELLOW}⚠️  Virtual environment not found. Creating...${NC}"
    python3 -m venv "$VENV"
fi

# Activate virtual environment
source "$VENV/bin/activate"

echo -e "${BLUE}📦 Step 1: Installing dependencies...${NC}"
cd "$IOT_GATEWAY_DIR"

# Create requirements.txt if it doesn't exist
if [ ! -f "requirements.txt" ]; then
    cat > requirements.txt << 'EOF'
flask>=2.3.0
flask-cors>=4.0.0
pymongo>=4.0.0
python-dotenv>=0.19.0
numpy>=1.24.0
EOF
    echo "   Created requirements.txt"
fi

pip install -q -r requirements.txt
echo -e "${GREEN}✅ Dependencies installed${NC}"

# Check MongoDB
echo ""
echo -e "${BLUE}🍃 Step 2: Checking MongoDB...${NC}"

# Try to connect to MongoDB
if command -v mongosh &> /dev/null; then
    echo "   MongoDB CLI found"
    if mongosh --eval "db.adminCommand('ping')" &> /dev/null; then
        echo -e "${GREEN}✅ MongoDB is running locally${NC}"
    else
        echo -e "${YELLOW}⚠️  MongoDB is not running${NC}"
        echo "   Start MongoDB with: brew services start mongodb-community"
    fi
else
    echo -e "${YELLOW}⚠️  MongoDB CLI not found (mongosh)${NC}"
    echo "   Check if MongoDB is running on your system"
fi

# Check environment variables
echo ""
echo -e "${BLUE}⚙️  Step 3: Checking environment configuration...${NC}"

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from .env.example...${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Created .env file${NC}"
        echo "   ⚠️  Edit .env with your MongoDB connection details:"
        cat .env
    else
        echo -e "${RED}❌ .env.example not found!${NC}"
    fi
else
    echo -e "${GREEN}✅ .env file exists${NC}"
fi

# Display configuration
echo ""
echo -e "${BLUE}📋 Configuration:${NC}"
grep "^[^#]" "$IOT_GATEWAY_DIR/.env" 2>/dev/null || echo "   (No .env found)"

# Start the services
echo ""
echo -e "${BLUE}🚀 Step 4: Starting IoT Gateway API...${NC}"
echo "   Port: 5000"
echo "   Location: $IOT_GATEWAY_DIR"
echo ""

cd "$IOT_GATEWAY_DIR"
python app.py

# If you want to add more services in background, uncomment below:
# python app.py &
# API_PID=$!
# echo "   IoT Gateway PID: $API_PID"
# 
# echo ""
# echo -e "${BLUE}📊 Step 5: Starting Main Prediction API...${NC}"
# echo "   Port: 5001"
# python "$PROJECT_ROOT/backend-v2/api.py" &
# MAIN_API_PID=$!
# echo "   Main API PID: $MAIN_API_PID"
# 
# echo ""
# echo -e "${GREEN}✅ All systems running!${NC}"
# echo ""
# echo "📡 Endpoints:"
# echo "   IoT Gateway:     http://localhost:5000"
# echo "   Prediction API:  http://localhost:5001"
# echo "   Dashboard:       http://localhost:5173"
# echo ""
# echo "Press Ctrl+C to stop all services"
# wait
