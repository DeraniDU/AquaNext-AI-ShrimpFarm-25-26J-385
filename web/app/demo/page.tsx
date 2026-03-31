'use client';

import { useState } from 'react';
import FeedingDemo from '../../components/feeding/FeedingDemo';
import Link from 'next/link';

type DemoSection = 'water' | 'feeding' | 'disease' | 'ai';

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState<DemoSection>('feeding');

  const tabs = [
    { id: 'water', label: 'Water Quality Monitoring', icon: '🌊', available: false },
    { id: 'feeding', label: 'Feeding System', icon: '🦐', available: true },
    { id: 'disease', label: 'Disease Identification', icon: '🔬', available: false },
    { id: 'ai', label: 'AI Agent', icon: '🤖', available: false },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      {/* ── Demo Header ── */}
      <header className="bg-white border-b border-gray-200 py-6 px-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link href="/" className="text-cyan-600 hover:text-cyan-700 transition-colors flex items-center gap-1 text-sm font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Home
              </Link>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-700 text-xs font-semibold tracking-wide uppercase">
                Interactive Demo
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">AquaNext Live Platform</h1>
          </div>

          <div className="text-sm text-gray-500">
            Select a module to test the live capabilities
          </div>
        </div>
      </header>

      {/* ── Tabs Navigation ── */}
      <div className="bg-white border-b border-gray-200 overflow-x-auto scrollbar-hide">
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-2 sm:gap-4 py-3 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as DemoSection)}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-xl transition-all duration-200 font-medium whitespace-nowrap ${activeTab === tab.id
                  ? 'bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-sm'
                  : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-900 border border-gray-100'
                }`}
            >
              <span className="text-lg">{tab.icon}</span>
              {tab.label}
              {!tab.available && (
                <span className="ml-1.5 px-2 py-0.5 rounded bg-gray-100 text-xs font-medium text-gray-500">
                  Coming Soon
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content Area ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">

        {/* Active: Feeding */}
        {activeTab === 'feeding' && (
          <div className="animate-fadeIn">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Automated Feeding System Demo</h2>
                <p className="text-sm text-gray-500">AI-powered acoustic monitoring & feed dispensing control.</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-bold tracking-wide">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                SYSTEM ONLINE
              </div>
            </div>
            {/* The existing feeding demo connects gracefully here */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-lg p-6">
              <FeedingDemo />
            </div>
          </div>
        )}

        {/* Not Active: Water Quality */}
        {activeTab === 'water' && (
          <ComingSoonPlaceholder
            icon="🌊"
            title="Water Quality Monitoring"
            desc="Real-time IoT sensors tracking pH, DO, Temperature, and Ammonia levels with AI predictive alerts."
          />
        )}

        {/* Not Active: Disease */}
        {activeTab === 'disease' && (
          <ComingSoonPlaceholder
            icon="🔬"
            title="Disease Identification"
            desc="Computer vision model analyzing shrimp images to detect early signs of WSSV, EHP, and EMS."
          />
        )}

        {/* Not Active: AI Agent */}
        {activeTab === 'ai' && (
          <ComingSoonPlaceholder
            icon="🤖"
            title="AI Agent Assistant"
            desc="Conversational AI trained on expert aquaculture data to answer your farming questions instantly."
          />
        )}

      </main>
    </div>
  );
}

// Reusable placeholder for missing demos
function ComingSoonPlaceholder({ icon, title, desc }: { icon: string, title: string, desc: string }) {
  return (
    <div className="w-full h-[600px] bg-white rounded-3xl border border-gray-200 flex flex-col items-center justify-center text-center p-8 animate-fadeIn shadow-sm">
      <div className="w-24 h-24 mb-6 rounded-3xl bg-gray-50 border-2 border-gray-100 shadow-inner flex items-center justify-center text-5xl">
        {icon}
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-3">
        {title} Demo
      </h2>
      <p className="text-gray-500 max-w-md mx-auto mb-8 leading-relaxed">
        {desc}
      </p>

      <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 font-medium">
        <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Module Integration in Progress
        <span className="flex ml-1 gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" />
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce delay-100" />
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce delay-200" />
        </span>
      </div>
    </div>
  );
}
