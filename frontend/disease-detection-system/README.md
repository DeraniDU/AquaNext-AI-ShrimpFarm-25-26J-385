# Disease Detection System - Frontend

A modern React + TypeScript web application for shrimp farm disease detection and monitoring. This frontend communicates with the backend API to provide real-time risk prediction, behavior tracking, and pond status monitoring.

## Features

- 🏥 **Risk Prediction**: Predict disease risk based on environmental and behavioral parameters
- 📊 **Dashboard**: Overview of predictions, risk distribution, and system status
- 🦐 **Behavior Tracking**: Record and monitor shrimp behavior patterns
- 🏞️ **Pond Status**: Real-time status monitoring for individual ponds
- 📈 **Prediction History**: View historical predictions with charts and analytics
- 💚 **Health Monitoring**: Check backend API connectivity status

## Project Structure

```
frontend/disease-detection-system/
├── src/
│   ├── components/
│   │   ├── HealthStatus.tsx       # Health check indicator
│   │   ├── Navigation.tsx          # Navigation sidebar
│   │   ├── Navigation.css
│   │   └── HealthStatus.css
│   ├── pages/
│   │   ├── Dashboard.tsx           # Overview dashboard
│   │   ├── RiskPredictionPage.tsx  # Risk prediction form
│   │   ├── BehaviorTrackingPage.tsx# Behavior data recording
│   │   ├── PondStatusPage.tsx      # Individual pond monitoring
│   │   ├── PredictionsHistoryPage.tsx# Historical data & analytics
│   │   └── Pages.css               # Page styles
│   ├── api.ts                      # API client & types
│   ├── App.tsx                     # Main App component
│   ├── App.css                     # App styles
│   ├── index.css                   # Global styles
│   └── main.tsx                    # React entry point
├── index.html                      # HTML template
├── package.json                    # Dependencies & scripts
├── tsconfig.json                   # TypeScript config
├── vite.config.ts                  # Vite configuration
└── README.md                       # This file
```

## Setup & Installation

### Prerequisites

- Node.js 18+ LTS
- npm or yarn package manager

### Installation

1. **Clone and navigate to the project**:
   ```bash
   cd frontend/disease-detection-system
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment** (optional):
   ```bash
   # Create a .env file if you want custom settings
   # VITE_API_URL=http://localhost:8001
   ```

## Development

### Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

**Features**:
- Hot module reloading (instant updates on code changes)
- API proxy to `http://localhost:8001`
- Development mode with source maps

### Build for Production

```bash
npm run build
```

Creates an optimized production build in the `dist/` folder.

### Preview Production Build

```bash
npm run preview
```

## API Integration

The frontend communicates with the disease-detection backend API at `http://localhost:8001`.

### Available Endpoints

#### Health Check
- `GET /health` - Backend status

#### Risk Prediction
- `POST /predict-risk` - Predict disease risk
- `GET /predictions` - Get all recent predictions (limit: 50)
- `GET /predictions/{pond_id}` - Get predictions for a specific pond

#### Behavior Tracking
- `POST /behavior/live` - Record shrimp behavior data
- `GET /behavior/{pond_id}` - Get behavior data for a pond
- `GET /behavior` - Get behavior data for all ponds

#### Pond Management
- `GET /pond-status/{pond_id}` - Get comprehensive pond status
- `POST /recalculate-risk/{pond_id}` - Recalculate risk for a pond

## Component Guide

### HealthStatus Component
Displays real-time connection status to the backend API
- Auto-refreshes every 30 seconds
- Shows service name and environment

### Navigation Component
Main navigation sidebar with these sections:
- Dashboard
- Risk Prediction
- Behavior Tracking
- Pond Status
- Prediction History

### Dashboard Page
Overview with:
- Summary stats (total predictions, high/low risk counts)
- Risk distribution chart
- System information
- Recent predictions table

### Risk Prediction Page
Two-column layout:
- **Left**: Input form for all parameters
  - Behavioral features (activity, drop ratio, abnormal rate)
  - Feeding data (amount, response)
  - Environmental data (DO, temperature, pH, salinity)
  - Metadata (pond ID, timestamp)
- **Right**: Prediction results with risk level and confidence

### Behavior Tracking Page
Record shrimp behavior data:
- Pond ID selection
- Activity index and statistics
- Drop ratio and abnormal count
- Timestamp tracking
- Guidelines for activity interpretation

### Pond Status Page
Real-time pond monitoring:
- Select pond by ID
- View latest readings (behavior, feeding, environment)
- Latest prediction with risk level
- Recent behavior point history
- Pond summary statistics

### Predictions History Page
Analytics and historical data:
- Summary statistics
- Filter by individual ponds
- Risk distribution pie chart
- Confidence trend line chart
- Paginated predictions table (50 shown)

## Styling

The application uses:
- **CSS Variables** for theming (colors, spacing)
- **Gradient Backgrounds** for modern look
- **Glassmorphism** effects with transparent cards
- **Responsive Design** for mobile compatibility
- **Dark Theme** optimized for farm monitoring environment

### Color Palette

```css
--primary: #3b82f6        /* Blue */
--success: #10b981        /* Green */
--warning: #f59e0b        /* Amber */
--danger: #ef4444         /* Red */
```

## API Client (`api.ts`)

Type-safe API client with:
- **Axios** for HTTP requests
- **TypeScript interfaces** for all data types
- **Error handling** with descriptive messages
- **Automatic base URL configuration**

### Using the API

```typescript
import { predictRisk, getPondStatus, pushBehaviorData } from './api'

// Predict risk
const prediction = await predictRisk({
  activity_mean: 0.18,
  activity_std: 0.02,
  // ... other parameters
  pond_id: 'pond-01'
})

// Get pond status
const status = await getPondStatus('pond-01')

// Record behavior
const result = await pushBehaviorData({
  pond_id: 'pond-01',
  timestamp: new Date().toISOString(),
  activity_index: 0.21
})
```

## Troubleshooting

### Backend Connection Issues

1. **Check if backend is running**:
   ```bash
   curl http://localhost:8001/health
   ```

2. **Verify API URL**: Edit `vite.config.ts` and check the proxy target

3. **CORS Issues**: Backend should be configured to accept requests from frontend origin

### Development Issues

- **Port 5173 already in use**: Change port in `vite.config.ts`
- **Module not found**: Run `npm install` to ensure all dependencies

## Building for Deployment

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Test the build locally**:
   ```bash
   npm run preview
   ```

3. **Deploy the `dist/` folder** to your hosting service

### Environment Variables for Production

Create `.env.production` with:
```
VITE_API_URL=https://your-api-domain.com
```

## Performance Optimization

- Code splitting with React.lazy (potential future improvement)
- Memoized components to prevent unnecessary re-renders
- Efficient data fetching with error handling
- Optimized charts with Recharts

## Browser Support

- Chrome/Chromium (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

When adding new features:
1. Create reusable components in `src/components/`
2. Create new pages in `src/pages/`
3. Update API types in `src/api.ts`
4. Add consistent styling following the existing patterns

## Testing

For production deployments:
1. Test all API endpoints before deployment
2. Verify database connectivity
3. Test on target devices (farm monitoring tablets/screens)
4. Validate all forms and input handling

## License

Part of AquaNext-AI-ShrimpFarm project

## Support

For issues or questions about the disease detection API, refer to:
- Backend documentation: `../../../disease-detection/README.md`
- API reference: `../../../disease-detection/VERIFICATION_COMPLETE.md`
