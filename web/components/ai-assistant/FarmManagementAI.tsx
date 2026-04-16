'use client';

import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

export default function FarmManagementAI() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeChartTab, setActiveChartTab] = useState('harvest');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const heroImages = ['/hero/13.jpg', '/hero/22.jpg', '/hero/15.jpg'];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Growth & Harvest Prediction Data
  const harvestData = [
    { week: 'Week 8', weight: 12.0, predictedWeight: 12.5, optimalHarvest: 0 },
    { week: 'Week 9', weight: 14.8, predictedWeight: 15.2, optimalHarvest: 0 },
    { week: 'Week 10', weight: 18.2, predictedWeight: 18.5, optimalHarvest: 0 },
    { week: 'Week 11', weight: null, predictedWeight: 22.1, optimalHarvest: 0 },
    { week: 'Week 12', weight: null, predictedWeight: 26.0, optimalHarvest: 26.0 },
    { week: 'Week 13', weight: null, predictedWeight: 28.5, optimalHarvest: 0 },
  ];

  const resourceData = [
    { day: 'Mon', feedReq: 120, actualFeed: 120, energy: 45 },
    { day: 'Tue', feedReq: 125, actualFeed: 130, energy: 48 },
    { day: 'Wed', feedReq: 130, actualFeed: 130, energy: 50 },
    { day: 'Thu', feedReq: 135, actualFeed: 140, energy: 46 },
    { day: 'Fri', feedReq: 140, actualFeed: 140, energy: 52 },
    { day: 'Sat', feedReq: 150, actualFeed: 145, energy: 55 },
    { day: 'Sun', feedReq: 155, actualFeed: 155, energy: 53 },
  ];

  const financialData = [
    { month: 'Month 1', costs: 4500, projectedRevenue: 0 },
    { month: 'Month 2', costs: 5200, projectedRevenue: 0 },
    { month: 'Month 3', costs: 6100, projectedRevenue: 18000 },
    { month: 'Month 4', costs: 4800, projectedRevenue: 24000 },
  ];

  const aiInsights = [
    { type: 'Optimization', message: 'Reduce feed by 5% in Pond 3 due to lower activity detected by acoustic sensors.', severity: 'medium', time: '2h ago' },
    { type: 'Alert', message: 'Harvest recommended for Pond 2 within 4 days to maximize yield vs market price ratio.', severity: 'high', time: '5h ago' },
    { type: 'Info', message: 'Labor alignment is optimal for current growth phase.', severity: 'low', time: '1d ago' },
    { type: 'Warning', message: 'Predicted 10% increase in energy cost over the next cycle due to aeration requirements.', severity: 'medium', time: '1d ago' },
  ];

  const faqs = [
    { q: 'Do I need technical skills to use the assistant?', a: 'No. The assistant is designed for farmers, not engineers. If you can send a message on your phone, you can use the system. All complex analytics stay behind the scenes.' },
    { q: 'What kind of data does the assistant need?', a: 'It works best with pond records (stocking, feed, harvest), water quality readings, and basic cost information. However, you can start with very simple records and add more detail over time.' },
    { q: 'Does it replace my farm technician or consultant?', a: 'No. The assistant complements your existing expertise. It makes data easier to use, highlights risks, and suggests options so you and your advisors can make better-informed decisions.' },
    { q: 'How secure is my farm data?', a: 'All data is encrypted in transit and at rest. We never share identifiable farm data with others. Aggregated and anonymized statistics may be used only to provide benchmarks and improve the system.' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* ── Hero Section ── */}
      <section className="relative h-[450px] md:h-[650px] w-full overflow-hidden">
        {heroImages.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}
            style={{ backgroundImage: `url('${image}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/80 via-blue-900/60 to-indigo-900/80" />
          </div>
        ))}
        <div className="relative z-10 h-full flex items-center justify-center px-6">
          <div className="max-w-4xl text-center text-white">
            <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight drop-shadow-lg">
              Farm Management AI Assistant
            </h1>
            <p className="text-lg md:text-2xl mb-8 max-w-3xl mx-auto leading-relaxed drop-shadow-md text-blue-100">
              Intelligent decision support for harvest timing, resource optimization, and predictive farm analytics.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <button className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-lg transition-all transform hover:scale-105">
                Launch Dashboard
              </button>
              <button className="px-8 py-3 bg-white/10 backdrop-blur-md hover:bg-white/20 border border-white/30 text-white font-semibold rounded-lg shadow-lg transition-all transform hover:scale-105">
                Talk to Advisor AI
              </button>
            </div>
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
          {heroImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition-all ${index === currentSlide ? 'bg-indigo-400 w-8' : 'bg-white/50 hover:bg-white/75'}`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="py-8 bg-gradient-to-r from-indigo-800 to-blue-900">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            {[
              { value: '96%', label: 'Prediction Accuracy' },
              { value: '-15%', label: 'Avg Cost Reduction' },
              { value: '+22%', label: 'Yield Optimization' },
              { value: '24/7', label: 'AI Consultation' },
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-4xl font-bold mb-2 text-indigo-200">{stat.value}</div>
                <div className="text-sm font-medium text-indigo-300">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The Problem ── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">The Problem with Traditional Farm Management</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Many shrimp farms still rely on scattered notebooks, memory, and gut feeling to run ponds — making it easy to miss early warning signs, difficult to compare ponds, and hard to understand where money is really earned or lost.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { icon: '🧾', title: 'Fragmented Records', desc: 'Paper logs, spreadsheets, and WhatsApp notes make it difficult to see the full picture of each pond or cycle in one place.' },
              { icon: '⚠️', title: 'Missed Early Warnings', desc: 'Subtle changes in water quality, growth, or cost patterns often go unnoticed until they become disease, mortality, or big financial losses.' },
              { icon: '📉', title: 'Unclear Profit Drivers', desc: 'Without proper analytics, it is hard to know which ponds, decisions, or seasons are truly profitable and which are dragging results down.' },
            ].map((item, i) => (
              <div key={i} className="bg-gray-50 rounded-2xl p-8 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
                <div className="text-5xl mb-4">{item.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Farm Intelligence Hub (Insights) ── */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">Farm Intelligence Hub</h2>
            <p className="text-lg text-gray-600">Your central command for data-driven shrimp farming decisions</p>
          </div>
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              {[
                { icon: '🎯', name: 'Model Accuracy', value: '96.5%', trend: '+0.8%' },
                { icon: '📊', name: 'Data Points Processed', value: '1.2M', trend: '+15k/day' },
                { icon: '🤖', name: 'Active Advisory Bots', value: '24', trend: 'Online' },
              ].map((metric, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-all border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-2xl">{metric.icon}</div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500">{metric.name}</h3>
                      <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-green-500 bg-green-50 px-2 py-1 rounded-md">{metric.trend}</div>
                </div>
              ))}
              <div className="bg-gradient-to-br from-indigo-900 to-blue-800 rounded-2xl p-6 shadow-xl text-white">
                <h3 className="text-xl font-bold mb-3">Chat with Advisor</h3>
                <p className="text-sm text-indigo-200 mb-6">Ask questions about feeding, health, or market prices in your local language.</p>
                <button className="w-full py-3 bg-white text-indigo-600 rounded-lg font-bold shadow-md hover:bg-indigo-50 transition-colors">Open AI Chat</button>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 h-full">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-800">Actionable AI Insights</h3>
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                  </span>
                </div>
                <div className="space-y-4">
                  {aiInsights.map((insight, i) => (
                    <div key={i} className={`p-5 rounded-xl border-l-4 ${insight.severity === 'high' ? 'bg-red-50 border-red-500' : insight.severity === 'medium' ? 'bg-amber-50 border-amber-500' : 'bg-indigo-50 border-indigo-500'}`}>
                      <div className="flex items-start justify-between mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${insight.severity === 'high' ? 'bg-red-200 text-red-800' : insight.severity === 'medium' ? 'bg-amber-200 text-amber-800' : 'bg-indigo-200 text-indigo-800'}`}>{insight.type}</span>
                        <span className="text-xs font-medium text-gray-500">{insight.time}</span>
                      </div>
                      <p className="text-gray-800 font-medium leading-relaxed">{insight.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-3xl shadow-md">🤖</div>
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800">The Intelligence Behind the Assistant</h2>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {[
              { icon: '💬', color: 'border-blue-500', title: 'Conversational AI Engine', desc: 'Understands farmer questions in natural language (including local terms) and translates them into structured queries over farm, water quality, and market data.' },
              { icon: '📊', color: 'border-cyan-500', title: 'Decision Analytics Layer', desc: 'Continuously evaluates KPIs like FCR, survival rate, yield, and cost per kg, flagging risks early and suggesting corrective actions before they become expensive.' },
              { icon: '🔮', color: 'border-green-500', title: 'Predictive Scenario Models', desc: 'Simulates different decisions—like harvesting earlier, changing stocking density, or adjusting feed plans—and shows expected impact on revenue, risk, and resources.' },
            ].map((card, i) => (
              <div key={i} className={`bg-white rounded-2xl shadow-lg p-8 border-t-4 ${card.color} hover:shadow-xl transition-shadow`}>
                <div className="text-5xl mb-4">{card.icon}</div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">{card.title}</h3>
                <p className="text-gray-600 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-8 border-l-4 border-indigo-600">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">How the Assistant Works Step by Step</h3>
            <div className="space-y-5">
              {[
                { step: '1', text: <><strong>You ask a question</strong> in plain language about feeding, harvest timing, costs, water quality, or any other farm decision.</> },
                { step: '2', text: <><strong>The assistant reads your data</strong> – recent pond records, water parameters, growth curves, and past outcomes – to understand the real situation.</> },
                { step: '3', text: <><strong>AI models evaluate options</strong> and simulate different choices, highlighting trade-offs in profit, risk, and resource use.</> },
                { step: '4', text: <><strong>You receive a simple answer</strong> with clear next steps, numbers you can trust, and suggestions you can explain to your team or partners.</> },
              ].map((item, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <span className="flex-shrink-0 w-9 h-9 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">{item.step}</span>
                  <p className="text-gray-700 leading-relaxed pt-1">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Predictive Analytics Charts ── */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">Predictive Analytics</h2>
            <p className="text-lg text-gray-600">Future-proof your harvest with precise AI forecasting and optimization models</p>
          </div>
          <div className="flex justify-center gap-4 mb-10 flex-wrap">
            {[
              { key: 'harvest', label: 'Harvest Timing' },
              { key: 'resources', label: 'Resource Planning' },
              { key: 'financial', label: 'Financial Performance' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveChartTab(tab.key)}
                className={`px-8 py-3 rounded-lg font-semibold transition-all shadow-sm ${activeChartTab === tab.key ? 'bg-indigo-600 text-white shadow-md transform scale-105' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-6 md:p-10 border border-gray-100">
            {activeChartTab === 'harvest' && (
              <>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Optimal Harvest Window Prediction</h3>
                <p className="text-gray-600 mb-8">AI predicts the exact week your shrimp will hit target weight based on growth rate velocity and historical data.</p>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={harvestData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="week" axisLine={false} tickLine={false} dy={10} />
                      <YAxis axisLine={false} tickLine={false} dx={-10} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Bar dataKey="optimalHarvest" fill="#10b981" name="Optimal Harvest Window" opacity={0.2} barSize={60} />
                      <Line type="monotone" dataKey="weight" stroke="#4f46e5" strokeWidth={4} name="Actual Weight (g)" dot={{ r: 6, strokeWidth: 2 }} />
                      <Line type="monotone" strokeDasharray="5 5" dataKey="predictedWeight" stroke="#8b5cf6" strokeWidth={3} name="Predicted Weight (g)" dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-8 p-5 bg-indigo-50 rounded-2xl border border-indigo-100 flex gap-4 items-start">
                  <div className="text-2xl">💡</div>
                  <div>
                    <h4 className="font-bold text-indigo-900 mb-1">AI Recommendation</h4>
                    <p className="text-indigo-800 text-sm leading-relaxed">
                      Target harvest for <strong>Week 12</strong>. Growth rate typically plateaus after 26g, and maintaining the pond beyond this point increases FCR and mortality risk disproportionate to market value gains.
                    </p>
                  </div>
                </div>
              </>
            )}
            {activeChartTab === 'resources' && (
              <>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Feed & Resource Optimization</h3>
                <p className="text-gray-600 mb-8">Track actual usage against AI-calculated requirements to minimize waste and optimize FCR.</p>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={resourceData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} dy={10} />
                      <YAxis axisLine={false} tickLine={false} dx={-10} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Area type="monotone" dataKey="actualFeed" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorActual)" name="Actual Feed Used (kg)" />
                      <Line type="step" dataKey="feedReq" stroke="#f59e0b" strokeWidth={3} name="AI Recommended Feed (kg)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
            {activeChartTab === 'financial' && (
              <>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Cost vs Projected Revenue</h3>
                <p className="text-gray-600 mb-8">Monitor operational expenses against expected market returns.</p>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={financialData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} dy={10} />
                      <YAxis axisLine={false} tickLine={false} dx={-10} />
                      <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Bar dataKey="costs" fill="#ef4444" name="Operational Costs ($)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="projectedRevenue" fill="#10b981" name="Projected Revenue ($)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Real-World Use Cases ── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-14 h-14 bg-green-600 rounded-2xl flex items-center justify-center text-3xl shadow-md">📊</div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800">Real-World Ways Farmers Use the Assistant</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 text-white">
                <h3 className="text-2xl font-bold mb-1">🏡 Small-Scale Farms</h3>
                <p className="text-green-100 text-sm">1–5 ponds • 2–10 tons production</p>
              </div>
              <div className="p-6 space-y-4">
                {[
                  { title: 'Daily Question Support', desc: 'Ask about feeding, disease risk, or costs anytime from your phone.' },
                  { title: '10–20% Better Cost Control', desc: 'Spot overspending on feed, chemicals, and labor before it eats your margin.' },
                  { title: 'Simple Weekly Summaries', desc: 'Receive an easy-to-read report of how the farm is doing without spreadsheets.' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-green-500 text-xl mt-0.5">✓</span>
                    <div>
                      <p className="font-semibold text-gray-800">{item.title}</p>
                      <p className="text-sm text-gray-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
              <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-6 text-white">
                <h3 className="text-2xl font-bold mb-1">🏭 Commercial Farms</h3>
                <p className="text-blue-100 text-sm">10+ ponds • 50+ tons production</p>
              </div>
              <div className="p-6 space-y-4">
                {[
                  { title: 'Multi-Pond Intelligence', desc: 'Compare ponds and cycles instantly to see where you are losing performance.' },
                  { title: 'Management Dashboards', desc: 'Track FCR, survival, yield, and ROI across the entire farm from one place.' },
                  { title: 'Expansion & Investment Planning', desc: 'Test the impact of new ponds, aerators, or automation before committing capital.' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-blue-500 text-xl mt-0.5">✓</span>
                    <div>
                      <p className="font-semibold text-gray-800">{item.title}</p>
                      <p className="text-sm text-gray-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-8 text-center">Average Performance Improvements</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { value: '15–25%', label: 'Higher Profit Margin per Cycle', color: 'text-green-600' },
                { value: '20–30%', label: 'Fewer Costly Decision Errors', color: 'text-blue-600' },
                { value: '30–40%', label: 'Less Time Spent on Planning', color: 'text-cyan-600' },
                { value: '10–20%', label: 'More Predictable Harvest Outcomes', color: 'text-emerald-600' },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className={`text-4xl font-bold mb-2 ${stat.color}`}>{stat.value}</div>
                  <p className="text-gray-700 font-medium text-sm">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Sustainability ── */}
      <section className="py-20 px-6 bg-gray-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600 rounded-full filter blur-[100px] opacity-20 transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600 rounded-full filter blur-[100px] opacity-20 transform -translate-x-1/2 translate-y-1/2"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Sustainable Aquaculture</h2>
            <p className="text-xl text-indigo-200 max-w-2xl mx-auto">Optimizing production while tracking your farm&apos;s environmental and social impact footprint.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: '🌍', title: 'Environmental', color: 'text-green-400', items: ['Reduce water exchange via precision quality management.', 'Lower feed waste reducing pond bed pollution.', 'Optimize aerator schedules saving 18% energy.'] },
              { icon: '💰', title: 'Economic', color: 'text-blue-400', items: ['Minimize crop loss risk with early disease detection.', 'Stabilize cash flow via precise harvest planning.', 'Reduce overheads by anticipating resource needs.'] },
              { icon: '🤝', title: 'Social', color: 'text-purple-400', items: ['Digital empowerment for local farming communities.', 'Boost rural livelihoods through consistent yields.', 'Ensure sustainable national food security.'] },
            ].map((col, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-lg border border-white/10 p-8 rounded-3xl hover:bg-white/10 transition-colors">
                <div className="text-4xl mb-4">{col.icon}</div>
                <h3 className="text-2xl font-bold mb-4">{col.title}</h3>
                <ul className="space-y-3 text-indigo-100">
                  {col.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-3"><span className={`${col.color} mt-1`}>✓</span>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Quick Setup Guide ── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center text-3xl shadow-md">🔧</div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800">Quick Setup Guide</h2>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-8">
            <div className="grid md:grid-cols-4 gap-8">
              {[
                { step: '1', title: 'Create Farm Profile', desc: 'Add ponds, locations, and typical culture cycles (15–20 minutes).' },
                { step: '2', title: 'Import Key Records', desc: 'Upload past cycle summaries or start recording new data (30–60 minutes).' },
                { step: '3', title: 'Set Targets', desc: 'Define goals for yield, FCR, and profit so the assistant knows what "success" means for you.' },
                { step: '4', title: 'Use It Daily', desc: 'Ask questions, review alerts, and adjust plans as the season progresses. The assistant improves over time.' },
              ].map((item, i) => (
                <div key={i} className="text-center">
                  <div className="w-16 h-16 bg-orange-500 text-white rounded-full flex items-center justify-center text-2xl mx-auto mb-4 font-bold shadow-md">{item.step}</div>
                  <h3 className="font-bold text-gray-800 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQs ── */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center text-3xl shadow-md">❓</div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <button
                  className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-semibold text-lg text-gray-800 pr-4">{faq.q}</span>
                  <span className={`text-2xl text-gray-400 transition-transform duration-300 flex-shrink-0 ${openFaq === i ? 'rotate-180' : ''}`}>⌄</span>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-6 text-gray-600 border-t border-gray-100 pt-4 leading-relaxed">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-indigo-600 to-blue-700 rounded-3xl p-8 md:p-14 text-center text-white shadow-2xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to See the Assistant in Action?</h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Try the Farm Management AI Assistant with your own data or talk with our team about how it can fit into your operation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/demo" className="inline-block px-8 py-4 bg-white text-indigo-600 font-bold rounded-xl shadow-lg hover:bg-gray-100 transition-all transform hover:scale-105">
                ▶️ Explore Interactive Demo
              </a>
              <a href="/contact" className="inline-block px-8 py-4 bg-green-500 text-white font-bold rounded-xl shadow-lg hover:bg-green-600 transition-all transform hover:scale-105">
                📞 Talk to Our Team
              </a>
            </div>
            <p className="text-sm text-blue-200 mt-6">✓ Free consultation &nbsp;•&nbsp; ✓ No long-term commitment &nbsp;•&nbsp; ✓ Tailored to your farm size</p>
          </div>
        </div>
      </section>
    </div>
  );
}
