const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from this directory
app.use(express.static(path.join(__dirname)));

// In-memory storage for history
const history = [];
const MAX_HISTORY = 1000;

// Generate mock sensor data
function generateMockSensorData() {
  return {
    ts: Math.floor(Date.now() / 1000),
    sensors: {
      'DO(mg/L)': parseFloat((4 + Math.random() * 4).toFixed(2)),
      'pH': parseFloat((7.5 + Math.random() * 1).toFixed(2)),
      'Temp': parseFloat((25 + Math.random() * 7).toFixed(1)),
      'Ammonia (mg L-1 )': parseFloat((Math.random() * 0.5).toFixed(3)),
      'Nitrite (mg L-1 )': parseFloat((Math.random() * 0.1).toFixed(3)),
      'Turbidity (cm)': parseFloat((20 + Math.random() * 30).toFixed(0)),
    },
    rf: {
      'DO(mg/L)': parseFloat((4 + Math.random() * 4).toFixed(2)),
      'pH': parseFloat((7.5 + Math.random() * 1).toFixed(2)),
      'Ammonia (mg L-1 )': parseFloat((Math.random() * 0.5).toFixed(3)),
    },
    svm: {
      class: Math.floor(Math.random() * 3),
      label: ['Good', 'Warning', 'Dangerous'][Math.floor(Math.random() * 3)],
      probabilities: [0.7, 0.2, 0.1]
    }
  };
}

// API endpoint: Get history
app.get('/dashboard/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const recent = history.slice(-limit).reverse(); // Newest first
  res.json(recent);
});

// API endpoint: Download history as CSV
app.get('/dashboard/history.csv', (req, res) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="history.csv"');
  
  const headers = ['timestamp', 'DO(mg/L)', 'pH', 'Temp', 'Ammonia', 'Turbidity', 'Quality'];
  res.write(headers.join(',') + '\n');
  
  history.slice().reverse().forEach(entry => {
    const row = [
      new Date(entry.ts * 1000).toISOString(),
      entry.sensors?.['DO(mg/L)'] || '',
      entry.sensors?.pH || '',
      entry.sensors?.Temp || '',
      entry.sensors?.['Ammonia (mg L-1 )'] || '',
      entry.sensors?.['Turbidity (cm)'] || '',
      entry.svm?.label || ''
    ];
    res.write(row.join(',') + '\n');
  });
  
  res.end();
});

// Initialize with some mock data
function initializeMockData() {
  for (let i = 0; i < 10; i++) {
    const data = generateMockSensorData();
    data.ts = data.ts - (10 - i) * 60; // Spread over 10 minutes
    history.push(data);
  }
}

// Start the server
initializeMockData();

app.listen(PORT, () => {
  console.log('');
  console.log('========================================');
  console.log('  Shrimp Pond Monitor Dashboard');
  console.log('========================================');
  console.log('');
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/index.html`);
  console.log('');
  console.log('⚠️  Note: WebSocket endpoints are not available in this simple server.');
  console.log('   The dashboard will work but real-time updates via WebSocket will not function.');
  console.log('   Use the Python FastAPI server for full WebSocket support.');
  console.log('');
  console.log('Press Ctrl+C to stop the server');
  console.log('');
});



