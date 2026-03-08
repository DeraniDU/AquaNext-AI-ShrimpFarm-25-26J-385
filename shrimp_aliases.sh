# 🦐 Smart Shrimp Farm - Shell Aliases & Functions
# Add these to your ~/.zshrc or ~/.bash_profile for quick access

PROJECT_DIR="/Users/deranindugunasekara/Desktop/AquaNext-AI-ShrimpFarm-25-26J-385"
VENV="$PROJECT_DIR/.venv"

# ═══════════════════════════════════════════════════
# Quick Startup Commands
# ═══════════════════════════════════════════════════

# Start everything with one command
alias shrimp-start="bash $PROJECT_DIR/start_all.sh"

# Start just the IoT Gateway
alias shrimp-iot="cd $PROJECT_DIR/backend-v2/iot_gateway && source $VENV/bin/activate && python app.py"

# Start just the Prediction API
alias shrimp-api="cd $PROJECT_DIR/backend-v2 && source $VENV/bin/activate && python api.py"

# Start just the Dashboard
alias shrimp-dashboard="cd $PROJECT_DIR/backend-v2/web && npm run dev"

# Start just the Landing Page
alias shrimp-landing="cd $PROJECT_DIR/web && npm run dev"

# ═══════════════════════════════════════════════════
# MongoDB Commands
# ═══════════════════════════════════════════════════

# Start MongoDB
alias shrimp-db-start="brew services start mongodb-community && echo '✅ MongoDB started'"

# Stop MongoDB
alias shrimp-db-stop="brew services stop mongodb-community && echo '✅ MongoDB stopped'"

# Status of MongoDB
alias shrimp-db-status="brew services list | grep mongodb"

# Connect to MongoDB
alias shrimp-db-connect="mongosh"

# View database stats
alias shrimp-db-stats="mongosh shrimp_farm_iot --eval 'db.stats()' && mongosh shrimp_farm_iot --eval 'db.sensor_readings.count()'"

# Export data from MongoDB
shrimp-db-export() {
    mongodump --db shrimp_farm_iot --out "./shrimp_farm_backup_$(date +%Y%m%d_%H%M%S)"
    echo "✅ Database exported"
}

# ═══════════════════════════════════════════════════
# Project Navigation
# ═══════════════════════════════════════════════════

# Go to project root
alias shrimp="cd $PROJECT_DIR"

# Go to backend-v2
alias shrimp-backend="cd $PROJECT_DIR/backend-v2"

# Go to IoT Gateway
alias shrimp-iot-dir="cd $PROJECT_DIR/backend-v2/iot_gateway"

# Go to Dashboard
alias shrimp-dashboard-dir="cd $PROJECT_DIR/backend-v2/web"

# Go to Landing Page
alias shrimp-landing-dir="cd $PROJECT_DIR/web"

# ═══════════════════════════════════════════════════
# Activate Virtual Environment
# ═══════════════════════════════════════════════════

alias shrimp-env="source $VENV/bin/activate"

# ═══════════════════════════════════════════════════
# Check System Status
# ═══════════════════════════════════════════════════

# Check all services status
alias shrimp-status="echo '🔍 Service Status:' && \
    echo '' && \
    echo 'MongoDB:' && (brew services list | grep mongodb || echo '  Not running') && \
    echo '' && \
    echo 'Port 5000 (IoT Gateway):' && (lsof -i :5000 | tail -1 || echo '  Not running') && \
    echo '' && \
    echo 'Port 5001 (Prediction API):' && (lsof -i :5001 | tail -1 || echo '  Not running') && \
    echo '' && \
    echo 'Port 5173 (Dashboard):' && (lsof -i :5173 | tail -1 || echo '  Not running') && \
    echo '' && \
    echo 'Port 3000 (Landing Page):' && (lsof -i :3000 | tail -1 || echo '  Not running')"

# Test all APIs
alias shrimp-test="echo '🧪 Testing APIs...' && \
    echo '' && \
    echo 'IoT Gateway Health:' && curl -s http://localhost:5000/health | jq . || echo 'Not responding' && \
    echo '' && \
    echo 'Prediction API Health:' && curl -s http://localhost:5001/api/health | jq . || echo 'Not responding'"

