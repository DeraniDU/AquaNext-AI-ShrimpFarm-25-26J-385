'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';


export default function FeedingSection() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState('7days');
  const [activeChartTab, setActiveChartTab] = useState('growth');

  const heroImages = [
    '/hero/4.jpg',
    '/hero/5.jpg',
    '/hero/6.jpg',
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);


  const shrimpVarieties = [
    {
      name: "Pacific White Shrimp",
      scientific: "Litopenaeus vannamei",
      image: "/hero/pacific-white-shrimp.jpg",
      features: [
        "Fast growth rate",
        "High survival rate",
        "Excellent feed conversion ratio"
      ],
      growthRate: "Very Fast",
      harvestSize: "20–25 g"
    },
    {
      name: "Black Tiger Prawn",
      scientific: "Penaeus monodon",
      image: "/hero/black-tiger-prawn.jpg",
      features: [
        "Large body size",
        "High market value",
        "Distinctive black stripes"
      ],
      growthRate: "Moderate",
      harvestSize: "30–40 g"
    },
    {
      name: "Indian White Prawn",
      scientific: "Fenneropenaeus indicus",
      image: "/hero/indian-white-prawn.webp",
      features: [
        "Well adapted to local conditions",
        "Good disease resistance",
        "Suitable for extensive farming"
      ],
      growthRate: "Moderate",
      harvestSize: "18–22 g"
    }
  ];


  const feedTypes = [
    {
      type: "Starter Feed",
      age: "0–30 Days",
      protein: "40–45%",
      pelletSize: "0.5–1.0 mm",
      frequency: "4–5 times/day",
      image: "/hero/starter-feed.webp",
      color: "bg-green-50 border-green-200"
    },
    {
      type: "Grower Feed",
      age: "31–90 Days",
      protein: "35–40%",
      pelletSize: "1.2–2.0 mm",
      frequency: "3–4 times/day",
      image: "/hero/grower-feed.webp",
      color: "bg-blue-50 border-blue-200"
    },
    {
      type: "Finisher Feed",
      age: "91–150 Days",
      protein: "30–35%",
      pelletSize: "2.5–3.5 mm",
      frequency: "2–3 times/day",
      image: "/hero/finisher-feed.webp",
      color: "bg-orange-50 border-orange-200"
    }
  ];

  const feedingSchedule = [
    { time: '05:00', amount: 5.1, appetite: 'HIGH', temp: 28 },
    { time: '07:00', amount: 5.3, appetite: 'HIGH', temp: 29 },
    { time: '09:00', amount: 5.0, appetite: 'HIGH', temp: 30 },
    { time: '11:00', amount: 4.8, appetite: 'LOW', temp: 31 },
    { time: '13:00', amount: 5.2, appetite: 'HIGH', temp: 32 },
    { time: '15:00', amount: 5.4, appetite: 'HIGH', temp: 31 },
    { time: '17:00', amount: 5.1, appetite: 'LOW', temp: 30 },
    { time: '19:00', amount: 5.5, appetite: 'HIGH', temp: 29 },
    { time: '21:00', amount: 5.0, appetite: 'LOW', temp: 28 },
    { time: '23:00', amount: 0, appetite: 'NO FEEDING', temp: 27 },
    { time: '01:00', amount: 0, appetite: 'NO FEEDING', temp: 26 },
    { time: '03:00', amount: 0, appetite: 'NO FEEDING', temp: 27 }
  ];

  const growthData = [
    { week: 'Week 1', ABW: 0.5, biomass: 100, fcr: 0 }, { week: 'Week 2', ABW: 1.2, biomass: 240, fcr: 1.2 },
    { week: 'Week 3', ABW: 2.1, biomass: 420, fcr: 1.15 }, { week: 'Week 4', ABW: 3.5, biomass: 700, fcr: 1.1 },
    { week: 'Week 5', ABW: 5.2, biomass: 1040, fcr: 1.08 }, { week: 'Week 6', ABW: 7.1, biomass: 1420, fcr: 1.05 },
    { week: 'Week 7', ABW: 9.3, biomass: 1860, fcr: 1.03 }, { week: 'Week 8', ABW: 11.8, biomass: 2360, fcr: 1.02 },
    { week: 'Week 9', ABW: 14.5, biomass: 2900, fcr: 1.0 }, { week: 'Week 10', ABW: 17.2, biomass: 3440, fcr: 0.98 },
    { week: 'Week 11', ABW: 19.8, biomass: 3960, fcr: 0.97 }, { week: 'Week 12', ABW: 22.3, biomass: 4460, fcr: 0.95 }
  ];

  const feedConsumptionData = [
    { cycle: 'Cycle 1', dispensed: 5.1, consumed: 4.9, wasted: 0.2 }, { cycle: 'Cycle 2', dispensed: 5.3, consumed: 5.1, wasted: 0.2 },
    { cycle: 'Cycle 3', dispensed: 5.0, consumed: 4.7, wasted: 0.3 }, { cycle: 'Cycle 4', dispensed: 4.8, consumed: 4.6, wasted: 0.2 },
    { cycle: 'Cycle 5', dispensed: 5.2, consumed: 5.0, wasted: 0.2 }, { cycle: 'Cycle 6', dispensed: 5.4, consumed: 5.2, wasted: 0.2 },
    { cycle: 'Cycle 7', dispensed: 5.1, consumed: 4.9, wasted: 0.2 }, { cycle: 'Cycle 8', dispensed: 5.5, consumed: 5.3, wasted: 0.2 },
    { cycle: 'Cycle 9', dispensed: 5.0, consumed: 4.8, wasted: 0.2 }, { cycle: 'Cycle 10', dispensed: 4.7, consumed: 4.5, wasted: 0.2 },
    { cycle: 'Cycle 11', dispensed: 4.5, consumed: 4.3, wasted: 0.2 }, { cycle: 'Cycle 12', dispensed: 4.6, consumed: 4.4, wasted: 0.2 }
  ];

  const shrimpResponseData = [
    { time: '05:00', response: 95, feedRate: 100 }, { time: '07:00', response: 98, feedRate: 100 },
    { time: '09:00', response: 75, feedRate: 75 }, { time: '11:00', response: 65, feedRate: 65 },
    { time: '13:00', response: 92, feedRate: 95 }, { time: '15:00', response: 97, feedRate: 100 },
    { time: '17:00', response: 80, feedRate: 80 }, { time: '19:00', response: 99, feedRate: 100 },
    { time: '21:00', response: 70, feedRate: 70 }, { time: '23:00', response: 45, feedRate: 45 },
    { time: '01:00', response: 40, feedRate: 40 }, { time: '03:00', response: 55, feedRate: 55 }
  ];

  const feedDistribution = [
    { name: 'Starter', value: 25, color: '#10b981' },
    { name: 'Grower', value: 45, color: '#3b82f6' },
    { name: 'Finisher', value: 30, color: '#8b5cf6' }
  ];


  return (
    <div className="min-h-screen bg-white">

      {/* Hero Section with Image Slideshow */}
      <section className="relative h-[450px] md:h-[650px] w-full overflow-hidden">
        {heroImages.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
          >
            <Image
              src={image}
              alt={`Shrimp feeding ${index + 1}`}
              fill
              quality={100}
              priority={index === 0}
              sizes="100vw"
              className="object-cover"
              style={{ objectFit: 'cover' }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
          </div>
        ))}

        {/* Hero Content */}
        <div className="relative z-10 h-full flex items-center justify-center px-6">
          <div className="max-w-4xl text-center text-white">
            <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight drop-shadow-lg">
              Automated Smart Feeding System
            </h1>
            <p className="text-lg md:text-2xl mb-8 max-w-3xl mx-auto leading-relaxed drop-shadow-md">
              AI-powered acoustic technology that listens to your shrimp and feeds them exactly when they're hungry
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
               <Link href="/demo">
              <button className="px-8 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg shadow-lg transition-all transform hover:scale-105">
                Watch Demo
              </button>
              </Link>
              <Link href="/LearnMorePage">
              <button className="px-8 py-3 bg-white hover:bg-gray-100 text-cyan-600 font-semibold rounded-lg shadow-lg transition-all transform hover:scale-105">
                Learn More
              </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Slide Indicators */}
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
              <div className="text-4xl font-bold mb-2">35%</div>
              <div className="text-sm text-cyan-100">Feed Cost Reduction</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">85%</div>
              <div className="text-sm text-cyan-100">Survival Rate</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">12x</div>
              <div className="text-sm text-cyan-100">Daily Feedings</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">24/7</div>
              <div className="text-sm text-cyan-100">Monitoring</div>
            </div>
          </div>
        </div>
      </section>

      {/* Introduction */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">
            The Problem with Traditional Feeding
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed mb-12">
            Sri Lankan shrimp farms lose 30-40% of their feed through manual broadcasting.
            This leads to water pollution, disease outbreaks, and thousands of dollars in wasted costs annually.
          </p>

          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="text-center p-6 rounded-xl hover:shadow-lg transition-shadow">
              <div className="text-6xl mb-4">💸</div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Feed Waste</h3>
              <p className="text-gray-600">
                30-40% of feed is lost through overfeeding and poor timing
              </p>
            </div>
            <div className="text-center p-6 rounded-xl hover:shadow-lg transition-shadow">
              <div className="text-6xl mb-4">🦠</div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Water Pollution</h3>
              <p className="text-gray-600">
                Excess feed decomposes, causing ammonia spikes and disease
              </p>
            </div>
            <div className="text-center p-6 rounded-xl hover:shadow-lg transition-shadow">
              <div className="text-6xl mb-4">📉</div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Poor Growth</h3>
              <p className="text-gray-600">
                Inconsistent feeding slows shrimp development and reduces profits
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
              How Our System Works
            </h2>
            <p className="text-lg text-gray-600">
              Four simple steps to revolutionize your farm
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            <div className="flex gap-6 bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-cyan-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                  1
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900">Simple Input</h3>
                <p className="text-gray-600 leading-relaxed">
                  Create your batch by entering basic information: 
                  shrimp species, PL count, age, pond size, and survival rate.
                </p>
              </div>
            </div>

            <div className="flex gap-6 bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                  2
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900">Auto-Calculation</h3>
                <p className="text-gray-600 leading-relaxed">
                  The system calculates daily feed requirements, biomass, and feeding schedules based on 
                  your shrimp's age and growth stage on NAQDA guidelines.
                </p>
              </div>
            </div>

            <div className="flex gap-6 bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                  3
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900">AI Listening</h3>
                <p className="text-gray-600 leading-relaxed">
                  Hydrophone sensors capture underwater feeding sounds. Our CNN-based AI model
                  analyzes these sounds and determines if shrimp are hungry, satisfied, or full.
                </p>
              </div>
            </div>

            <div className="flex gap-6 bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                  4
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900">Smart Feeding</h3>
                <p className="text-gray-600 leading-relaxed">
                  Feed motor adjusts automatically: 100% speed when shrimp are hungry,
                  30-50% when slowing down, and stops completely when they're full.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Deep Dive */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">
                Advanced AI Technology
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Our system uses a Convolutional Neural Network (CNN) trained on 1,200+ audio samples
                to detect shrimp feeding patterns with 96% accuracy.
              </p>

              <div className="space-y-6">
                <div className="flex gap-4 p-5 rounded-xl bg-cyan-50 hover:bg-cyan-100 transition-colors">
                  <div className="flex-shrink-0">
                    <svg className="w-12 h-12 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-gray-900">Acoustic Detection</h3>
                    <p className="text-gray-600">
                      Hydrophone sensors capture shrimp clicking sounds during mastication,
                      enabling precise appetite detection.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-5 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors">
                  <div className="flex-shrink-0">
                    <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-gray-900">Real-Time Adjustment</h3>
                    <p className="text-gray-600">
                      The AI processes audio in 15-second chunks and classifies feeding activity into three states: 
                      hungry (HIGH), satisfied (LOW), or full (NO).
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-5 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors">
                  <div className="flex-shrink-0">
                    <svg className="w-12 h-12 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-gray-900">Deep Learning Model</h3>
                    <p className="text-gray-600">
                      Our CNN model uses mel-spectrogram analysis (128×469 features) to accurately 
                      classify feeding sounds and make intelligent feeding decisions.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-2xl p-8 shadow-2xl">
              <div className="bg-gray-800 rounded-xl p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-white font-bold">Live System Status</span>
                  <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-bold flex items-center gap-2">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                    ACTIVE
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors">
                    <div className="text-cyan-400 text-sm mb-1">Shrimp Age</div>
                    <div className="text-white text-2xl font-bold">30 Days</div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors">
                    <div className="text-blue-400 text-sm mb-1">PL Count</div>
                    <div className="text-white text-2xl font-bold">200,000</div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors">
                    <div className="text-purple-400 text-sm mb-1">Daily Feed</div>
                    <div className="text-white text-2xl font-bold">61.2 kg</div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors">
                    <div className="text-green-400 text-sm mb-1">Survival</div>
                    <div className="text-white text-2xl font-bold">85%</div>
                  </div>
                </div>

                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white text-sm font-bold">AI Analysis</span>
                    <span className="px-3 py-1 bg-green-500 text-white rounded-full text-xs font-bold">
                      HIGH APPETITE
                    </span>
                  </div>
                  <div className="h-24 flex items-end justify-between gap-1">
                    {[70, 85, 75, 90, 95, 88, 92, 87, 93, 90, 94, 91, 96, 93, 95].map((height, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-gradient-to-t from-cyan-500 to-blue-400 rounded-t hover:opacity-80 transition-opacity cursor-pointer"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                  <div className="text-gray-400 text-xs mt-3">
                    Confidence: 98.3%
                  </div>
                </div>
              </div>

              <div className="text-gray-400 text-sm">
                System processes acoustic data in real-time and adjusts feed dispensing automatically
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Shrimp Varieties */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Shrimp Varieties We Support
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Optimized feeding programs tailored for commonly cultured shrimp species
              in commercial aquaculture systems.
            </p>
          </div>

          {/* Cards */}
          <div className="grid md:grid-cols-3 gap-10">
            {shrimpVarieties.map((shrimp, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl overflow-hidden shadow-lg 
                     hover:shadow-2xl transition-all duration-300"
              >
                {/* Image */}
                <div className="h-56">
                  <img
                    src={shrimp.image}
                    alt={shrimp.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-2xl font-bold mb-1">{shrimp.name}</h3>
                  <p className="italic text-sm text-gray-500 mb-4">
                    {shrimp.scientific}
                  </p>

                  {/* Features */}
                  <h4 className="font-bold mb-2">Key Features</h4>
                  <ul className="space-y-2 mb-6">
                    {shrimp.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center text-gray-600 text-sm">
                        <svg
                          className="w-5 h-5 text-green-500 mr-2"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <div className="text-sm text-gray-500">Growth Rate</div>
                      <div className="font-bold text-cyan-600">
                        {shrimp.growthRate}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Harvest Size</div>
                      <div className="font-bold text-cyan-600">
                        {shrimp.harvestSize}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Feed Types */}
      <section className="py-24 px-6 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-6xl mx-auto">

          {/* Section Header */}
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4 text-gray-900">
              Feed Types & Nutrition Strategy
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Scientifically balanced feed formulations tailored to each shrimp growth stage,
              ensuring optimal growth, low FCR, and minimal waste.
            </p>
          </div>

          {/* Feed Cards */}
          <div className="grid md:grid-cols-3 gap-10">
            {feedTypes.map((feed, i) => (
              <div
                key={i}
                className={`${feed.color} border-2 rounded-2xl p-8 transition-all duration-300 
          hover:shadow-2xl hover:-translate-y-2`}
              >
                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-1">{feed.type}</h3>
                  <span className="inline-block text-xs font-semibold text-gray-600 bg-white/60 px-3 py-1 rounded-full">
                    Growth Stage {i + 1}
                  </span>
                </div>
                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-3">{feed.type}</h3>

                  <div className="relative w-full h-40 rounded-xl overflow-hidden bg-white shadow-inner">
                    <Image
                      src={feed.image}
                      alt={`${feed.type} shrimp feed`}
                      fill
                      className="object-cover"
                      priority={i === 0}
                    />
                  </div>
                </div>


                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Age Range</span>
                    <span className="font-bold">{feed.age}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Protein Content</span>
                    <span className="font-bold">{feed.protein}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pellet Size</span>
                    <span className="font-bold">{feed.pelletSize}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Daily Frequency</span>
                    <span className="font-bold">{feed.frequency}</span>
                  </div>
                </div>

                {/* Highlight */}
                <div className="mt-6 p-3 rounded-lg bg-white/70 text-sm text-gray-700">
                  Optimized for high digestibility and low feed waste
                </div>
              </div>
            ))}
          </div>

          {/* Feed Distribution Chart */}
          <div className="mt-24 bg-white rounded-2xl shadow-2xl p-10">

            {/* Header */}
            <div className="text-center mb-10">
              <h3 className="text-3xl md:text-4xl font-bold mb-3">
                Feed Distribution Across Growth Cycle
              </h3>
              <p className="text-gray-600 max-w-3xl mx-auto">
                AI analysis shows how feed consumption changes as shrimp grow,
                helping optimize cost, nutrition, and feeding efficiency.
              </p>
            </div>

            {/* Key Insights */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-6 text-center">
                <div className="text-sm text-gray-500 mb-1">Highest Feed Demand</div>
                <div className="text-xl font-bold text-cyan-700">Finisher Stage</div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                <div className="text-sm text-gray-500 mb-1">Most Cost-Sensitive Stage</div>
                <div className="text-xl font-bold text-green-700">Grower Stage</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
                <div className="text-sm text-gray-500 mb-1">Lowest Feed Quantity</div>
                <div className="text-xl font-bold text-blue-700">Starter Stage</div>
              </div>
            </div>

            {/* Chart */}
            <div className="flex justify-center">
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={feedDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    dataKey="value"
                  >
                    {feedDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* Feed Brands */}
      <div className="mt-16 bg-white rounded-2xl shadow-xl p-8">
        <h3 className="text-2xl font-bold mb-6 text-center">
          Feed Brands Available in Sri Lanka
        </h3>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Imported Brands */}
          <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
            <h4 className="font-bold text-lg mb-4 text-gray-900">
              Imported Feed Brands
            </h4>
            <ul className="space-y-3">
              {[
                { name: 'CP Feeds', desc: 'From Thailand - Leading Asian aquaculture feed producer' },
                { name: 'Grobest Feeds', desc: 'From India/Taiwan - High-quality formulations' },
                { name: 'BioMar', desc: 'European premium feeds - Sustainable formulations' },
                { name: 'Skretting / Cargill', desc: 'Global leaders from Vietnam/India' }
              ].map((brand, idx) => (
                <li key={idx} className="flex items-start">
                  <span className="mr-3 text-blue-600">✔</span>
                  <div>
                    <span className="font-semibold">{brand.name}</span>
                    <p className="text-sm text-gray-600">{brand.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Local Distribution */}
          <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
            <h4 className="font-bold text-lg mb-4 text-gray-900">
              Local Distribution & Plans
            </h4>
            <ul className="space-y-3">
              {[
                { name: 'Taprobane Seafood Group', desc: 'Building local feed mills' },
                { name: 'Mahesh Aqua Holdings', desc: 'Exclusive distributor for premium feeds' },
                { name: 'NAQDA Initiative', desc: 'Promoting local feed production' }
              ].map((dist, idx) => (
                <li key={idx} className="flex items-start">
                  <span className="mr-3 text-green-600">✔</span>
                  <div>
                    <span className="font-semibold">{dist.name}</span>
                    <p className="text-sm text-gray-600">{dist.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Feeding Schedule */}
      <section className="py-24 px-6 bg-gradient-to-br from-blue-50 to-cyan-50">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              24-Hour Feeding Schedule
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Feeding quantities are dynamically adjusted based on shrimp appetite,
              water temperature, and time of day.
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
              <div className="text-sm text-gray-500 mb-2">Total Daily Feed</div>
              <div className="text-3xl font-bold text-cyan-600">61.2 kg</div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
              <div className="text-sm text-gray-500 mb-2">Feeding Cycles</div>
              <div className="text-3xl font-bold text-cyan-600">12 Times</div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
              <div className="text-sm text-gray-500 mb-2">Peak Feeding Period</div>
              <div className="text-3xl font-bold text-green-600">Night</div>
            </div>
          </div>

          {/* Feeding Timeline */}
          <div className="bg-white rounded-2xl shadow-xl p-10">
            <h3 className="text-2xl font-bold mb-6 text-center">
              Feeding Timeline (Day → Night)
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {feedingSchedule.map((schedule, i) => (
                <div
                  key={i}
                  className={`text-center p-4 rounded-xl border 
          ${schedule.appetite === 'HIGH'
                      ? 'bg-green-50 border-green-200'
                      : schedule.appetite === 'LOW'
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-red-50 border-red-200'}`}
                >
                  <div className="text-xs text-gray-500 mb-1">{schedule.time}</div>

                  <div className="text-2xl font-bold text-gray-800 mb-1">
                    {schedule.amount > 0 ? `${schedule.amount} kg` : 'No Feed'}
                  </div>

                  <div
                    className={`inline-block text-xs font-bold px-3 py-1 rounded-full mb-2
            ${schedule.appetite === 'HIGH'
                        ? 'bg-green-100 text-green-700'
                        : schedule.appetite === 'LOW'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'}`}
                  >
                    {schedule.appetite}
                  </div>

                  <div className="text-xs text-gray-500">
                    Water Temp: {schedule.temp}°C
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-6 mt-8 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-400 rounded-full"></span>
                High Appetite
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
                Low Appetite
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-400 rounded-full"></span>
                No Feeding
              </div>
            </div>
          </div>
          </div>
      </section>

      {/* Shrimp Response */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Feed Dispensing Follows Shrimp Response</h2>
            <p className="text-lg text-gray-600">Real-time correlation between shrimp appetite and feed rate</p>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={shrimpResponseData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="response" stroke="#06b6d4" strokeWidth={3} name="Shrimp Response" />
                <Line type="monotone" dataKey="feedRate" stroke="#3b82f6" strokeWidth={3} name="Feed Rate" />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-6 text-center text-sm text-gray-600">System automatically adjusts feed dispensing rate based on real-time shrimp feeding activity</div>
          </div>
        </div>
      </section>

      {/* Feed Consumption Per Cycle */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Detailed Feed Data Per Cycle</h2>
            <p className="text-lg text-gray-600">Track exactly how much feed is dispensed and consumed</p>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={feedConsumptionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="cycle" />
                <YAxis label={{ value: 'Feed (kg)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="dispensed" fill="#3b82f6" name="Dispensed" />
                <Bar dataKey="consumed" fill="#10b981" name="Consumed" />
                <Bar dataKey="wasted" fill="#ef4444" name="Wasted" />
              </BarChart>
            </ResponsiveContainer>
            <div className="grid md:grid-cols-3 gap-6 mt-8">
              <div className="text-center p-4 bg-blue-50 rounded-xl"><div className="text-3xl font-bold text-blue-600">61.2 kg</div><div className="text-sm text-gray-600 mt-2">Total Dispensed</div></div>
              <div className="text-center p-4 bg-green-50 rounded-xl"><div className="text-3xl font-bold text-green-600">58.7 kg</div><div className="text-sm text-gray-600 mt-2">Total Consumed</div></div>
              <div className="text-center p-4 bg-red-50 rounded-xl"><div className="text-3xl font-bold text-red-600">2.5 kg</div><div className="text-sm text-gray-600 mt-2">Total Wasted (4.1%)</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* ABW Growth & Biomass */}
      <section className="py-20 px-6 bg-gradient-to-br from-cyan-50 to-blue-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">ABW Growth & Biomass Analysis</h2>
            <p className="text-lg text-gray-600">Comprehensive growth tracking with biomass estimates</p>
          </div>
          <div className="flex justify-center gap-4 mb-8 flex-wrap">
            {[{ id: 'growth', label: 'ABW Growth' }, { id: 'biomass', label: 'Biomass Estimates' }, { id: 'fcr', label: 'FCR Trends' }].map((tab) => (
              <button key={tab.id} onClick={() => setActiveChartTab(tab.id)} className={`px-8 py-3 rounded-lg font-semibold transition-all ${activeChartTab === tab.id ? 'bg-cyan-600 text-white shadow-lg' : 'bg-white text-gray-700'}`}>{tab.label}</button>
            ))}
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {activeChartTab === 'growth' && (
              <>
                <h3 className="text-2xl font-bold mb-6">Average Body Weight (ABW) Growth</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={growthData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis label={{ value: 'ABW (grams)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="ABW" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.6} name="Average Body Weight (g)" />
                  </AreaChart>
                </ResponsiveContainer>
              </>
            )}
            {activeChartTab === 'biomass' && (
              <>
                <h3 className="text-2xl font-bold mb-6">Biomass Estimates Over Time</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={growthData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis label={{ value: 'Biomass (kg)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="biomass" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Total Biomass (kg)" />
                  </AreaChart>
                </ResponsiveContainer>
              </>
            )}
            {activeChartTab === 'fcr' && (
              <>
                <h3 className="text-2xl font-bold mb-6">Feed Conversion Ratio (FCR) Trends</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={growthData.filter(d => d.fcr > 0)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis domain={[0.9, 1.3]} label={{ value: 'FCR', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="fcr" stroke="#8b5cf6" strokeWidth={3} name="FCR (lower is better)" />
                  </LineChart>
                </ResponsiveContainer>
                <div className="mt-6 p-4 bg-purple-50 rounded-xl border border-purple-200">
                  <p className="text-sm text-gray-700"><strong>Current FCR: 0.95</strong> - Excellent! This means you need only 0.95kg of feed to produce 1kg of shrimp. Industry average is 1.3-1.5.</p>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-6 bg-gradient-to-br from-cyan-50 to-blue-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">Real Results for Sri Lankan Farms</h2>
            <p className="text-lg text-gray-600">Proven technology addressing local challenges</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: 'Reduce Feed Costs by 20-35%', desc: 'Critical savings when feed costs have doubled and most feed is imported from Vietnam/India/Thailand', icon: '💰' },
              { title: 'Better Disease Management', desc: 'Cleaner water conditions help prevent yellowhead and white spot diseases that devastated monodon farms', icon: '🛡️' },
              { title: 'Survival Rates up to 85%', desc: 'Optimal feeding reduces stress and disease, especially important during transition to Vannamei', icon: '📈' },
              { title: 'Lower Labor & Energy Costs', desc: 'Automated system reduces manual feeding and generator usage, addressing Sri Lanka\'s high energy costs', icon: '⚡' },
              { title: 'Works for Both Species', desc: 'Optimized feeding programs for both Vannamei (now dominant) and Black Tiger (traditional)', icon: '🦐' },
              { title: 'Scale from Small to Large', desc: 'Suitable for farms from 0.5 hectares to large commercial operations in Puttalam, Mannar, Batticaloa', icon: '📏' }
            ].map((benefit, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1">
                <div className="text-4xl mb-4">{benefit.icon}</div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">{benefit.title}</h3>
                <p className="text-gray-600 leading-relaxed text-sm">{benefit.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 p-6 bg-white rounded-xl shadow-lg border-l-4 border-cyan-600">
            <div className="flex items-start">
              <svg className="w-8 h-8 text-cyan-600 mr-4 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="font-bold text-lg mb-2 text-gray-900">Supporting Sri Lanka's Aquaculture Growth</h4>
                <p className="text-gray-700 leading-relaxed">Sri Lanka aims to increase shrimp production from 20,000 MT to 50,000 MT in coming years. Our smart feeding system helps farmers maximize returns while meeting NAQDA's Best Management Practices (BMPs) for sustainable, export-quality production. Perfect for Puttalam, Mannar, Batticaloa, and emerging regions.</p>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* CTA */}
      <section className="py-20 px-6 bg-gradient-to-r from-cyan-600 to-blue-700">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Transform Your Farm?
          </h2>
          <p className="text-xl mb-10 text-cyan-100">
            Join Sri Lankan farmers who are saving costs and improving yields with smart feeding technology
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