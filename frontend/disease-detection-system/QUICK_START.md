# Quick Start Guide - Frontend Setup

## 🚀 5-Minute Setup

### Step 1: Install Dependencies
```bash
cd Frontend
npm install
```

**Wait for the installation to complete** (this may take 1-2 minutes)

### Step 2: Start Backend (if not running)
Open another terminal:
```bash
cd disease-detection
python main.py
```

Backend should start on: `http://localhost:8001`

### Step 3: Start Frontend
Back in the Frontend directory:
```bash
npm run dev
```

Frontend will start on: `http://localhost:5173`

### Step 4: Open Browser
Navigate to: **http://localhost:5173**

---

## 📋 What You'll See

### Main Dashboard Features

1. **Overview Tab** (Default)
   - Large disease risk score display with color coding
   - Current risk level (HIGH/MEDIUM/LOW)
   - Environmental metrics (DO, Temperature, pH, Salinity)
   - Latest feeding data
   - Recommended actions

2. **History Tab**
   - Risk score trend chart
   - High/Medium/Low risk distribution
   - Recent predictions table

3. **Analysis Tab**
   - Shrimp activity patterns
   - Behavior metrics visualization
   - Abnormal event tracking

4. **Metrics Tab**
   - Complete environmental data display

5. **Submit Data Tab**
   - Form to submit new prediction data
   - Fields for behavioral, feeding, and environmental metrics

---

## 🧪 Test the System

### Option 1: Auto-Submit Sample Data (Recommended)

1. Go to **Submit Data** tab
2. Click **Submit Prediction** button
3. Wait for response (should show success message)
4. Go back to **Overview** tab to see new risk score

### Option 2: Monitor Backend Events

Watch for background calculations in the backend logs.

---

## 🐛 Troubleshooting

### "Connection Error" on Frontend
❌ **Problem**: Backend is not running  
✅ **Solution**: Start backend with `python main.py` on port 8001

### "No data available" in Dashboard
❌ **Problem**: No predictions submitted yet  
✅ **Solution**: Go to "Submit Data" tab and submit prediction

### Charts not loading
❌ **Problem**: Recharts not rendering  
✅ **Solution**: Check browser console for errors, refreshpage

### API Errors
❌ **Problem**: CORS or connection issues  
✅ **Solution**: 
- Ensure backend is running
- Check backend logs for errors
- Verify URLs in `src/services/api.js`

---

## 📊 Understanding the Dashboard

### Risk Score Card
- **0-33%**: 🟢 LOW RISK (Green)
- **34-66%**: 🟡 MEDIUM RISK (Yellow)
- **67-100%**: 🔴 HIGH RISK (Red)

### Color Coding
- **Blue**: Activity metrics
- **Purple**: Standard deviation/variability
- **Orange**: Risk factors
- **Green**: Safe conditions
- **Red**: Warning/High risk

### Recommended Actions
- Updates based on risk level
- Specific to detected issues
- Actionable for farm operators

---

## 📱 Features Overview

| Feature | Tab | What It Shows |
|---------|-----|---------------|
| Current Risk | Overview | Real-time disease risk score |
| Recommendations | Overview | Specific actions to take |
| Environmental Data | Overview/Metrics | Water quality parameters |
| Risk Trends | History | How risk changes over time |
| Prediction Stats | History | Count of High/Medium/Low risks |
| Activity Patterns | Analysis | Shrimp behavior trends |
| Detailed Behavior | Analysis | Individual data points |
| Data Submission | Submit Data | Form to enter new readings |

---

## 🔄 Real-Time Updates

The frontend automatically:
- Checks system health every 30 seconds
- Updates data when you submit new information
- Refreshes when you switch ponds

---

## 🎨 UI Components

### Cards (Glass-Morphism Design)
- Semi-transparent white background
- Blur effect for depth
- Responsive to screen size
- Hover effects for interactivity

### Charts (via Recharts)
- Interactive tooltips (hover over data)
- Click legend items to toggle series
- Responsive to window resize
- Smooth animations

### Forms
- Real-time input validation
- Loading state indicators
- Success/Error notifications
- Default realistic values

---

## 📡 Network Requests

The frontend makes requests to these backend endpoints:

```
GET  /health                    (Check connection)
GET  /predictions               (Get all predictions)
GET  /predictions/{pond_id}     (Pond-specific predictions)
GET  /pond-status/{pond_id}     (Pond overview)
GET  /behavior/{pond_id}        (Behavior data)
POST /predict-risk              (Submit new prediction)
POST /behavior/live             (Submit behavior data)
POST /feeding/live              (Submit feeding data)
```

---

## 🛠️ Development Commands

```bash
# Start dev server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Check for linting issues
npm run lint
```

---

## 📝 Important Notes

1. **Pond IDs**: Frontend defaults to "pond-01" but can be changed in selector
2. **Timestamps**: Auto-populated with current time
3. **Data Persistence**: All predictions saved to MongoDB backend
4. **Real-time Calculations**: Backend automatically recalculates risk after data submission
5. **Tab Persistence**: Selected tab resets on page refresh

---

## 🎯 Next Steps

1. ✅ Install dependencies
2. ✅ Start both backend and frontend
3. ✅ Open http://localhost:5173 in browser
4. ✅ Submit sample data from the form
5. ✅ View results in dashboard
6. ✅ Try different ponds using the selector
7. ✅ Explore each tab to understand features

---

## 💡 Pro Tips

- **Switch Ponds**: Use dropdown at top to monitor different ponds
- **Full Screen Charts**: Charts respond to browser window size
- **Mobile Access**: Frontend works on tablets and phones
- **Multiple Windows**: Open multiple browser tabs to monitor multiple ponds
- **Real-time Monitoring**: Leave dashboard open for continuous monitoring

---

## 🆘 Get Help

Check these files for more information:
- `README.md` - Comprehensive documentation
- `IMPLEMENTATION.md` - Complete feature list
- `src/services/api.js` - All API calls
- `src/components/` - Component details

---

**Ready to go! Start with `npm install` then `npm run dev` 🚀**
