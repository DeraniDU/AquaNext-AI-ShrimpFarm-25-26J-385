'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

export default function WaterQualityMonitoring() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState('24hours');
  const [activeChartTab, setActiveChartTab] = useState('realtime');
  const [selectedParameter, setSelectedParameter] = useState('all');

  const heroImages = [
    '/hero/11.jpg',
    '/hero/10.jpg',
    '/hero/12.jpg',
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Real-time water quality data
  const currentParameters = [
    { name: 'pH', value: 8.2, status: 'OPTIMAL', range: '7.5-8.5', unit: '', color: 'bg-green-500', icon: '⚗️' },
    { name: 'Dissolved Oxygen', value: 6.8, status: 'GOOD', range: '≥5 mg/L', unit: 'mg/L', color: 'bg-blue-500', icon: '💨' },
    { name: 'Temperature', value: 29.5, status: 'OPTIMAL', range: '28-32°C', unit: '°C', color: 'bg-orange-500', icon: '🌡️' },
    { name: 'Salinity', value: 28, status: 'OPTIMAL', range: '26-32 ppt', unit: 'ppt', color: 'bg-cyan-500', icon: '🌊' },
    { name: 'Ammonia (NH3)', value: 0.08, status: 'SAFE', range: '<0.1 mg/L', unit: 'mg/L', color: 'bg-purple-500', icon: '🧪' },
    { name: 'Nitrite (NO2)', value: 0.15, status: 'SAFE', range: '<0.2 mg/L', unit: 'mg/L', color: 'bg-pink-500', icon: '🔬' },
  ];

  // 24-hour historical data
  const historicalData = [
    { time: '00:00', pH: 8.1, DO: 6.2, temp: 28.5, salinity: 28, ammonia: 0.09, nitrite: 0.14 },
    { time: '02:00', pH: 8.0, DO: 5.8, temp: 28.2, salinity: 28, ammonia: 0.10, nitrite: 0.15 },
    { time: '04:00', pH: 7.9, DO: 5.5, temp: 28.0, salinity: 28, ammonia: 0.11, nitrite: 0.16 },
    { time: '06:00', pH: 8.0, DO: 6.0, temp: 28.5, salinity: 28, ammonia: 0.10, nitrite: 0.15 },
    { time: '08:00', pH: 8.1, DO: 6.5, temp: 29.0, salinity: 28, ammonia: 0.09, nitrite: 0.14 },
    { time: '10:00', pH: 8.2, DO: 7.0, temp: 30.0, salinity: 29, ammonia: 0.08, nitrite: 0.13 },
    { time: '12:00', pH: 8.3, DO: 7.2, temp: 31.0, salinity: 29, ammonia: 0.07, nitrite: 0.12 },
    { time: '14:00', pH: 8.4, DO: 7.1, temp: 31.5, salinity: 29, ammonia: 0.08, nitrite: 0.13 },
    { time: '16:00', pH: 8.3, DO: 6.9, temp: 30.5, salinity: 28, ammonia: 0.09, nitrite: 0.14 },
    { time: '18:00', pH: 8.2, DO: 6.7, temp: 29.5, salinity: 28, ammonia: 0.09, nitrite: 0.15 },
    { time: '20:00', pH: 8.1, DO: 6.4, temp: 29.0, salinity: 28, ammonia: 0.10, nitrite: 0.16 },
    { time: '22:00', pH: 8.2, DO: 6.5, temp: 28.8, salinity: 28, ammonia: 0.09, nitrite: 0.15 },
  ];

  // Weekly trends
  const weeklyTrends = [
    { day: 'Mon', pH: 8.1, DO: 6.5, temp: 29.2, salinity: 28, wqi: 85 },
    { day: 'Tue', pH: 8.2, DO: 6.7, temp: 29.5, salinity: 28, wqi: 88 },
    { day: 'Wed', pH: 8.0, DO: 6.3, temp: 29.0, salinity: 27, wqi: 82 },
    { day: 'Thu', pH: 8.3, DO: 6.9, temp: 29.8, salinity: 29, wqi: 90 },
    { day: 'Fri', pH: 8.2, DO: 6.8, temp: 29.6, salinity: 28, wqi: 89 },
    { day: 'Sat', pH: 8.1, DO: 6.6, temp: 29.3, salinity: 28, wqi: 86 },
    { day: 'Sun', pH: 8.2, DO: 6.8, temp: 29.5, salinity: 28, wqi: 88 },
  ];

  // Prediction data (6, 12, 24 hours ahead)
  const predictionData = [
    { hours: 'Current', pH: 8.2, DO: 6.8, temp: 29.5, salinity: 28 },
    { hours: '+6h', pH: 8.1, DO: 6.5, temp: 29.0, salinity: 28 },
    { hours: '+12h', pH: 8.0, DO: 6.2, temp: 28.5, salinity: 28 },
    { hours: '+24h', pH: 8.1, DO: 6.4, temp: 29.2, salinity: 28 },
  ];

  // Parameter correlation data
  const correlationData = [
    { parameter: 'pH', pH: 1.0, DO: 0.12, temp: -0.50, salinity: -0.15 },
    { parameter: 'DO', pH: 0.12, DO: 1.0, temp: -0.08, salinity: -0.24 },
    { parameter: 'Temp', pH: -0.50, DO: -0.08, temp: 1.0, salinity: -0.02 },
    { parameter: 'Salinity', pH: -0.15, DO: -0.24, temp: -0.02, salinity: 1.0 },
  ];

  // Water Quality Index over time
  const wqiHistory = [
    { week: 'Week 1', wqi: 75, status: 'Good' },
    { week: 'Week 2', wqi: 82, status: 'Good' },
    { week: 'Week 3', wqi: 78, status: 'Good' },
    { week: 'Week 4', wqi: 88, status: 'Excellent' },
    { week: 'Week 5', wqi: 85, status: 'Good' },
    { week: 'Week 6', wqi: 90, status: 'Excellent' },
    { week: 'Week 7', wqi: 87, status: 'Good' },
    { week: 'Week 8', wqi: 92, status: 'Excellent' },
  ];

  // Sensor locations data
  const sensorData = [
    { sensor: 'Sensor 1', location: 'North', pH: 8.2, DO: 6.8, temp: 29.5, status: 'Active' },
    { sensor: 'Sensor 2', location: 'South', pH: 8.1, DO: 6.7, temp: 29.3, status: 'Active' },
    { sensor: 'Sensor 3', location: 'East', pH: 8.3, DO: 6.9, temp: 29.7, status: 'Active' },
    { sensor: 'Sensor 4', location: 'West', pH: 8.0, DO: 6.5, temp: 29.2, status: 'Active' },
    { sensor: 'Sensor 5', location: 'Center', pH: 8.2, DO: 6.8, temp: 29.5, status: 'Active' },
  ];

  // Alert history
  const alertHistory = [
    { time: '2 hours ago', type: 'Warning', message: 'DO levels approaching minimum threshold', severity: 'medium' },
    { time: '6 hours ago', type: 'Info', message: 'Temperature optimal for feeding', severity: 'low' },
    { time: '12 hours ago', type: 'Critical', message: 'pH spike detected - water treatment initiated', severity: 'high' },
    { time: '1 day ago', type: 'Info', message: 'All parameters within optimal range', severity: 'low' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative h-[450px] md:h-[650px] w-full overflow-hidden">
        {heroImages.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
            style={{ backgroundImage: `url('${image}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-blue-900/70 via-cyan-900/50 to-blue-900/70" />
            <div className="absolute inset-0 bg-[url('/water-pattern.svg')] opacity-10" />
          </div>
        ))}

        <div className="relative z-10 h-full flex items-center justify-center px-6">
          <div className="max-w-4xl text-center text-white">
            <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight drop-shadow-lg">
              AI-Powered Water Quality Monitoring
            </h1>
            <p className="text-lg md:text-2xl mb-8 max-w-3xl mx-auto leading-relaxed drop-shadow-md">
              Real-time monitoring and predictive analytics for optimal shrimp pond water conditions
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <button className="px-8 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg shadow-lg transition-all transform hover:scale-105">
                View Live Data
              </button>
              <button className="px-8 py-3 bg-white hover:bg-gray-100 text-cyan-600 font-semibold rounded-lg shadow-lg transition-all transform hover:scale-105">
                System Overview
              </button>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
          {heroImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition-all ${index === currentSlide ? 'bg-white w-8' : 'bg-white/50 hover:bg-white/75'
                }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-8 bg-gradient-to-r from-cyan-600 to-blue-700">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            <div>
              <div className="text-4xl font-bold mb-2">92</div>
              <div className="text-sm text-cyan-100">Water Quality Index</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">5</div>
              <div className="text-sm text-cyan-100">Active Sensors</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">15min</div>
              <div className="text-sm text-cyan-100">Update Frequency</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">24/7</div>
              <div className="text-sm text-cyan-100">Live Monitoring</div>
            </div>
          </div>
        </div>
      </section>

      {/* Real-Time Dashboard */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
              Real-Time Water Quality Dashboard
            </h2>
            <p className="text-lg text-gray-600">
              Live monitoring of all critical water parameters
            </p>
          </div>

          {/* Current Parameters Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {currentParameters.map((param, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">{param.icon}</div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">{param.name}</h3>
                      <p className="text-xs text-gray-500">Optimal: {param.range}</p>
                    </div>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-bold ${param.status === 'OPTIMAL' || param.status === 'GOOD'
                      ? 'bg-green-100 text-green-700'
                      : param.status === 'SAFE'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-yellow-100 text-yellow-700'
                      }`}
                  >
                    {param.status}
                  </div>
                </div>

                <div className="flex items-end gap-2 mb-4">
                  <div className="text-4xl font-bold text-gray-900">{param.value}</div>
                  <div className="text-xl text-gray-600 mb-1">{param.unit}</div>
                </div>

                <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`absolute left-0 top-0 h-full ${param.color} rounded-full transition-all duration-500`}
                    style={{ width: '85%' }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Live System Status */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">System Status</h3>
              <span className="px-4 py-2 bg-green-500 text-white rounded-full text-sm font-bold flex items-center gap-2">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                ALL SYSTEMS OPERATIONAL
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-800 rounded-xl p-6">
                <h4 className="text-cyan-400 font-bold mb-4">AI Prediction Confidence</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-white text-sm mb-1">
                      <span>pH Prediction</span>
                      <span>96%</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500 rounded-full" style={{ width: '96%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-white text-sm mb-1">
                      <span>DO Prediction</span>
                      <span>94%</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: '94%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-white text-sm mb-1">
                      <span>Temperature</span>
                      <span>98%</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full" style={{ width: '98%' }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-6">
                <h4 className="text-cyan-400 font-bold mb-4">Sensor Network Health</h4>
                <div className="grid grid-cols-5 gap-2">
                  {sensorData.map((sensor, i) => (
                    <div
                      key={i}
                      className="aspect-square bg-green-500 rounded-lg flex items-center justify-center hover:bg-green-400 transition-colors cursor-pointer"
                      title={`${sensor.sensor} - ${sensor.location}`}
                    >
                      <div className="text-white text-xs font-bold">{i + 1}</div>
                    </div>
                  ))}
                </div>
                <p className="text-gray-400 text-xs mt-3">All 5 sensors online and transmitting</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Historical Data Charts */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
              Historical Data & Analytics
            </h2>
            <p className="text-lg text-gray-600">
              Track trends and patterns in water quality over time
            </p>
          </div>

          <div className="flex justify-center gap-4 mb-8 flex-wrap">
            {['realtime', 'weekly', 'prediction', 'correlation'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveChartTab(tab)}
                className={`px-8 py-3 rounded-lg font-semibold transition-all ${activeChartTab === tab
                  ? 'bg-cyan-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
              >
                {tab === 'realtime' && '24-Hour Trends'}
                {tab === 'weekly' && 'Weekly Overview'}
                {tab === 'prediction' && 'AI Predictions'}
                {tab === 'correlation' && 'Parameter Correlation'}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            {activeChartTab === 'realtime' && (
              <>
                <h3 className="text-2xl font-bold mb-6">24-Hour Parameter Trends</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="pH" stroke="#8b5cf6" strokeWidth={2} name="pH" />
                    <Line type="monotone" dataKey="DO" stroke="#3b82f6" strokeWidth={2} name="DO (mg/L)" />
                    <Line type="monotone" dataKey="temp" stroke="#f97316" strokeWidth={2} name="Temperature (°C)" />
                  </LineChart>
                </ResponsiveContainer>
                <div className="mt-6 p-4 bg-blue-50 rounded-xl">
                  <p className="text-sm text-gray-700">
                    <strong>Analysis:</strong> All parameters maintained within optimal ranges over the past 24 hours.
                    Minor DO fluctuation detected during early morning hours (typical pattern).
                  </p>
                </div>
              </>
            )}

            {activeChartTab === 'weekly' && (
              <>
                <h3 className="text-2xl font-bold mb-6">Weekly Water Quality Index</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={wqiHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="wqi"
                      stroke="#06b6d4"
                      fill="#06b6d4"
                      fillOpacity={0.6}
                      name="Water Quality Index"
                    />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="grid md:grid-cols-3 gap-6 mt-8">
                  <div className="text-center p-4 bg-green-50 rounded-xl">
                    <div className="text-3xl font-bold text-green-600">92</div>
                    <div className="text-sm text-gray-600 mt-2">Current WQI</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-xl">
                    <div className="text-3xl font-bold text-blue-600">85</div>
                    <div className="text-sm text-gray-600 mt-2">Average WQI</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-xl">
                    <div className="text-3xl font-bold text-purple-600">+8%</div>
                    <div className="text-sm text-gray-600 mt-2">Improvement</div>
                  </div>
                </div>
              </>
            )}

            {activeChartTab === 'prediction' && (
              <>
                <h3 className="text-2xl font-bold mb-6">AI-Powered Predictions (Next 24 Hours)</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={predictionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hours" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="pH" fill="#8b5cf6" name="pH" />
                    <Bar dataKey="DO" fill="#3b82f6" name="DO (mg/L)" />
                    <Bar dataKey="temp" fill="#f97316" name="Temperature (°C)" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-6 p-4 bg-purple-50 rounded-xl border border-purple-200">
                  <h4 className="font-bold text-purple-900 mb-2">🤖 AI Recommendation</h4>
                  <p className="text-sm text-gray-700">
                    Models predict slight temperature drop in 12 hours. Consider activating heaters if temperature
                    falls below 28°C. DO levels expected to remain stable with current aeration settings.
                  </p>
                </div>
              </>
            )}

            {activeChartTab === 'correlation' && (
              <>
                <h3 className="text-2xl font-bold mb-6">Parameter Correlation Analysis</h3>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-bold mb-4 text-gray-700">Correlation Matrix</h4>
                    <div className="bg-gray-50 rounded-xl p-4">
                      {correlationData.map((row, i) => (
                        <div key={i} className="flex gap-2 mb-2">
                          <div className="w-24 font-semibold text-sm text-gray-700">{row.parameter}</div>
                          <div
                            className={`flex-1 h-8 rounded flex items-center justify-center text-white text-sm font-bold ${Math.abs(row.pH) > 0.3 ? 'bg-red-500' : 'bg-green-500'
                              }`}
                          >
                            {row.pH.toFixed(2)}
                          </div>
                          <div
                            className={`flex-1 h-8 rounded flex items-center justify-center text-white text-sm font-bold ${Math.abs(row.DO) > 0.3 ? 'bg-red-500' : 'bg-green-500'
                              }`}
                          >
                            {row.DO.toFixed(2)}
                          </div>
                          <div
                            className={`flex-1 h-8 rounded flex items-center justify-center text-white text-sm font-bold ${Math.abs(row.temp) > 0.3 ? 'bg-red-500' : 'bg-green-500'
                              }`}
                          >
                            {row.temp.toFixed(2)}
                          </div>
                          <div
                            className={`flex-1 h-8 rounded flex items-center justify-center text-white text-sm font-bold ${Math.abs(row.salinity) > 0.3 ? 'bg-red-500' : 'bg-green-500'
                              }`}
                          >
                            {row.salinity.toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold mb-4 text-gray-700">Key Findings</h4>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-2 p-3 bg-red-50 rounded-lg">
                        <span className="text-red-600">⚠️</span>
                        <div>
                          <strong className="text-red-900">Strong Negative:</strong>
                          <p className="text-sm text-gray-700">
                            Temperature & pH (-0.50): Higher temps lead to lower pH
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg">
                        <span className="text-yellow-600">⚡</span>
                        <div>
                          <strong className="text-yellow-900">Moderate Negative:</strong>
                          <p className="text-sm text-gray-700">
                            DO & Salinity (-0.24): Higher salinity reduces oxygen solubility
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
                        <span className="text-green-600">✓</span>
                        <div>
                          <strong className="text-green-900">Weak Correlation:</strong>
                          <p className="text-sm text-gray-700">
                            pH & DO (+0.12): Slight positive relationship observed
                          </p>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Sensor Network */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
              IoT Sensor Network
            </h2>
            <p className="text-lg text-gray-600">
              5 wireless sensors deployed across the pond for comprehensive monitoring
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
            {sensorData.map((sensor, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800">{sensor.sensor}</h3>
                  <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                </div>
                <div className="text-sm text-gray-600 mb-4">
                  <div className="flex justify-between mb-1">
                    <span>Location:</span>
                    <span className="font-semibold">{sensor.location}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>pH:</span>
                    <span className="font-semibold">{sensor.pH}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>DO:</span>
                    <span className="font-semibold">{sensor.DO} mg/L</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Temp:</span>
                    <span className="font-semibold">{sensor.temp}°C</span>
                  </div>
                </div>
                <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold text-center">
                  {sensor.status}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 bg-white rounded-2xl p-8 shadow-lg">
            <h3 className="text-2xl font-bold mb-6 text-blue-600">
              Sensor Specifications
            </h3>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-bold text-cyan-700 mb-3">Accuracy</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex justify-between">
                    <span>Temperature:</span>
                    <span className="font-semibold">±0.1°C</span>
                  </li>
                  <li className="flex justify-between">
                    <span>pH:</span>
                    <span className="font-semibold">±0.05</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Dissolved Oxygen:</span>
                    <span className="font-semibold">±0.2 mg/L</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Salinity:</span>
                    <span className="font-semibold">±0.5 ppt</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-cyan-700 mb-3">Features</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    Measurement every 15 minutes
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    Solar-powered with 6-month battery
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    Wireless range up to 500m
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    IP68 waterproof rating
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Alert System */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
              Smart Alert System
            </h2>
            <p className="text-lg text-gray-600">
              Proactive notifications for immediate action
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="text-2xl">🔔</span>
                Recent Alerts
              </h3>
              <div className="space-y-4">
                {alertHistory.map((alert, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-lg border-l-4 ${alert.severity === 'high'
                      ? 'bg-red-50 border-red-500'
                      : alert.severity === 'medium'
                        ? 'bg-yellow-50 border-yellow-500'
                        : 'bg-blue-50 border-blue-500'
                      }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${alert.severity === 'high'
                          ? 'bg-red-200 text-red-800'
                          : alert.severity === 'medium'
                            ? 'bg-yellow-200 text-yellow-800'
                            : 'bg-blue-200 text-blue-800'
                          }`}
                      >
                        {alert.type}
                      </span>
                      <span className="text-xs text-gray-500">{alert.time}</span>
                    </div>
                    <p className="text-sm text-gray-700">{alert.message}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-cyan-600 to-blue-700 rounded-2xl p-8 shadow-lg text-white">
              <h3 className="text-xl font-bold mb-6">Alert Configuration</h3>
              <div className="space-y-6">
                <div className="bg-white/10 rounded-lg p-4">
                  <h4 className="font-bold mb-3">Critical Thresholds</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex justify-between">
                      <span>pH Outside Range:</span>
                      <span className="font-semibold">7.5-8.5</span>
                    </li>
                    <li className="flex justify-between">
                      <span>DO Below:</span>
                      <span className="font-semibold">5 mg/L</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Temperature Outside:</span>
                      <span className="font-semibold">28-32°C</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Ammonia Above:</span>
                      <span className="font-semibold">0.1 mg/L</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-white/10 rounded-lg p-4">
                  <h4 className="font-bold mb-3">Notification Methods</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <span className="text-green-300">✓</span>
                      Mobile Push Notifications
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-300">✓</span>
                      SMS Text Alerts
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-300">✓</span>
                      Email Summaries
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-300">✓</span>
                      Dashboard Alerts
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Machine Learning Models */}
      <section className="py-20 px-6 bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
              AI Prediction Models
            </h2>
            <p className="text-lg text-gray-600">
              Advanced machine learning for accurate water quality forecasting
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all">
              <div className="text-5xl mb-4">🧠</div>
              <h3 className="text-xl font-bold mb-3 text-purple-700">
                Artificial Neural Network (ANN)
              </h3>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Temperature:</span>
                  <span className="font-bold text-green-600">R² = 0.7178</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">pH:</span>
                  <span className="font-bold text-green-600">R² = 0.6506</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Salinity:</span>
                  <span className="font-bold text-green-600">R² = 0.5997</span>
                </div>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg text-sm text-gray-700">
                <strong>Best for:</strong> Complex non-linear relationships and multi-parameter predictions
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all">
              <div className="text-5xl mb-4">⚡</div>
              <h3 className="text-xl font-bold mb-3 text-blue-700">
                Support Vector Machine (SVM)
              </h3>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Temperature:</span>
                  <span className="font-bold text-green-600">R² = 0.7479</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Salinity:</span>
                  <span className="font-bold text-green-600">R² = 0.4909</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">pH:</span>
                  <span className="font-bold text-yellow-600">R² = 0.3476</span>
                </div>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg text-sm text-gray-700">
                <strong>Best for:</strong> Temperature predictions and handling high-dimensional data
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all">
              <div className="text-5xl mb-4">📊</div>
              <h3 className="text-xl font-bold mb-3 text-cyan-700">
                Multiple Linear Regression (MLR)
              </h3>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Temperature:</span>
                  <span className="font-bold text-green-600">R² = 0.5602</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">pH:</span>
                  <span className="font-bold text-yellow-600">R² = 0.3172</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Salinity:</span>
                  <span className="font-bold text-yellow-600">R² = 0.1893</span>
                </div>
              </div>
              <div className="p-3 bg-cyan-50 rounded-lg text-sm text-gray-700">
                <strong>Best for:</strong> Baseline predictions and interpretable linear relationships
              </div>
            </div>
          </div>

          <div className="mt-12 bg-white rounded-2xl p-8 shadow-lg">
            <h3 className="text-2xl font-bold mb-6 text-gray-900">Model Performance Summary</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white">
                    <th className="p-4 text-left font-bold text-base">Model</th>
                    <th className="p-4 text-center font-bold text-base">MAE</th>
                    <th className="p-4 text-center font-bold text-base">RMSE</th>
                    <th className="p-4 text-center font-bold text-base">R²</th>
                    <th className="p-4 text-center font-bold text-base">Best Use Case</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b-2 border-gray-200 hover:bg-purple-50 transition-colors">
                    <td className="p-4 font-bold text-gray-900 text-base">ANN (Temperature)</td>
                    <td className="p-4 text-center text-gray-800 font-semibold text-base">0.4023</td>
                    <td className="p-4 text-center text-gray-800 font-semibold text-base">0.5336</td>
                    <td className="p-4 text-center">
                      <span className="px-3 py-1 bg-green-100 text-green-800 font-bold rounded-full text-base">0.7178</span>
                    </td>
                    <td className="p-4 text-center text-gray-800 font-medium text-base">Overall best accuracy</td>
                  </tr>
                  <tr className="border-b-2 border-gray-200 hover:bg-blue-50 transition-colors">
                    <td className="p-4 font-bold text-gray-900 text-base">SVM (Temperature)</td>
                    <td className="p-4 text-center">
                      <span className="px-3 py-1 bg-green-100 text-green-800 font-bold rounded-full text-base">0.3645</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-3 py-1 bg-green-100 text-green-800 font-bold rounded-full text-base">0.4823</span>
                    </td>
                    <td className="p-4 text-center text-gray-800 font-semibold text-base">0.7479</td>
                    <td className="p-4 text-center text-gray-800 font-medium text-base">Lowest error rates</td>
                  </tr>
                  <tr className="hover:bg-cyan-50 transition-colors">
                    <td className="p-4 font-bold text-gray-900 text-base">MLR (Temperature)</td>
                    <td className="p-4 text-center text-gray-800 font-semibold text-base">0.4953</td>
                    <td className="p-4 text-center text-gray-800 font-semibold text-base">0.6370</td>
                    <td className="p-4 text-center text-gray-800 font-semibold text-base">0.5602</td>
                    <td className="p-4 text-center text-gray-800 font-medium text-base">Fast & interpretable</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
              <p className="text-base text-gray-800 font-medium">
                <strong className="text-blue-800">Note:</strong> Lower MAE and RMSE values indicate better accuracy. Higher R² values (closer to 1.0) indicate better model fit.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
              System Benefits
            </h2>
            <p className="text-lg text-gray-600">
              Transform your shrimp farming with intelligent water quality management
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: 'Early Disease Prevention',
                desc: 'Detect water quality issues before they cause disease outbreaks, reducing mortality by up to 40%',
                icon: '🛡️',
                color: 'bg-green-50 border-green-200',
              },
              {
                title: 'Reduced Labor Costs',
                desc: 'Eliminate manual water testing. Automated monitoring saves 20+ hours per week',
                icon: '⏱️',
                color: 'bg-blue-50 border-blue-200',
              },
              {
                title: 'Improved FCR',
                desc: 'Optimal water conditions improve feed conversion ratio by 15-20%',
                icon: '📈',
                color: 'bg-purple-50 border-purple-200',
              },
              {
                title: 'Better Survival Rates',
                desc: 'Maintain ideal conditions for 85%+ survival rates throughout growth cycle',
                icon: '🦐',
                color: 'bg-cyan-50 border-cyan-200',
              },
              {
                title: 'Regulatory Compliance',
                desc: 'Meet NAQDA standards with documented water quality records',
                icon: '✅',
                color: 'bg-yellow-50 border-yellow-200',
              },
              {
                title: '24/7 Remote Monitoring',
                desc: 'Access real-time data from anywhere via mobile app or web dashboard',
                icon: '📱',
                color: 'bg-pink-50 border-pink-200',
              },
            ].map((benefit, i) => (
              <div
                key={i}
                className={`${benefit.color} border-2 rounded-xl p-6 hover:shadow-lg transition-all transform hover:-translate-y-1`}
              >
                <div className="text-4xl mb-4">{benefit.icon}</div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">{benefit.title}</h3>
                <p className="text-gray-700 leading-relaxed">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-cyan-600 to-blue-700">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Optimize Your Water Quality?
          </h2>
          <p className="text-xl mb-10 text-cyan-100">
            Join Sri Lankan farmers using AI-powered water quality monitoring for better yields and lower costs
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <button className="px-10 py-4 bg-white text-cyan-600 font-bold rounded-lg shadow-lg hover:bg-gray-100 transition-all transform hover:scale-105">
              Request Demo
            </button>
            <button className="px-10 py-4 border-2 border-white text-white font-bold rounded-lg hover:bg-white/10 transition-all">
              Contact Us
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}