'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { 
  AlertCircle, Shield, TrendingUp, Clock, Eye, Zap, 
  Camera, Brain, CheckCircle, Bell, Activity, Database,
  ArrowRight, X
} from 'lucide-react';
import Link from 'next/link';

type RiskApiResponse = {
  risk_level?: string
  risk_score?: number
  class_label?: string
  anomaly_score?: number
  anomaly_flag?: boolean
  saved_to_db?: boolean
  record_id?: string
  [k: string]: unknown
}

export default function DiseaseDetection() {
  const [expandedDisease, setExpandedDisease] = useState(0);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [risk, setRisk] = useState<RiskApiResponse | null>(null);
  const [riskLoading, setRiskLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const apiBase = useMemo(() => {
    return (process.env.NEXT_PUBLIC_DISEASE_API_BASE || 'http://localhost:8001').replace(/\/+$/, '');
  }, []);

  const diseases = [
    {
      name: 'White Spot Syndrome Virus (WSSV)',
      symptoms: ['White spots on shrimp shell', 'Lethargic swimming', 'Soft shell'],
      impact: 'Rapid mass mortality',
      mortality: '100% within 3-10 days',
    },
    {
      name: 'Early Mortality Syndrome (EMS)',
      symptoms: ['Slow growth', 'High mortality in early stages', 'Pale coloration'],
      impact: 'Mass death in post-larvae stage',
      mortality: 'Up to 90% in young shrimp',
    },
    {
      name: 'Yellow Head Disease',
      symptoms: ['Yellow discoloration', 'Lethargy', 'Rapid feeding cessation'],
      impact: 'Economic loss and farmer impact',
      mortality: '50-100% mortality rate',
    },
  ];

  const features = [
    {
      icon: <Camera className="w-8 h-8" />,
      title: 'Real-Time Disease Detection',
      description: 'Detect unhealthy shrimp as they swim near the camera. Instant identification of diseased specimens.',
    },
    {
      icon: <Bell className="w-8 h-8" />,
      title: 'Automated Alerts & Notifications',
      description: 'Instant alerts via dashboard and mobile notifications help farmers act immediately.',
    },
    {
      icon: <Activity className="w-8 h-8" />,
      title: 'Health Percentage Indicator',
      description: 'Overall tank health score with easy-to-understand visual indicators for quick assessment.',
    },
  ];

  const benefits = [
    'Early disease detection',
    'Reduced mortality rates',
    'Lower treatment costs',
    'Better yield and profitability',
    'Data-backed farm decisions',
    'Sustainable aquaculture practices',
  ];

  const whyChooseUs = [
    'AI-powered, not manual',
    'Continuous monitoring',
    'Works in real farm conditions',
    'Scalable and customizable',
    'Designed specifically for shrimp farms',
  ];

  function stopCamera() {
    const s = streamRef.current;
    if (s) {
      for (const t of s.getTracks()) t.stop();
    }
    streamRef.current = null;
    setCameraOn(false);
  }

  async function startCamera() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch (e: unknown) {
      stopCamera();
      setCameraError(e instanceof Error ? e.message : 'Failed to access camera');
    }
  }

  function buildDummyFeaturesFromFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    const w = 160;
    const h = 120;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, w, h);
    const img = ctx.getImageData(0, 0, w, h).data;

    // Cheap luminance mean/std as "activity" proxies.
    let sum = 0;
    let sumSq = 0;
    const n = w * h;
    for (let i = 0; i < img.length; i += 4) {
      const r = img[i]!;
      const g = img[i + 1]!;
      const b = img[i + 2]!;
      const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      sum += y;
      sumSq += y * y;
    }
    const mean = sum / n;
    const variance = Math.max(0, sumSq / n - mean * mean);
    const std = Math.sqrt(variance);
    const normMean = Math.min(1, Math.max(0, mean / 255));
    const normStd = Math.min(1, Math.max(0, std / 128));

    // Map into the model’s expected feature names (dummy but stable).
    const now = new Date().toISOString();
    return {
      activity_mean: 0.05 + 0.4 * normMean,
      activity_std: 0.01 + 0.15 * normStd,
      drop_ratio_min: 0.4 + 0.6 * (1 - normStd),
      abnormal_rate: 0.05 + 0.6 * normStd,
      feed_amount: 80 + 120 * normMean,
      feed_response: 0.2 + 0.7 * (1 - normStd),
      DO: 4.5 + 2.0 * (1 - normStd),
      temp: 27 + 5 * normMean,
      pH: 7.2 + 1.2 * (1 - normStd),
      salinity: 10 + 12 * normMean,
      pond_id: 'live-cam',
      timestamp: now,
    };
  }

  async function sendRiskOnce() {
    const payload = buildDummyFeaturesFromFrame();
    if (!payload) return;
    setRiskLoading(true);
    try {
      const res = await fetch(`${apiBase}/predict-risk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as RiskApiResponse;
      if (!res.ok) throw new Error((data as any)?.detail || `Request failed (${res.status})`);
      setRisk(data);
    } catch (e: unknown) {
      setCameraError(e instanceof Error ? e.message : 'Failed to fetch risk result');
    } finally {
      setRiskLoading(false);
    }
  }

  useEffect(() => {
    if (!cameraOn) return;
    const id = window.setInterval(() => {
      void sendRiskOnce();
    }, 1200);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOn]);

  useEffect(() => {
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/hero/view-fish-farms-scotland-united-kingdom.jpg"
            alt="Modern aquaculture farm with sustainable shrimp farming"
            fill
            className="object-cover"
            priority
          />
          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-900/80 via-blue-900/70 to-slate-900/80"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-slate-900/30"></div>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block bg-white/20 backdrop-blur-sm border border-white/30 px-4 py-2 rounded-full mb-4">
              <span className="text-white font-semibold text-sm">🦐 Smart Aquaculture</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 drop-shadow-lg">
              Shrimp Disease Detection System
            </h1>
            <p className="text-xl text-cyan-100 mb-4 drop-shadow-md">
              Smart, Early Detection for Sustainable Aquaculture
            </p>
            <p className="text-lg text-gray-100 max-w-3xl mx-auto leading-relaxed drop-shadow-md">
              Shrimp farming is one of the fastest-growing aquaculture industries in the world. However, 
              disease outbreaks—especially White Spot Syndrome Virus (WSSV)—continue to cause massive losses 
              to shrimp farmers every year.
            </p>
            <p className="text-lg text-cyan-200 font-semibold max-w-3xl mx-auto leading-relaxed mt-4 drop-shadow-md">
              Our AI-powered Shrimp Disease Detection System provides early, real-time disease identification, 
              helping farmers take action before outbreaks spread and destroy entire ponds.
            </p>
          </div>

          {/* Live Camera Risk Demo */}
          <div className="bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl p-5 sm:p-6 max-w-4xl mx-auto shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <div className="text-white font-bold text-lg">Live Camera → Risk Model Output</div>
                <div className="text-cyan-100 text-sm">
                  Uses dummy features from the live frame and calls <span className="font-semibold">`/predict-risk`</span>.
                </div>
              </div>
              <div className="flex gap-2">
                {!cameraOn ? (
                  <button
                    onClick={() => void startCamera()}
                    className="px-4 py-2 bg-cyan-500 text-white rounded-lg font-semibold hover:bg-cyan-400 transition-colors"
                  >
                    Start camera
                  </button>
                ) : (
                  <button
                    onClick={() => stopCamera()}
                    className="px-4 py-2 bg-white/20 text-white border border-white/30 rounded-lg font-semibold hover:bg-white/30 transition-colors"
                  >
                    Stop
                  </button>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl overflow-hidden bg-slate-900/40 border border-white/15">
                <video ref={videoRef} className="w-full h-[260px] object-cover" playsInline muted />
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <div className="rounded-xl bg-white/10 border border-white/15 p-4">
                {cameraError && (
                  <div className="text-red-100 bg-red-500/20 border border-red-200/30 rounded-lg p-3 mb-3 text-sm">
                    {cameraError}
                  </div>
                )}
                <div className="flex items-center justify-between mb-2">
                  <div className="text-white font-semibold">Latest prediction</div>
                  <div className="text-cyan-100 text-sm">{riskLoading ? 'Updating…' : cameraOn ? 'Live' : 'Idle'}</div>
                </div>
                {!risk ? (
                  <div className="text-cyan-100 text-sm">
                    {cameraOn ? 'Waiting for first result…' : 'Click “Start camera” to begin.'}
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-white">
                      <span className="text-cyan-100">Risk level</span>
                      <span className="font-bold">{String(risk.risk_level ?? risk.class_label ?? 'unknown').toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between text-white">
                      <span className="text-cyan-100">Risk score</span>
                      <span className="font-bold">{typeof risk.risk_score === 'number' ? `${Math.round(risk.risk_score)}%` : '—'}</span>
                    </div>
                    <div className="flex justify-between text-white">
                      <span className="text-cyan-100">Anomaly</span>
                      <span className="font-semibold">{risk.anomaly_flag ? 'YES' : 'NO'}</span>
                    </div>
                    <div className="flex justify-between text-white">
                      <span className="text-cyan-100">Saved to DB</span>
                      <span className="font-semibold">{risk.saved_to_db ? 'YES' : 'NO (dummy mode)'}</span>
                    </div>
                  </div>
                )}
                <div className="mt-3 text-xs text-cyan-100/90">
                  API base: <span className="font-mono text-cyan-50">{apiBase}</span>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
            <Link
              href="/demo"
              className="px-8 py-4 bg-cyan-500 text-white rounded-lg font-semibold hover:bg-cyan-400 transition-colors text-center shadow-lg backdrop-blur-sm"
            >
              Request a Demo
            </Link>
            <Link
              href="/contact"
              className="px-8 py-4 bg-white/20 backdrop-blur-sm text-white border-2 border-white/50 rounded-lg font-semibold hover:bg-white/30 transition-colors text-center shadow-lg"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* Global Impact Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 text-center">
            The Global Impact of Shrimp Diseases
          </h2>
          <p className="text-gray-600 text-center mb-12 text-lg">
            Understanding the scale and severity of aquaculture disease challenges
          </p>

          <div className="grid sm:grid-cols-3 gap-8 mb-12">
            <div className="bg-gradient-to-br from-red-50 to-red-100 p-8 rounded-xl">
              <p className="text-4xl font-bold text-red-600 mb-2">100%</p>
              <p className="text-gray-700 font-semibold">Mortality Rate within 3-10 days</p>
              <p className="text-gray-600 text-sm mt-2">White Spot Syndrome impact on infected ponds</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-8 rounded-xl">
              <p className="text-4xl font-bold text-orange-600 mb-2">$B</p>
              <p className="text-gray-700 font-semibold">Annual Industry Losses</p>
              <p className="text-gray-600 text-sm mt-2">Global shrimp industry due to disease outbreaks</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-8 rounded-xl">
              <p className="text-2xl font-bold text-purple-600 mb-2">SME Hardest Hit</p>
              <p className="text-gray-700 font-semibold">Small & Medium Farmers</p>
              <p className="text-gray-600 text-sm mt-2">Most vulnerable to disease outbreaks</p>
            </div>
          </div>

          <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded">
            <h3 className="font-semibold text-red-900 mb-3">Consequences of Late Detection:</h3>
            <ul className="space-y-2 text-red-800">
              <li>✗ Complete pond loss and financial ruin</li>
              <li>✗ Increased antibiotic usage and resistance</li>
              <li>✗ Environmental damage and ecosystem harm</li>
              <li>✗ Food insecurity and livelihood loss</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Common Diseases Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 text-center">
            Common Shrimp Diseases We Address
          </h2>
          <p className="text-gray-600 text-center mb-12 text-lg">
            Our system is designed to detect and track multiple diseases with planned expansion
          </p>

          <div className="space-y-4">
            {diseases.map((disease, index) => (
              <div key={index} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setExpandedDisease(expandedDisease === index ? -1 : index)}
                  className="w-full p-6 flex items-start justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="text-left">
                    <h3 className="text-xl font-semibold text-gray-900">{disease.name}</h3>
                    <p className="text-red-600 font-semibold mt-1">Impact: {disease.impact}</p>
                  </div>
                  <div className="text-gray-600 text-2xl">
                    {expandedDisease === index ? '−' : '+'}
                  </div>
                </button>
                {expandedDisease === index && (
                  <div className="px-6 pb-6 bg-gray-50 border-t">
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Symptoms:</h4>
                      <ul className="space-y-1">
                        {disease.symptoms.map((symptom, i) => (
                          <li key={i} className="text-gray-700">• {symptom}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Mortality Rate:</h4>
                      <p className="text-red-600 font-semibold">{disease.mortality}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-gray-600 mt-8 text-sm italic">
            Future expansion planned for EMS, Yellow Head Disease, and bacterial infections
          </p>
        </div>
      </section>

      {/* Traditional Detection Challenges */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Traditional Disease Detection Challenges
              </h2>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <Clock className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Time-Consuming</h3>
                    <p className="text-gray-600">Manual inspection or laboratory testing takes hours</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <AlertCircle className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Human Error</h3>
                    <p className="text-gray-600">Visual inspection misses early signs of disease</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <Eye className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Late Detection</h3>
                    <p className="text-gray-600">By the time symptoms are visible, disease spreads rapidly</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 p-8 rounded-xl">
              <p className="text-gray-700 mb-4">
                <strong>The Problem:</strong> Traditionally, disease detection relies on visual inspection or 
                laboratory testing. These methods are often time-consuming, expensive, and impractical for 
                continuous monitoring.
              </p>
              <p className="text-gray-700 font-semibold text-red-600">
                By the time symptoms are clearly visible, the disease may have already spread across the 
                entire tank, making it too late to save your harvest.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How Our AI System Works */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 text-center">
            How Our AI-Based Detection System Works
          </h2>
          <p className="text-gray-600 text-center mb-12 text-lg">
            Advanced computer vision powered by deep learning models
          </p>

          <div className="grid sm:grid-cols-4 gap-6 mb-12">
            {[
              { 
                icon: <Camera className="w-12 h-12" />,
                num: 1, 
                title: 'Camera Captures', 
                desc: 'Live video from underwater tanks' 
              },
              { 
                icon: <Brain className="w-12 h-12" />,
                num: 2, 
                title: 'AI Analysis', 
                desc: 'Deep learning models analyze in real-time' 
              },
              { 
                icon: <AlertCircle className="w-12 h-12" />,
                num: 3, 
                title: 'Disease Detection', 
                desc: 'Identifies diseased shrimp instantly' 
              },
              { 
                icon: <Bell className="w-12 h-12" />,
                num: 4, 
                title: 'Alert Farmer', 
                desc: 'Instant notification to take action' 
              },
            ].map((step, index) => (
              <div key={index} className="text-center relative">
                <div className="flex justify-center mb-4">
                  <div className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg hover:shadow-xl transition-shadow">
                    {step.icon}
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm">{step.desc}</p>
                {index < 3 && (
                  <div className="hidden sm:block absolute top-10 -right-3 animate-pulse">
                    <ArrowRight className="w-6 h-6 text-cyan-600" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="bg-white border border-cyan-200 rounded-lg p-8">
            <p className="text-gray-700 mb-4">
              <strong>Our Technology:</strong> Our system uses underwater cameras installed inside shrimp tanks 
              to continuously monitor shrimp behavior and appearance.
            </p>
            <p className="text-gray-700">
              Using advanced computer vision and deep learning models (YOLO / CNN), the system automatically 
              identifies signs of disease—such as white spot patterns and behavioral changes—while shrimps are 
              swimming naturally.
            </p>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 text-center">
            What We Offer (Core Features)
          </h2>
          <p className="text-gray-600 text-center mb-12 text-lg">
            Powerful tools designed for modern aquaculture
          </p>

          <div className="grid sm:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-gradient-to-br from-cyan-50 to-blue-50 p-8 rounded-lg border border-cyan-200 hover:shadow-lg transition-shadow">
                <div className="text-cyan-600 mb-4 bg-cyan-100 w-16 h-16 rounded-full flex items-center justify-center">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-700">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Before vs After Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 text-center">
            Before vs After Disease Detection System
          </h2>
          <p className="text-gray-600 text-center mb-12 text-lg">
            See how our system transforms farm management
          </p>

          <div className="grid sm:grid-cols-2 gap-8 mb-8">
            {/* Before */}
            <div className="border-2 border-red-300 rounded-xl overflow-hidden">
              <div className="bg-red-50 px-6 py-4 border-b-2 border-red-300">
                <h3 className="text-2xl font-bold text-red-600 flex items-center gap-2">
                  <X className="w-6 h-6" />
                  Without Our System
                </h3>
              </div>
              <div className="p-8 space-y-4">
                <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
                  <p className="font-semibold text-gray-900">Manual Monitoring Only</p>
                  <p className="text-gray-700 text-sm mt-1">Labor-intensive, error-prone visual inspections</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
                  <p className="font-semibold text-gray-900">Delayed Detection</p>
                  <p className="text-gray-700 text-sm mt-1">Disease spreads for days before symptoms are visible</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
                  <p className="font-semibold text-gray-900">High Losses</p>
                  <p className="text-gray-700 text-sm mt-1">Complete pond loss when outbreaks occur</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
                  <p className="font-semibold text-gray-900">Reactive Only</p>
                  <p className="text-gray-700 text-sm mt-1">No predictive insights or historical data analysis</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
                  <p className="font-semibold text-gray-900">Limited Records</p>
                  <p className="text-gray-700 text-sm mt-1">No comprehensive disease history or trends</p>
                </div>
              </div>
            </div>

            {/* After */}
            <div className="border-2 border-green-300 rounded-xl overflow-hidden">
              <div className="bg-green-50 px-6 py-4 border-b-2 border-green-300">
                <h3 className="text-2xl font-bold text-green-600 flex items-center gap-2">
                  <CheckCircle className="w-6 h-6" />
                  With Our AI System
                </h3>
              </div>
              <div className="p-8 space-y-4">
                <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                  <p className="font-semibold text-gray-900">24/7 AI Monitoring</p>
                  <p className="text-gray-700 text-sm mt-1">Continuous automated detection without manual labor</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                  <p className="font-semibold text-gray-900">Early Detection</p>
                  <p className="text-gray-700 text-sm mt-1">Spot diseases in early stages before spread occurs</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                  <p className="font-semibold text-gray-900">Reduced Losses</p>
                  <p className="text-gray-700 text-sm mt-1">Save up to 90% of your harvest through early intervention</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                  <p className="font-semibold text-gray-900">Preventive Management</p>
                  <p className="text-gray-700 text-sm mt-1">Data-driven insights for proactive farm decisions</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                  <p className="font-semibold text-gray-900">Historical Analytics</p>
                  <p className="text-gray-700 text-sm mt-1">Track trends and patterns across production cycles</p>
                </div>
              </div>
            </div>
          </div>

          {/* Comparison Stats */}
          <div className="grid sm:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-red-50 to-orange-50 rounded-lg">
              <p className="text-3xl font-bold text-red-600">3-10</p>
              <p className="text-sm text-gray-700 mt-2">Days until total loss (Manual)</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-blue-50 rounded-lg">
              <p className="text-3xl font-bold text-green-600">Hours</p>
              <p className="text-sm text-gray-700 mt-2">Early detection with AI</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-red-50 to-orange-50 rounded-lg">
              <p className="text-3xl font-bold text-red-600">100%</p>
              <p className="text-sm text-gray-700 mt-2">Potential loss</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-blue-50 rounded-lg">
              <p className="text-3xl font-bold text-green-600">90%</p>
              <p className="text-sm text-gray-700 mt-2">Potential savings</p>
            </div>
          </div>
        </div>
      </section>

      {/* Farm Gallery Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 text-center">
            Trusted by Shrimp Farmers Worldwide
          </h2>
          <p className="text-gray-600 text-center mb-12 text-lg">
            Our system in action on real farms
          </p>

          <div className="grid sm:grid-cols-3 gap-8">
            {/* Farm Image 1 */}
            <div className="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
              <div className="relative h-48">
                <Image
                  src="/farm-images/farm-monitoring.jpeg"
                  alt="Farm monitoring setup with underwater cameras"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="font-semibold text-gray-900 mb-2">Real-Time Tank Monitoring</h3>
                <p className="text-gray-600 text-sm">
                  Camera system installed for continuous disease monitoring across multiple tanks
                </p>
              </div>
            </div>

            {/* Farm Image 2 */}
            <div className="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
              <div className="relative h-48">
                <Image
                  src="/ai-assistant/ai-assistant-banner.png"
                  alt="AI assistant dashboard for farm management"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="font-semibold text-gray-900 mb-2">Live Disease Detection</h3>
                <p className="text-gray-600 text-sm">
                  Dashboard showing real-time analysis and detection results with visual alerts
                </p>
              </div>
            </div>

            {/* Farm Image 3 */}
            <div className="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
              <div className="relative h-48">
                <Image
                  src="/hero/view-fish-farms-scotland-united-kingdom.jpg"
                  alt="Modern shrimp farm with healthy aquaculture setup"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="font-semibold text-gray-900 mb-2">Healthy Harvest Achieved</h3>
                <p className="text-gray-600 text-sm">
                  Successful farm outcomes with early detection and preventive management
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 text-center">
            Tank Disease History & Analytics
          </h2>
          <p className="text-gray-600 text-center mb-12 text-lg">
            From reactive treatment to preventive farm management
          </p>

          <div className="grid sm:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-lg border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Database className="w-6 h-6 text-cyan-600" />
                What It Includes:
              </h3>
              <ul className="space-y-3">
                <li className="flex gap-3">
                  <CheckCircle className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Timeline of disease events per tank</span>
                </li>
                <li className="flex gap-3">
                  <CheckCircle className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Historical health percentage trends</span>
                </li>
                <li className="flex gap-3">
                  <CheckCircle className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Compare tanks and production cycles</span>
                </li>
                <li className="flex gap-3">
                  <CheckCircle className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Early warning patterns based on past data</span>
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 p-8 rounded-lg border border-cyan-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-cyan-600" />
                The Impact:
              </h3>
              <p className="text-gray-700 mb-4">
                This feature empowers farmers to move from <strong>reactive treatment to preventive farm management</strong>.
              </p>
              <p className="text-gray-700">
                With data-driven insights from your farm's disease history, you can make informed decisions about 
                feeding, water quality, and preventive measures before problems arise.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 text-center">
            Benefits to Shrimp Farmers
          </h2>
          <p className="text-gray-600 text-center mb-12 text-lg">
            Transform your farm with intelligent disease management
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex gap-4 p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                <Shield className="w-6 h-6 text-green-600 flex-shrink-0" />
                <p className="text-gray-800 font-medium">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 text-center">
            Why Choose Our System?
          </h2>
          <p className="text-gray-600 text-center mb-12 text-lg">
            What sets us apart from manual monitoring
          </p>

          <div className="grid sm:grid-cols-2 gap-8">
            {whyChooseUs.map((reason, index) => (
              <div key={index} className="flex gap-4 items-start">
                <Zap className="w-6 h-6 text-cyan-600 flex-shrink-0 mt-1" />
                <p className="text-gray-800 font-medium text-lg">{reason}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vision for Future */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-cyan-600 to-blue-700 text-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-center">
            🔮 Our Vision for the Future
          </h2>
          <p className="text-xl text-center mb-8 max-w-3xl mx-auto leading-relaxed">
            Our vision is to build a smart aquaculture ecosystem where disease outbreaks are 
            <strong> predicted before they occur</strong>.
          </p>
          <p className="text-lg text-center max-w-3xl mx-auto">
            By combining AI, real-time monitoring, and historical farm data, we aim to support farmers with 
            intelligent insights that improve productivity and sustainability across the shrimp farming industry.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8">
            Protect Your Shrimp Before It's Too Late
          </h2>
          <p className="text-xl text-gray-600 mb-12">
            Monitor smarter. Farm healthier. Join the future of intelligent aquaculture.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/demo"
              className="px-8 py-4 bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700 transition-colors"
            >
              Request a Demo
            </Link>
            <Link
              href="/LearnMorePage"
              className="px-8 py-4 bg-slate-100 text-cyan-600 rounded-lg font-semibold hover:bg-slate-200 transition-colors"
            >
              Learn More
            </Link>
            <Link
              href="/contact"
              className="px-8 py-4 bg-white text-cyan-600 border-2 border-cyan-600 rounded-lg font-semibold hover:bg-cyan-50 transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
