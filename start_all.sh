#!/bin/bash

# 🦐 Smart Shrimp Farm - One-Command Startup Script
# ================================================
# This script automates the entire startup process
# Note: This works best in bash/zsh; requires iTerm2 on macOS for multi-window mode

set -e

PROJECT_DIR="/Users/deranindugunasekara/Desktop/AquaNext-AI-ShrimpFarm-25-26J-385"
VENV="$PROJECT_DIR/.venv"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     🦐 Smart Shrimp Farm - Startup Script            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if virtual environment exists
if [ ! -d "$VENV" ]; then
    echo -e "${YELLOW}⚠️  Virtual environment not found. Creating...${NC}"
    python3 -m venv "$VENV"
    source "$VENV/bin/activate"
    pip install -q --upgrade pip
    pip install -q -r "$PROJECT_DIR/backend-v2/requirements.txt"
    pip install -q -r "$PROJECT_DIR/backend-v2/iot_gateway/requirements.txt"
    echo -e "${GREEN}✅ Virtual environment created${NC}"
else
    source "$VENV/bin/activate"
    echo -e "${GREEN}✅ Virtual environment activated${NC}"
fi

echo ""
echo -e "${BLUE}📋 Checking prerequisites...${NC}"

# Check MongoDB
if command -v mongosh &> /dev/null; then
    echo -e "${GREEN}✅ MongoDB CLI found${NC}"
    if mongosh --eval "db.adminCommand('ping')" &> /dev/null; then
        echo -e "${GREEN}✅ MongoDB is running${NC}"
    else
        echo -e "${YELLOW}⚠️  MongoDB not running. Starting...${NC}"
        brew services start mongodb-community 2>/dev/null || echo -e "${YELLOW}   Please start MongoDB manually: brew services start mongodb-community${NC}"
        sleep 2
    fi
else
    echo -e "${RED}❌ MongoDB not found. Install with: brew install mongodb-community${NC}"
    exit 1
fi

# Check Node.js
if command -v node &> /dev/null && command -v npm &> /dev/null; then
    echo -e "${GREEN}✅ Node.js and npm found${NC}"
else
    echo -e "${RED}❌ Node.js/npm not found. Install from: https://nodejs.org${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🚀 Starting all services...${NC}"
echo ""

# Detect if running in iTerm2
if [ "$TERM_PROGRAM" = "iTerm.app" ]; then
    
    # iTerm2 - open new windows/tabs
    echo "Opening terminal windows..."
    
    osascript <<EOF
tell application "iTerm"
    activate
    set newWindow to (create window with default profile)
    set bash to default shell
    
    -- Terminal 1: MongoDB (already running, just monitor)
    tell current session
        write text "echo '✅ MongoDB running'; mongosh --eval 'db.stats()' 2>/dev/null || echo '⚠️  MongoDB check'; read -p \"Press Enter to keep this window open...\" dummy"
    end tell
    
    -- Terminal 2: IoT Gateway
    create tab with default profile
    tell current session
        write text "cd $PROJECT_DIR/backend-v2/iot_gateway && source $VENV/bin/activate && python app.py"
    end tell
    
    -- Terminal 3: Prediction API
    create tab with default profile
    tell current session
        write text "cd $PROJECT_DIR/backend-v2 && source $VENV/bin/activate && python api.py"
    end tell
    
    -- Terminal 4: Dashboard
    create tab with default profile
    tell current session
        write text "cd $PROJECT_DIR/backend-v2/web && npm run dev"
    end tell
    
    -- Terminal 5: Landing Page
    create tab with default profile
    tell current session
        write text "cd $PROJECT_DIR/web && npm run dev"
    end tell
    
end tell
EOF
    
    echo -e "${GREEN}✅ Opening iTerm2 windows...${NC}"
    echo ""
    echo "Services starting in separate tabs:"
    echo "  Tab 1: MongoDB Status"
    echo "  Tab 2: IoT Gateway (Port 5000)"
    echo "  Tab 3: Prediction API (Port 5001)"
    echo "  Tab 4: Dashboard (Port 5173)"
    echo "  Tab 5: Landing Page (Port 3000)"
    echo ""
    
else
    
    # Standard terminal - show instructions
    echo -e "${YELLOW}⚠️  Opening multiple terminals automatically requires iTerm2 on macOS${NC}"
    echo ""
    echo -e "${BLUE}To start manually, open 5 terminal windows and run:${NC}"
    echo ""
    echo -e "${GREEN}Terminal 1 (MongoDB - already running):${NC}"
    echo "  echo '✅ MongoDB Status:' && mongosh --eval 'db.stats()'"
    echo ""
    echo -e "${GREEN}Terminal 2 (IoT Gateway - Port 5000):${NC}"
    echo "  cd $PROJECT_DIR/backend-v2/iot_gateway"
    echo "  source $VENV/bin/activate"
    echo "  python app.py"
    echo ""
    echo -e "${GREEN}Terminal 3 (Prediction API - Port 5001):${NC}"
    echo "  cd $PROJECT_DIR/backend-v2"
    echo "  source $VENV/bin/activate"
    echo "  python api.py"
    echo ""
    echo -e "${GREEN}Terminal 4 (Dashboard - Port 5173):${NC}"
    echo "  cd $PROJECT_DIR/backend-v2/web"
    echo "  npm run dev"
    echo ""
    echo -e "${GREEN}Terminal 5 (Landing Page - Port 3000):${NC}"
    echo "  cd $PROJECT_DIR/web"
    echo "  npm run dev"
    echo ""
    echo -e "${BLUE}Or install iTerm2 for automatic multi-window startup:${NC}"
    echo "  brew install iterm2"
    echo ""
    
fi

echo ""
echo -e "${BLUE}📊 Once everything is running, access:${NC}"
echo ""
echo -e "  ${GREEN}Dashboard:${NC}       http://localhost:5173"
echo -e "  ${GREEN}Landing Page:${NC}    http://localhost:3000"
echo -e "  ${GREEN}API Docs:${NC}        http://localhost:5001"
echo -e "  ${GREEN}IoT Gateway:${NC}     http://localhost:5000/health"
echo ""

echo -e "${BLUE}🧪 Test the system:${NC}"
echo ""
echo "  curl http://localhost:5000/health"
echo "  curl http://localhost:5001/api/health"
echo ""

echo -e "${GREEN}✅ Startup script completed!${NC}"
