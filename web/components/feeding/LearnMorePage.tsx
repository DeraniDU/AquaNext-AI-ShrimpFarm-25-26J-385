'use client';

export default function LearnMorePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-16 px-8 md:px-16">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            How Smart Feeding Works
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 max-w-3xl">
            Discover the technology that's revolutionizing shrimp aquaculture with AI-powered precision feeding
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 md:px-16 py-12">
        {/* Technical Deep Dive */}
        <section className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-2xl">
              🔬
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800">
              The Technology Behind Smart Feeding
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-blue-500 hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-4">🎤</div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">AI Acoustic Sensors</h3>
              <p className="text-gray-600 leading-relaxed">
                Underwater microphones capture subtle sounds of shrimp feeding. Our AI distinguishes between active feeding, searching behavior, and satiation patterns with 95% accuracy.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-cyan-500 hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-4">🧠</div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Real-Time Analysis</h3>
              <p className="text-gray-600 leading-relaxed">
                Machine learning algorithms process acoustic data every 30 seconds, detecting hunger signals and adjusting feeding schedules instantly based on actual demand.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-green-500 hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-4">⚙️</div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Precision Motor Control</h3>
              <p className="text-gray-600 leading-relaxed">
                Variable-speed motors dispense exact feed quantities. The system adjusts from 50g/min to 500g/min based on pond size, shrimp density, and detected appetite levels.
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-8 border-l-4 border-blue-600">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">How It All Works Together</h3>
            <div className="space-y-4 text-gray-700">
              <div className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">1</span>
                <p><strong>Sensors listen</strong> continuously to underwater sounds, capturing shrimp activity patterns throughout the day and night.</p>
              </div>
              <div className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">2</span>
                <p><strong>AI analyzes</strong> the acoustic signature to determine if shrimp are actively searching for food, feeding, or satisfied.</p>
              </div>
              <div className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">3</span>
                <p><strong>System responds</strong> by automatically dispensing the optimal amount of feed, preventing both underfeeding and waste.</p>
              </div>
              <div className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">4</span>
                <p><strong>Continuous learning</strong> adapts to your specific pond conditions, shrimp lifecycle stages, and seasonal variations.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases & Success Stories */}
        <section className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center text-2xl">
              📊
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800">
              Real-World Applications & Results
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Small Farm */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 text-white">
                <h3 className="text-2xl font-bold mb-2">🏡 Small-Scale Farms</h3>
                <p className="text-green-100">1-5 ponds • 2-10 tons production</p>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-4">
                  Perfect for family-owned operations looking to reduce manual labor while improving efficiency.
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-green-600 text-xl">✓</span>
                    <div>
                      <p className="font-semibold text-gray-800">24/7 Monitoring</p>
                      <p className="text-sm text-gray-600">No need for constant pond checks</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-green-600 text-xl">✓</span>
                    <div>
                      <p className="font-semibold text-gray-800">15-20% Feed Savings</p>
                      <p className="text-sm text-gray-600">ROI in 6-9 months</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-green-600 text-xl">✓</span>
                    <div>
                      <p className="font-semibold text-gray-800">Mobile Alerts</p>
                      <p className="text-sm text-gray-600">Manage remotely via smartphone</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Large Farm */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 text-white">
                <h3 className="text-2xl font-bold mb-2">🏭 Commercial Operations</h3>
                <p className="text-blue-100">10+ ponds • 50+ tons production</p>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-4">
                  Scale your operations efficiently with centralized monitoring and data-driven insights.
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-blue-600 text-xl">✓</span>
                    <div>
                      <p className="font-semibold text-gray-800">Multi-Pond Dashboard</p>
                      <p className="text-sm text-gray-600">Manage entire farm from one interface</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-blue-600 text-xl">✓</span>
                    <div>
                      <p className="font-semibold text-gray-800">30% Labor Reduction</p>
                      <p className="text-sm text-gray-600">Automate feeding across all ponds</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-blue-600 text-xl">✓</span>
                    <div>
                      <p className="font-semibold text-gray-800">Analytics & Reports</p>
                      <p className="text-sm text-gray-600">Optimize production with data insights</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Success Metrics + Charts */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              Average Performance Improvements
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600 mb-2">18%</div>
                <p className="text-gray-700 font-medium">Feed Cost Reduction</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">25%</div>
                <p className="text-gray-700 font-medium">Faster Growth Rate</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-cyan-600 mb-2">40%</div>
                <p className="text-gray-700 font-medium">Less Labor Time</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-emerald-600 mb-2">12%</div>
                <p className="text-gray-700 font-medium">Higher Survival Rate</p>
              </div>
            </div>

            {/* Mini chart-style cards for feeding */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-gray-800">Feed Usage per Day</p>
                  <span className="text-sm text-green-600 font-medium">
                    -16% waste
                  </span>
                </div>
                <div className="h-24 flex items-end gap-2">
                  <div className="flex-1 bg-green-100 rounded-t-md relative">
                    <div className="absolute bottom-0 left-0 right-0 bg-green-500 rounded-t-md h-[85%]" />
                  </div>
                  <div className="flex-1 bg-green-100 rounded-t-md relative">
                    <div className="absolute bottom-0 left-0 right-0 bg-green-500 rounded-t-md h-[70%]" />
                  </div>
                  <div className="flex-1 bg-green-100 rounded-t-md relative">
                    <div className="absolute bottom-0 left-0 right-0 bg-green-500 rounded-t-md h-[64%]" />
                  </div>
                </div>
                <p className="mt-3 text-xs text-gray-500">
                  Example reduction in daily feed usage over three production
                  cycles after enabling smart feeding.
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-gray-800">FCR Trend</p>
                  <span className="text-sm text-emerald-600 font-medium">
                    trending down
                  </span>
                </div>
                <div className="relative h-20">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full h-px bg-gradient-to-r from-red-200 via-gray-200 to-emerald-300" />
                  </div>
                  <svg
                    viewBox="0 0 100 40"
                    className="absolute inset-0 w-full h-full text-emerald-500"
                    preserveAspectRatio="none"
                  >
                    <polyline
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      points="0,28 20,26 40,24 60,22 80,20 100,18"
                    />
                  </svg>
                </div>
                <p className="mt-3 text-xs text-gray-500">
                  Illustrative improvement in Feed Conversion Ratio (FCR) as the
                  system continuously tunes feed quantity and timing.
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-5 md:col-span-3">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-gray-800">
                    Sample Daily Feeding Profile
                  </p>
                  <span className="text-sm text-blue-600 font-medium">
                    Feed rate vs. shrimp response
                  </span>
                </div>
                <div className="relative h-44 mb-4">
                  {/* grid background */}
                  <div className="absolute inset-0">
                    <div className="w-full h-full border border-gray-200 rounded-lg">
                      {/* horizontal grid lines */}
                      <div className="absolute inset-x-0 top-1/4 border-t border-dashed border-gray-200" />
                      <div className="absolute inset-x-0 top-2/4 border-t border-dashed border-gray-200" />
                      <div className="absolute inset-x-0 top-3/4 border-t border-dashed border-gray-200" />
                    </div>
                  </div>
                  <svg
                    viewBox="0 0 100 40"
                    className="absolute inset-0 w-full h-full text-blue-500"
                    preserveAspectRatio="none"
                  >
                    {/* y-axis */}
                    <line
                      x1="8"
                      y1="2"
                      x2="8"
                      y2="38"
                      stroke="#e5e7eb"
                      strokeWidth="1"
                    />
                    {/* x-axis */}
                    <line
                      x1="8"
                      y1="38"
                      x2="98"
                      y2="38"
                      stroke="#e5e7eb"
                      strokeWidth="1"
                    />
                    {/* Feed rate line */}
                    <polyline
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      points="8,32 20,31 32,25 44,21 56,32 68,27 80,20 92,24 98,28"
                    />
                    {/* Shrimp response line */}
                    <polyline
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2"
                      strokeDasharray="4 3"
                      points="8,33 20,32 32,27 44,23 56,31 68,29 80,23 92,25 98,29"
                    />

                    {/* Feed rate points */}
                    <g fill="#3b82f6">
                      <circle cx="8" cy="32" r="1.6" />
                      <circle cx="20" cy="31" r="1.6" />
                      <circle cx="32" cy="25" r="1.6" />
                      <circle cx="44" cy="21" r="1.6" />
                      <circle cx="56" cy="32" r="1.6" />
                      <circle cx="68" cy="27" r="1.6" />
                      <circle cx="80" cy="20" r="1.6" />
                      <circle cx="92" cy="24" r="1.6" />
                      <circle cx="98" cy="28" r="1.6" />
                    </g>
                    {/* Shrimp response points */}
                    <g fill="#38bdf8">
                      <circle cx="8" cy="33" r="1.4" />
                      <circle cx="20" cy="32" r="1.4" />
                      <circle cx="32" cy="27" r="1.4" />
                      <circle cx="44" cy="23" r="1.4" />
                      <circle cx="56" cy="31" r="1.4" />
                      <circle cx="68" cy="29" r="1.4" />
                      <circle cx="80" cy="23" r="1.4" />
                      <circle cx="92" cy="25" r="1.4" />
                      <circle cx="98" cy="29" r="1.4" />
                    </g>
                  </svg>
                </div>
                <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
                  <span>05:00</span>
                  <span>09:00</span>
                  <span>13:00</span>
                  <span>17:00</span>
                  <span>21:00</span>
                  <span>01:00</span>
                  <span>03:00</span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-[11px] text-gray-600">
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-3 h-[2px] rounded-full bg-blue-500" />
                    <span>Feed rate (%)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-3 h-[2px] rounded-full bg-sky-400" />
                    <span>Shrimp response (%)</span>
                  </div>
                </div>
                <p className="mt-3 text-xs text-gray-500">
                  Visual example of how the smart feeder continuously aligns feed
                  delivery with real shrimp feeding activity across the day.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center text-2xl">
              ❓
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            <details className="bg-white rounded-xl shadow-md overflow-hidden group">
              <summary className="p-6 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between">
                <span className="font-semibold text-lg text-gray-800">Does it work for all types of shrimp?</span>
                <span className="text-2xl text-gray-400 group-open:rotate-180 transition-transform">⌄</span>
              </summary>
              <div className="px-6 pb-6 text-gray-600 border-t border-gray-100 pt-4">
                Yes! Our AI is trained on multiple species including Pacific White Shrimp (Litopenaeus vannamei), Black Tiger Shrimp (Penaeus monodon), and Freshwater Prawns (Macrobrachium rosenbergii). The system can be calibrated for other species with minimal adjustment time.
              </div>
            </details>

            <details className="bg-white rounded-xl shadow-md overflow-hidden group">
              <summary className="p-6 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between">
                <span className="font-semibold text-lg text-gray-800">How much feed can I realistically save?</span>
                <span className="text-2xl text-gray-400 group-open:rotate-180 transition-transform">⌄</span>
              </summary>
              <div className="px-6 pb-6 text-gray-600 border-t border-gray-100 pt-4">
                Most farms see 15-20% feed savings in the first production cycle. This comes from eliminating overfeeding, reducing waste from uneaten feed, and optimizing feeding times. For a typical 2-hectare farm spending $50,000/year on feed, that's $7,500-$10,000 in annual savings.
              </div>
            </details>

            <details className="bg-white rounded-xl shadow-md overflow-hidden group">
              <summary className="p-6 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between">
                <span className="font-semibold text-lg text-gray-800">How difficult is installation?</span>
                <span className="text-2xl text-gray-400 group-open:rotate-180 transition-transform">⌄</span>
              </summary>
              <div className="px-6 pb-6 text-gray-600 border-t border-gray-100 pt-4">
                Installation takes 2-4 hours per pond. The feeder mounts on existing pond structures, and acoustic sensors are simply placed underwater. Our team provides full installation support, training, and a detailed setup guide. Most farmers are fully operational within one day.
              </div>
            </details>

            <details className="bg-white rounded-xl shadow-md overflow-hidden group">
              <summary className="p-6 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between">
                <span className="font-semibold text-lg text-gray-800">What about power outages or internet issues?</span>
                <span className="text-2xl text-gray-400 group-open:rotate-180 transition-transform">⌄</span>
              </summary>
              <div className="px-6 pb-6 text-gray-600 border-t border-gray-100 pt-4">
                The system includes backup battery power (8-12 hours) and offline mode. If internet drops, it continues automated feeding based on the last programmed schedule. You'll receive alerts when connectivity is restored. Solar panel options are available for remote locations.
              </div>
            </details>

            <details className="bg-white rounded-xl shadow-md overflow-hidden group">
              <summary className="p-6 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between">
                <span className="font-semibold text-lg text-gray-800">Can I still manually feed if needed?</span>
                <span className="text-2xl text-gray-400 group-open:rotate-180 transition-transform">⌄</span>
              </summary>
              <div className="px-6 pb-6 text-gray-600 border-t border-gray-100 pt-4">
                Absolutely! You maintain complete control. The system has easy manual override buttons and smartphone controls. You can schedule manual feeds, adjust portions, or pause automation anytime. Many farmers use a hybrid approach during the learning phase.
              </div>
            </details>

            <details className="bg-white rounded-xl shadow-md overflow-hidden group">
              <summary className="p-6 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between">
                <span className="font-semibold text-lg text-gray-800">What's the maintenance requirement?</span>
                <span className="text-2xl text-gray-400 group-open:rotate-180 transition-transform">⌄</span>
              </summary>
              <div className="px-6 pb-6 text-gray-600 border-t border-gray-100 pt-4">
                Minimal maintenance: clean sensors monthly, refill feed hoppers as needed, and check system status weekly via the app. We recommend professional servicing every 6 months. All parts are modular and field-replaceable. Average maintenance time is under 30 minutes per month.
              </div>
            </details>

            <details className="bg-white rounded-xl shadow-md overflow-hidden group">
              <summary className="p-6 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between">
                <span className="font-semibold text-lg text-gray-800">What's included in the warranty?</span>
                <span className="text-2xl text-gray-400 group-open:rotate-180 transition-transform">⌄</span>
              </summary>
              <div className="px-6 pb-6 text-gray-600 border-t border-gray-100 pt-4">
                2-year full warranty covering all hardware and sensors. 5-year warranty on motors and structural components. Lifetime software updates and AI improvements. Extended warranties and service packages available. We also offer a 60-day satisfaction guarantee.
              </div>
            </details>

            <details className="bg-white rounded-xl shadow-md overflow-hidden group">
              <summary className="p-6 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between">
                <span className="font-semibold text-lg text-gray-800">Do I need technical expertise to use it?</span>
                <span className="text-2xl text-gray-400 group-open:rotate-180 transition-transform">⌄</span>
              </summary>
              <div className="px-6 pb-6 text-gray-600 border-t border-gray-100 pt-4">
                No technical background needed! The interface is designed for farmers, not engineers. If you can use a smartphone, you can operate our system. We provide hands-on training, video tutorials, and 24/7 phone support. The AI handles all the complex decisions automatically.
              </div>
            </details>
          </div>
        </section>

        {/* Installation Guide Preview */}
        <section className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center text-2xl">
              🔧
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800">
              Quick Setup Guide
            </h2>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-8">
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-600 text-white rounded-full flex items-center justify-center text-2xl mx-auto mb-4 font-bold">1</div>
                <h3 className="font-bold text-gray-800 mb-2">Mount Feeder</h3>
                <p className="text-sm text-gray-600">Install hopper on pond edge or floating platform (30 min)</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-600 text-white rounded-full flex items-center justify-center text-2xl mx-auto mb-4 font-bold">2</div>
                <h3 className="font-bold text-gray-800 mb-2">Deploy Sensors</h3>
                <p className="text-sm text-gray-600">Place acoustic sensors underwater at optimal depth (20 min)</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-600 text-white rounded-full flex items-center justify-center text-2xl mx-auto mb-4 font-bold">3</div>
                <h3 className="font-bold text-gray-800 mb-2">Connect System</h3>
                <p className="text-sm text-gray-600">Link to WiFi and complete app setup (15 min)</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-600 text-white rounded-full flex items-center justify-center text-2xl mx-auto mb-4 font-bold">4</div>
                <h3 className="font-bold text-gray-800 mb-2">AI Calibration</h3>
                <p className="text-sm text-gray-600">Let system learn your pond for 24-48 hours</p>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-8 md:p-12 text-center text-white shadow-2xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Transform Your Farm?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            See the system in action with our interactive demo or schedule a consultation with our aquaculture experts
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="/demo" 
              className="inline-block px-8 py-4 bg-white text-blue-600 font-bold rounded-lg shadow-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105"
            >
              ▶️ Watch Interactive Demo
            </a>
            <a 
              href="/contact" 
              className="inline-block px-8 py-4 bg-green-500 text-white font-bold rounded-lg shadow-lg hover:bg-green-600 transition-all duration-300 transform hover:scale-105"
            >
              📞 Schedule Consultation
            </a>
          </div>
          <p className="text-sm text-blue-200 mt-6">
            ✓ Free site assessment • ✓ No commitment required • ✓ Custom pricing available
          </p>
        </div>
      </div>
    </div>
  );
}