# Disease Detection Frontend

A modern, responsive React frontend for the disease detection system that monitors shrimp pond health through real-time behavioral analysis, environmental metrics, and predictive modeling.

## Features

### 🎯 Core Features

- **Disease Risk Score Dashboard**: Real-time risk assessment with HIGH/MEDIUM/LOW indicators
- **Prediction History**: Historical tracking of all predictions with trend analysis
- **Behavior Analysis**: Shrimp behavioral pattern monitoring with activity indices
- **Environmental Metrics**: Real-time monitoring of water quality parameters (DO, pH, Temperature, Salinity)
- **Multi-Pond Support**: Monitor multiple ponds with individual dashboards
- **Data Submission**: Submit real-time sensor data to trigger predictions

### 📊 Visualizations

- **Risk Score Trends**: Line and area charts showing risk evolution
- **Behavior Metrics**: Activity patterns and abnormality detection
- **Environmental Monitoring**: Real-time metrics display with historical data
- **Statistical Analysis**: Summary statistics and risk distribution

### 🎨 UI/UX Features

- Modern gradient design with glass-morphism effects
- Fully responsive layout (mobile, tablet, desktop)
- Intuitive navigation with tabbed interface
- Real-time data updates
- Color-coded risk levels for quick identification
- Dark theme optimized for 24/7 monitoring

## Tech Stack

- **React 18**: UI framework
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **Recharts**: Interactive charts and visualizations
- **Lucide React**: Modern icon library
- **Axios**: HTTP client for API communication

## Installation & Setup

### Prerequisites

- Node.js 16+
- npm or yarn
- Backend running on `http://localhost:8001`

### Installation

```bash
cd Frontend
npm install
```

### Development

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Production Build

```bash
npm run build
npm run preview
```

## Project Structure

```
Frontend/
├── src/
│   ├── components/
│   │   ├── cards/
│   │   │   ├── RiskScoreCard.jsx      # Disease risk display
│   │   │   ├── PredictionHistory.jsx  # Historical data
│   │   │   ├── BehaviorAnalysis.jsx   # Behavior metrics
│   │   │   └── EnvironmentalMetrics.jsx # Water quality
│   │   ├── forms/
│   │   │   └── PredictionForm.jsx     # Data submission
│   │   ├── Dashboard.jsx              # Main dashboard
│   │   └── PondSelector.jsx           # Pond selection
│   ├── hooks/
│   │   └── useApi.js                  # API data fetching
│   ├── services/
│   │   └── api.js                     # API client
│   ├── App.jsx                        # Main app
│   ├── main.jsx                       # Entry point
│   └── styles.css                     # Global styles
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

## API Integration

The frontend communicates with the backend API endpoints:

### Predictions
- `GET /predictions` - Get all predictions
- `GET /predictions/{pond_id}` - Get pond-specific predictions
- `POST /predict-risk` - Submit prediction request

### Behavior
- `GET /behavior` - Get all behavior data
- `GET /behavior/{pond_id}` - Get pond behavior data
- `POST /behavior/live` - Submit behavior data

### Feeding
- `POST /feeding/live` - Submit feeding data

### Pond Status
- `GET /pond-status/{pond_id}` - Get complete pond status

### Health
- `GET /health` - Check backend availability

## Features Implemented

✅ Real-time disease risk scoring  
✅ Risk probability distributions  
✅ Behavioral analysis with trend charts  
✅ Environmental metrics monitoring  
✅ Prediction history with statistics  
✅ Multi-pond support  
✅ Data submission forms  
✅ Responsive design  
✅ Error handling and loading states  
✅ System health indicator  

## Dashboard Tabs

### Overview
- Current risk score and status
- Latest environmental metrics
- Recent feeding data
- Risk recommendations

### History
- Risk score trends over time
- Risk distribution statistics
- Historical predictions table

### Analysis
- Shrimp activity patterns
- Behavior metrics visualization
- Abnormality detection
- Detailed behavior data

### Metrics
- Current environmental parameters
- Water quality status
- All sensor readings

### Submit Data
- Form to submit new prediction data
- Behavioral metrics input
- Environmental data input
- Feeding information

## Customization

### Changing API Endpoint

Edit `src/services/api.js`:

```javascript
const API_BASE_URL = 'http://your-api-url:port';
```

### Theming

Edit `tailwind.config.js` to customize colors and styles.

## Troubleshooting

### Backend Connection Error
- Ensure backend is running: `python main.py`
- Check backend is on `http://localhost:8001`
- Verify CORS settings if deploying

### No Data Displayed
- Submit prediction data using the "Submit Data" tab
- Wait for background calculations to complete
- Check browser console for API errors

### Styling Issues
- Clear Tailwind cache: `rm -rf .next` or rebuild
- Rebuild CSS: `npm run dev`

## License

Copyright © 2026 Disease Detection System

## Support

For issues or questions, check the backend repository or contact the development team.