# ═══════════════════════════════════════════════════
# Utility Functions
# ═══════════════════════════════════════════════════

# Install dependencies (run from root)
shrimp-install() {
    echo "📦 Installing Python dependencies..."
    source $VENV/bin/activate
    pip install -q -r $PROJECT_DIR/backend-v2/requirements.txt
    pip install -q -r $PROJECT_DIR/backend-v2/iot_gateway/requirements.txt
    echo "✅ Python dependencies installed"
    
    echo ""
    echo "📦 Installing Node dependencies..."
    cd $PROJECT_DIR/backend-v2/web && npm install
    cd $PROJECT_DIR/web && npm install
    echo "✅ Node dependencies installed"
}

# Clean up all services (kill ports)
shrimp-kill() {
    echo "🔴 Stopping all services..."
    brew services stop mongodb-community 2>/dev/null || true
    pkill -f "python api.py" || true
    pkill -f "python app.py" || true
    pkill -f "node" || true
    sleep 1
    echo "✅ All services stopped"
}

# Restart everything
shrimp-restart() {
    shrimp-kill
    sleep 2
    shrimp-start
}

# View API logs
shrimp-logs() {
    echo "📋 To view logs from running processes, check your terminal tabs"
    echo ""
    echo "For saved logs:"
    ls -lh $PROJECT_DIR/*.log 2>/dev/null || echo "No log files found"
}

# Send test sensor data
shrimp-test-iot() {
    echo "📤 Sending test sensor data to IoT Gateway..."
    curl -X POST http://localhost:5000/api/sensor/reading \
      -H "Content-Type: application/json" \
      -d '{
        "device_id": "esp32_pond_test",
        "tds_value": 1250.5,
        "conductivity": 2500,
        "temperature": 28.5,
        "battery": 92
      }' | jq .
}

# View latest sensor reading
shrimp-latest-reading() {
    echo "📖 Latest sensor reading:"
    curl -s http://localhost:5000/api/sensor/readings?limit=1 | jq .
}

# ═══════════════════════════════════════════════════
# Quick Reference
# ═══════════════════════════════════════════════════

# Show this help
shrimp-help() {
    echo "🦐 Smart Shrimp Farm - Available Commands"
    echo ""
    echo "🚀 Startup:"
    echo "  shrimp-start          Start all services"
    echo "  shrimp-iot            Start IoT Gateway only"
    echo "  shrimp-api            Start Prediction API only"
    echo "  shrimp-dashboard      Start Dashboard only"
    echo "  shrimp-landing        Start Landing Page only"
    echo ""
    echo "🗄️  Database:"
    echo "  shrimp-db-start       Start MongoDB"
    echo "  shrimp-db-stop        Stop MongoDB"
    echo "  shrimp-db-status      Check MongoDB status"
    echo "  shrimp-db-connect     Open MongoDB shell"
    echo "  shrimp-db-stats       View database statistics"
    echo "  shrimp-db-export      Export database backup"
    echo ""
    echo "📁 Navigation:"
    echo "  shrimp                Go to project root"
    echo "  shrimp-backend        Go to backend-v2"
    echo "  shrimp-iot-dir        Go to IoT Gateway directory"
    echo "  shrimp-dashboard-dir  Go to Dashboard directory"
    echo "  shrimp-landing-dir    Go to Landing Page directory"
    echo ""
    echo "📊 Status & Testing:"
    echo "  shrimp-status         Check all services status"
    echo "  shrimp-test           Test API endpoints"
    echo "  shrimp-test-iot       Send test sensor data"
    echo "  shrimp-latest-reading View latest sensor reading"
    echo ""
    echo "🛠️  Utilities:"
    echo "  shrimp-install        Install all dependencies"
    echo "  shrimp-kill           Stop all services"
    echo "  shrimp-restart        Restart all services"
    echo "  shrimp-env            Activate virtual environment"
    echo ""
    echo "📖 Access Points:"
    echo "  Browser: http://localhost:5173  (Dashboard)"
    echo "  Browser: http://localhost:3000  (Landing Page)"
    echo "  API:     http://localhost:5001  (Prediction API)"
    echo "  API:     http://localhost:5000  (IoT Gateway)"
    echo ""
}

# Print help on first load
echo "💡 Tip: Run 'shrimp-help' to see all available commands"
