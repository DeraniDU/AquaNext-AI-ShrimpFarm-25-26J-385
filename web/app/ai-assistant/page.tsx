export const metadata = {
  title: 'Farm Management AI Assistant',
  description:
    'Deep-dive into how the Farm Management AI Assistant supports shrimp farmers with decisions, planning, and analytics.',
};

export default function AIAssistantPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-16 px-8 md:px-16">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            How the Farm Management AI Assistant Works
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 max-w-3xl">
            Explore the digital assistant that helps shrimp farmers make faster,
            smarter, and more confident decisions across every pond and cycle.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 md:px-16 py-12">
        {/* Problem Section */}
        <section className="mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-4">
            The Problem with Traditional Farm Management
          </h2>
          <p className="text-base md:text-lg text-gray-600 text-center max-w-3xl mx-auto mb-12">
            Many shrimp farms still rely on scattered notebooks, memory, and gut
            feeling to run ponds. This makes it easy to miss early warning
            signs, difficult to compare ponds, and hard to understand where
            money is really being earned or lost.
          </p>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="bg-white rounded-xl shadow-md px-6 py-8 flex flex-col items-center text-center">
              <div className="mb-4 text-4xl">🧾</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Fragmented Records
              </h3>
              <p className="text-gray-600 text-sm md:text-base">
                Paper logs, spreadsheets, and WhatsApp notes make it difficult
                to see the full picture of each pond or cycle in one place.
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-md px-6 py-8 flex flex-col items-center text-center">
              <div className="mb-4 text-4xl">⚠️</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Missed Early Warnings
              </h3>
              <p className="text-gray-600 text-sm md:text-base">
                Subtle changes in water quality, growth, or cost patterns often
                go unnoticed until they become disease, mortality, or big
                financial losses.
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-md px-6 py-8 flex flex-col items-center text-center">
              <div className="mb-4 text-4xl">📉</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Unclear Profit Drivers
              </h3>
              <p className="text-gray-600 text-sm md:text-base">
                Without proper analytics, it is hard to know which ponds,
                decisions, or seasons are truly profitable and which are
                dragging results down.
              </p>
            </div>
          </div>
        </section>

        {/* Advanced AI Technology — split layout (aligned with feeding page) */}
        <section className="mb-20 py-4">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Advanced AI Technology
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                The assistant combines large-language reasoning with farm-specific
                analytics trained on production, water quality, and cost
                patterns—so recommendations stay grounded in real pond outcomes,
                not generic advice.
              </p>

              <div className="space-y-6">
                <div className="flex gap-4 p-5 rounded-xl bg-teal-50 hover:bg-teal-100/80 transition-colors border border-teal-100">
                  <div className="flex-shrink-0">
                    <svg
                      className="w-12 h-12 text-teal-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-gray-900">
                      Unified Farm Data
                    </h3>
                    <p className="text-gray-600">
                      Connects stocking, feed, harvest, water parameters, and
                      costs into one model of each pond so answers always reflect
                      your actual numbers.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-5 rounded-xl bg-indigo-50 hover:bg-indigo-100/80 transition-colors border border-indigo-100">
                  <div className="flex-shrink-0">
                    <svg
                      className="w-12 h-12 text-indigo-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-gray-900">
                      Real-Time Insight
                    </h3>
                    <p className="text-gray-600">
                      Surfaces deviations from targets (FCR, survival, margin)
                      as they emerge and explains what to check first—no waiting
                      for end-of-cycle reports.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-5 rounded-xl bg-fuchsia-50 hover:bg-fuchsia-100/80 transition-colors border border-fuchsia-100">
                  <div className="flex-shrink-0">
                    <svg
                      className="w-12 h-12 text-fuchsia-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-gray-900">
                      Scenario &amp; Forecast Models
                    </h3>
                    <p className="text-gray-600">
                      Compares harvest timing, stocking, and input plans with
                      projected revenue and risk so you can choose the path that
                      fits your goals.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-950 rounded-2xl p-6 md:p-8 shadow-2xl border border-slate-800">
              <div className="bg-slate-900 rounded-xl p-5 md:p-6 mb-4 border border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-white font-bold text-sm md:text-base">
                    Live Assistant Status
                  </span>
                  <span className="px-3 py-1 bg-emerald-500 text-white rounded-full text-xs font-bold flex items-center gap-2">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    ACTIVE
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6">
                  <div className="bg-slate-800 rounded-lg p-4 hover:bg-slate-700/90 transition-colors border border-slate-700/80">
                    <div className="text-cyan-400 text-xs mb-1">Active Ponds</div>
                    <div className="text-white text-xl md:text-2xl font-bold">
                      6
                    </div>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-4 hover:bg-slate-700/90 transition-colors border border-slate-700/80">
                    <div className="text-blue-400 text-xs mb-1">Cycle Day</div>
                    <div className="text-white text-xl md:text-2xl font-bold">
                      42
                    </div>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-4 hover:bg-slate-700/90 transition-colors border border-slate-700/80">
                    <div className="text-violet-400 text-xs mb-1">Target FCR</div>
                    <div className="text-white text-xl md:text-2xl font-bold">
                      1.15
                    </div>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-4 hover:bg-slate-700/90 transition-colors border border-slate-700/80">
                    <div className="text-emerald-400 text-xs mb-1">Open Alerts</div>
                    <div className="text-white text-xl md:text-2xl font-bold">
                      2
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700/80">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white text-sm font-bold">
                      AI Analysis
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                      ON TRACK
                    </span>
                  </div>
                  <div className="h-24 flex items-end justify-between gap-1">
                    {[
                      68, 82, 74, 88, 92, 86, 90, 84, 91, 88, 93, 89, 94, 90, 95,
                    ].map((height, i) => (
                      <div
                        key={i}
                        className="flex-1 min-w-0 bg-gradient-to-t from-cyan-500 to-blue-500 rounded-t hover:opacity-90 transition-opacity"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                  <div className="text-slate-500 text-xs mt-3">
                    Confidence: 97.2%
                  </div>
                </div>
              </div>

              <p className="text-slate-500 text-sm text-center">
                The assistant processes farm data continuously and prioritizes
                the actions that protect margin and survival.
              </p>
            </div>
          </div>
        </section>

        {/* Technical Deep Dive */}
        <section className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-2xl">
              🤖
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800">
              The Intelligence Behind the Assistant
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-blue-500 hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">
                Conversational AI Engine
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Understands farmer questions in natural language (including
                local terms) and translates them into structured queries over
                farm, water quality, and market data to return clear, actionable
                answers.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-cyan-500 hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">
                Decision Analytics Layer
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Continuously evaluates KPIs like FCR, survival rate, yield, and
                cost per kg, flagging risks early and suggesting corrective
                actions before they become expensive problems.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-green-500 hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-4">🔮</div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">
                Predictive Scenario Models
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Simulates different decisions—like harvesting earlier, changing
                stocking density, or adjusting feed plans—and shows expected
                impact on revenue, risk, and resource usage.
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-8 border-l-4 border-blue-600">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">
              How the Assistant Works Step by Step
            </h3>
            <div className="space-y-4 text-gray-700">
              <div className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  1
                </span>
                <p>
                  <strong>You ask a question</strong> in plain language about
                  feeding, harvest timing, costs, water quality, or any other
                  farm decision.
                </p>
              </div>
              <div className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  2
                </span>
                <p>
                  <strong>The assistant reads your data</strong> – recent pond
                  records, water parameters, growth curves, and past outcomes –
                  to understand the real situation on your farm.
                </p>
              </div>
              <div className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </span>
                <p>
                  <strong>AI models evaluate options</strong> and simulate
                  different choices, highlighting trade-offs in profit, risk,
                  and resource use.
                </p>
              </div>
              <div className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  4
                </span>
                <p>
                  <strong>You receive a simple answer</strong> with clear next
                  steps, numbers you can trust, and suggestions you can explain
                  to your team or partners.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases & Success Scenarios */}
        <section className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center text-2xl">
              📊
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800">
              Real-World Ways Farmers Use the Assistant
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Small Farm */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 text-white">
                <h3 className="text-2xl font-bold mb-2">🏡 Small-Scale Farms</h3>
                <p className="text-green-100">1–5 ponds • 2–10 tons production</p>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-4">
                  Ideal for farmers who want help with daily decisions but
                  cannot hire full-time technical consultants.
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-green-600 text-xl">✓</span>
                    <div>
                      <p className="font-semibold text-gray-800">
                        Daily Question Support
                      </p>
                      <p className="text-sm text-gray-600">
                        Ask about feeding, disease risk, or costs anytime from
                        your phone.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-green-600 text-xl">✓</span>
                    <div>
                      <p className="font-semibold text-gray-800">
                        10–20% Better Cost Control
                      </p>
                      <p className="text-sm text-gray-600">
                        Spot overspending on feed, chemicals, and labor before
                        it eats your margin.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-green-600 text-xl">✓</span>
                    <div>
                      <p className="font-semibold text-gray-800">
                        Simple Weekly Summaries
                      </p>
                      <p className="text-sm text-gray-600">
                        Receive an easy-to-read report of how the farm is doing
                        without spreadsheets.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Large Farm */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 text-white">
                <h3 className="text-2xl font-bold mb-2">🏭 Commercial Farms</h3>
                <p className="text-blue-100">10+ ponds • 50+ tons production</p>
              </div>
              <div className="p-6">   
                <p className="text-gray-600 mb-4">
                  Perfect for owners and managers who need farm-wide visibility
                  and standardized decision support.
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-blue-600 text-xl">✓</span>
                    <div>
                      <p className="font-semibold text-gray-800">
                        Multi-Pond Intelligence
                      </p>
                      <p className="text-sm text-gray-600">
                        Compare ponds and cycles instantly to see where you are
                        losing performance.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-blue-600 text-xl">✓</span>
                    <div>
                      <p className="font-semibold text-gray-800">
                        Management Dashboards
                      </p>
                      <p className="text-sm text-gray-600">
                        Track FCR, survival, yield, and ROI across the entire
                        farm from one place.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-blue-600 text-xl">✓</span>
                    <div>
                      <p className="font-semibold text-gray-800">
                        Expansion & Investment Planning
                      </p>
                      <p className="text-sm text-gray-600">
                        Test the impact of new ponds, aerators, or automation
                        before committing capital.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Success Metrics */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              Average Performance Improvements
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600 mb-2">15–25%</div>
                <p className="text-gray-700 font-medium">Higher Profit Margin per Cycle</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">20–30%</div>
                <p className="text-gray-700 font-medium">Fewer Costly Decision Errors</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-cyan-600 mb-2">30–40%</div>
                <p className="text-gray-700 font-medium">Less Time Spent on Planning</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-emerald-600 mb-2">10–20%</div>
                <p className="text-gray-700 font-medium">More Predictable Harvest Outcomes</p>
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
                <span className="font-semibold text-lg text-gray-800">
                  Do I need technical skills to use the assistant?
                </span>
                <span className="text-2xl text-gray-400 group-open:rotate-180 transition-transform">
                  ⌄
                </span>
              </summary>
              <div className="px-6 pb-6 text-gray-600 border-t border-gray-100 pt-4">
                No. The assistant is designed for farmers, not engineers. If you
                can send a message on your phone, you can use the system. All
                complex analytics stay behind the scenes.
              </div>
            </details>

            <details className="bg-white rounded-xl shadow-md overflow-hidden group">
              <summary className="p-6 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between">
                <span className="font-semibold text-lg text-gray-800">
                  What kind of data does the assistant need?
                </span>
                <span className="text-2xl text-gray-400 group-open:rotate-180 transition-transform">
                  ⌄
                </span>
              </summary>
              <div className="px-6 pb-6 text-gray-600 border-t border-gray-100 pt-4">
                It works best with pond records (stocking, feed, harvest),
                water quality readings, and basic cost information. However, you
                can start with very simple records and add more detail over
                time.
              </div>
            </details>

            <details className="bg-white rounded-xl shadow-md overflow-hidden group">
              <summary className="p-6 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between">
                <span className="font-semibold text-lg text-gray-800">
                  Does it replace my farm technician or consultant?
                </span>
                <span className="text-2xl text-gray-400 group-open:rotate-180 transition-transform">
                  ⌄
                </span>
              </summary>
              <div className="px-6 pb-6 text-gray-600 border-t border-gray-100 pt-4">
                No. The assistant complements your existing expertise. It makes
                data easier to use, highlights risks, and suggests options so
                you and your advisors can make better-informed decisions.
              </div>
            </details>

            <details className="bg-white rounded-xl shadow-md overflow-hidden group">
              <summary className="p-6 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between">
                <span className="font-semibold text-lg text-gray-800">
                  How secure is my farm data?
                </span>
                <span className="text-2xl text-gray-400 group-open:rotate-180 transition-transform">
                  ⌄
                </span>
              </summary>
              <div className="px-6 pb-6 text-gray-600 border-t border-gray-100 pt-4">
                All data is encrypted in transit and at rest. We never share
                identifiable farm data with others. Aggregated and anonymized
                statistics may be used only to provide benchmarks and improve
                the system.
              </div>
            </details>
          </div>
        </section>

        {/* Installation / Setup Guide */}
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
                <div className="w-16 h-16 bg-orange-600 text-white rounded-full flex items-center justify-center text-2xl mx-auto mb-4 font-bold">
                  1
                </div>
                <h3 className="font-bold text-gray-800 mb-2">Create Farm Profile</h3>
                <p className="text-sm text-gray-600">
                  Add ponds, locations, and typical culture cycles (15–20
                  minutes).
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-600 text-white rounded-full flex items-center justify-center text-2xl mx-auto mb-4 font-bold">
                  2
                </div>
                <h3 className="font-bold text-gray-800 mb-2">Import Key Records</h3>
                <p className="text-sm text-gray-600">
                  Upload past cycle summaries or start recording new data (30–60
                  minutes).
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-600 text-white rounded-full flex items-center justify-center text-2xl mx-auto mb-4 font-bold">
                  3
                </div>
                <h3 className="font-bold text-gray-800 mb-2">Set Targets</h3>
                <p className="text-sm text-gray-600">
                  Define goals for yield, FCR, and profit so the assistant knows
                  what “success” means for you.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-600 text-white rounded-full flex items-center justify-center text-2xl mx-auto mb-4 font-bold">
                  4
                </div>
                <h3 className="font-bold text-gray-800 mb-2">Use It Daily</h3>
                <p className="text-sm text-gray-600">
                  Ask questions, review alerts, and adjust plans as the season
                  progresses. The assistant improves over time.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-8 md:p-12 text-center text-white shadow-2xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to See the Assistant in Action?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Try the Farm Management AI Assistant with your own data or talk with
            our team about how it can fit into your operation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/demo"
              className="inline-block px-8 py-4 bg-white text-blue-600 font-bold rounded-lg shadow-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105"
            >
              ▶️ Explore Interactive Demo
            </a>
            <a
              href="/contact"
              className="inline-block px-8 py-4 bg-green-500 text-white font-bold rounded-lg shadow-lg hover:bg-green-600 transition-all duration-300 transform hover:scale-105"
            >
              📞 Talk to Our Team
            </a>
          </div>
          <p className="text-sm text-blue-200 mt-6">
            ✓ Free consultation • ✓ No long-term commitment • ✓ Tailored to your
            farm size
          </p>
        </div>
      </div>
    </div>
  );
}
