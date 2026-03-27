'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CldVideoPlayer } from 'next-cloudinary';
import 'next-cloudinary/dist/cld-video-player.css';

/* ─── Data ─────────────────────────────────────────────── */
const stats = [
  { value: 30, suffix: '%', label: 'Yield Increase', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
  { value: 50, suffix: '%', label: 'Feed Cost Reduction', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { value: 24, suffix: '/7', label: 'Monitoring', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' },
  { value: 95, suffix: '%', label: 'Disease Prevention', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
];

const benefits = [
  { title: 'Real-Time Monitoring', description: 'Instant alerts on water quality parameters—pH, oxygen, ammonia—ensuring optimal conditions 24/7.', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', color: 'from-cyan-500 to-blue-600' },
  { title: 'Cost Efficiency', description: 'Reduce feed waste and operational costs with AI-powered optimisation that learns from your farm.', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'from-green-500 to-emerald-600' },
  { title: 'Disease Prevention', description: 'Early detection and prevention of diseases before they impact your harvest—up to 95% accuracy.', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z', color: 'from-red-500 to-pink-600' },
  { title: 'Sustainable Farming', description: 'Eco-friendly practices that reduce environmental impact while maximising yield per litre of water.', icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'from-teal-500 to-green-600' },
  { title: 'Data-Driven Insights', description: 'Comprehensive analytics and reports to make informed farming decisions backed by real data.', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', color: 'from-violet-500 to-purple-600' },
  { title: 'Expert Support', description: 'Access to aquaculture experts and continuous AI model improvements shaped by real farm data.', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', color: 'from-orange-500 to-amber-600' },
];

const processSteps = [
  { step: '01', title: 'Installation', description: 'Quick sensor setup at your farm ponds—no technical expertise required.', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  { step: '02', title: 'Data Collection', description: 'Continuous monitoring of water quality, feeding patterns, and shrimp health metrics.', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { step: '03', title: 'AI Analysis', description: 'Advanced algorithms process data streams and surface actionable, ranked insights.', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { step: '04', title: 'Optimisation', description: 'Automated adjustments and smart recommendations for maximum efficiency and yield.', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
];

const features = [
  { link: '/waterqualitymonitoring', color: 'from-cyan-500 to-blue-600', title: 'Water Quality Monitoring', desc: 'pH, oxygen, ammonia, temperature—24/7 real-time monitoring with instant alerts.', icon: 'M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z' },
  { link: '/feeding', color: 'from-green-500 to-emerald-600', title: 'Automated Feed System', desc: 'AI-powered feeding reduces waste by up to 50% and optimises schedules for growth.', icon: 'M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z' },
  { link: '/disease-detection', color: 'from-red-500 to-pink-600', title: 'Disease Identifier', desc: 'Early AI detection of diseases and pathogens—95% accuracy before visible symptoms.', icon: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z' },
  { link: '/ai-assistant', color: 'from-purple-500 to-indigo-600', title: 'AI Agent', desc: 'Your intelligent assistant providing insights, recommendations, and automations.', icon: 'M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z' },
];

const heroImages = [
  '/hero/view-fish-farms-scotland-united-kingdom.jpg',
  '/hero/2.jpg',
  '/hero/3.jpg',
];

const researchTopics = [
  { title: 'Sustainable Practices', tag: 'Sustainability' },
  { title: 'AI in Aquaculture', tag: 'Technology' },
  { title: 'Global Market Trends', tag: 'Market' },
  { title: 'Disease Management', tag: 'Health' },
];

/* ─── Animated Counter ─────────────────────────────────── */
function AnimatedCounter({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 1500;
          const steps = 40;
          const inc = target / steps;
          let current = 0;
          const timer = setInterval(() => {
            current = Math.min(current + inc, target);
            setCount(Math.round(current));
            if (current >= target) clearInterval(timer);
          }, duration / steps);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return <div ref={ref}>{count}{suffix}</div>;
}

/* ─── Page ─────────────────────────────────────────────── */
export default function EnhancedHome() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setCurrentSlide(p => (p + 1) % heroImages.length), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-white text-slate-900">

      {/* ── HERO ── */}
      <section className="relative h-[380px] sm:h-[500px] md:h-[640px] w-full overflow-hidden" aria-label="Hero">
        {heroImages.map((img, i) => (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-1000 ${i === currentSlide ? 'opacity-100' : 'opacity-0'}`}
          >
            <Image src={img} alt={`Shrimp farming view ${i + 1}`} fill className="object-cover" priority={i === 0} />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
          </div>
        ))}

        <div className="relative z-10 h-full flex items-center justify-center px-4 text-center">
          <div className="max-w-4xl">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/90 text-xs sm:text-sm font-medium mb-6 animate-fadeInUp">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Powered by Advanced AI Technology
            </span>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-white mb-5 leading-tight animate-fadeInUp delay-100 drop-shadow-xl">
              AI-Powered Shrimp Farming<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300">
                in Sri Lanka
              </span>
            </h1>
            <p className="text-sm sm:text-lg md:text-xl text-white/85 max-w-2xl mx-auto mb-8 animate-fadeInUp delay-200 leading-relaxed">
              Revolutionising Sri Lankan shrimp farms with real-time water quality monitoring, smart AI feeding, disease detection, and an intelligent assistant.
            </p>
            <div className="flex gap-3 md:gap-4 justify-center flex-wrap animate-fadeInUp delay-300">
              <Link href="/about" className="px-7 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-cyan-500/40 hover:shadow-xl transition-all hover:-translate-y-0.5 text-sm sm:text-base">
                Learn More
              </Link>
              <Link href="/contact" className="px-7 py-3 bg-white/10 backdrop-blur-md border border-white/30 text-white hover:bg-white/20 font-semibold rounded-xl transition-all hover:-translate-y-0.5 text-sm sm:text-base">
                Contact Us
              </Link>
            </div>
          </div>
        </div>

        {/* Slide dots */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {heroImages.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${i === currentSlide ? 'w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/60'}`}
            />
          ))}
        </div>


      </section>

      {/* ── INTRO VIDEO ── */}
      <section className="relative py-20 sm:py-32 bg-slate-950 overflow-hidden">
        {/* Background Decorative Elements for Cinematic Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/40 via-slate-950 to-slate-950" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-600/10 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-600/10 blur-[100px] rounded-full mix-blend-screen pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10 flex flex-col items-center">
          <div className="text-center mb-12 sm:mb-16 w-full">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold tracking-widest uppercase mb-6 shadow-[0_0_15px_rgba(6,182,212,0.2)] backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              Platform Introduction
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 tracking-tight">
              Watch Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Introduction</span>
            </h2>
            <p className="text-slate-300 text-base sm:text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
              Discover how AquaNext is revolutionising shrimp farming with cutting-edge AI technology,
              real-time IoT monitoring, and sustainable intelligent practices.
            </p>
          </div>

          <div className="relative w-full max-w-6xl mx-auto rounded-3xl overflow-hidden shadow-[0_0_60px_-15px_rgba(6,182,212,0.5)] ring-1 ring-white/20 group">
            {/* Inner glow on hover */}
            <div className="absolute inset-0 ring-inset ring-2 ring-white/10 rounded-3xl group-hover:ring-cyan-400/30 transition-all duration-500 z-20 pointer-events-none" />

            <div className="w-full bg-black aspect-video relative">
              <CldVideoPlayer
                width="1920"
                height="1080"
                src="AQUANEXT_1_spcg1e"
                colors={{ accent: '#06b6d4', base: '#020617', text: '#ffffff' }}
                logo={false}
                fontFace="Inter"
                className="w-full h-full object-cover transform group-hover:scale-[1.02] transition-transform duration-700 ease-out"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 py-14 sm:py-20" aria-labelledby="features-heading">
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 rounded-full bg-cyan-50 text-cyan-700 text-xs font-semibold tracking-wide uppercase mb-3">Platform</span>
          <h2 id="features-heading" className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 mb-3">Our Core Features</h2>
          <p className="text-slate-500 text-sm sm:text-base max-w-2xl mx-auto">
            Comprehensive AI-powered solutions designed specifically for modern shrimp farming
          </p>
        </div>

        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <Link href={f.link} key={i} className="block group">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col h-full hover:shadow-xl hover:-translate-y-2 transition-all duration-300 cursor-pointer relative overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${f.color} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-300`} />
                <div className={`w-14 h-14 bg-gradient-to-br ${f.color} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-md`}>
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path d={f.icon} />
                  </svg>
                </div>
                <h2 className="text-base font-bold mb-2 text-slate-900 group-hover:text-cyan-600 transition-colors">{f.title}</h2>
                <p className="text-slate-500 text-sm leading-relaxed flex-grow">{f.desc}</p>
                <div className="mt-4 flex items-center text-cyan-600 font-semibold text-sm gap-1 group-hover:gap-2 transition-all">
                  <span>Learn more</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="bg-gradient-to-br from-cyan-600 via-blue-600 to-cyan-700 py-14 sm:py-20 px-5 sm:px-8 relative overflow-hidden" aria-labelledby="stats-heading">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
        </div>
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-12">
            <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold tracking-wide uppercase mb-3">Impact</span>
            <h2 id="stats-heading" className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-3">Results We&apos;re Targeting</h2>
            <p className="text-cyan-100 text-sm sm:text-base max-w-2xl mx-auto">
              How AquaNext is designed to transform shrimp farming across Sri Lanka
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 sm:gap-8">
            {stats.map((stat, idx) => (
              <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20 hover:bg-white/20 transition-all hover:scale-105">
                <div className="flex justify-center mb-3">
                  <svg className="w-9 h-9 text-cyan-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                  </svg>
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold text-white mb-1">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-cyan-100 text-xs sm:text-sm font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BENEFITS ── */}
      <section className="py-14 sm:py-20 px-5 sm:px-8 bg-white" aria-labelledby="benefits-heading">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block px-3 py-1 rounded-full bg-cyan-50 text-cyan-700 text-xs font-semibold tracking-wide uppercase mb-3">Why AquaNext</span>
            <h2 id="benefits-heading" className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 mb-3">Why Choose AquaNext?</h2>
            <p className="text-slate-500 text-sm sm:text-base max-w-2xl mx-auto">Comprehensive solutions designed to maximise your farm&apos;s potential</p>
          </div>
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {benefits.map((b, i) => (
              <div key={i} className="group bg-slate-50 hover:bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className={`w-12 h-12 bg-gradient-to-br ${b.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md`}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={b.icon} />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2 group-hover:text-cyan-700 transition-colors">{b.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{b.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-14 sm:py-20 px-5 sm:px-8 bg-gradient-to-b from-slate-50 to-white" aria-labelledby="process-heading">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block px-3 py-1 rounded-full bg-cyan-50 text-cyan-700 text-xs font-semibold tracking-wide uppercase mb-3">Process</span>
            <h2 id="process-heading" className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 mb-3">How It Works</h2>
            <p className="text-slate-500 text-sm sm:text-base max-w-2xl mx-auto">Simple, streamlined process to get your farm AI-powered in no time</p>
          </div>
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            {processSteps.map((step, idx) => (
              <div key={idx} className="relative group">
                <div className="bg-white rounded-2xl border-2 border-slate-200 group-hover:border-cyan-400 p-6 text-center hover:shadow-xl transition-all duration-300">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={step.icon} />
                      </svg>
                    </div>
                  </div>
                  <div className="absolute top-4 right-4 text-3xl font-black text-slate-100 select-none">{step.step}</div>
                  <h3 className="text-base font-bold text-slate-900 mb-2 group-hover:text-cyan-700 transition-colors">{step.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{step.description}</p>
                </div>
                {idx < processSteps.length - 1 && (
                  <div className="hidden lg:flex absolute top-1/2 -right-3 z-10 -translate-y-1/2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center shadow">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RESEARCH ── */}
      <section className="bg-slate-50 py-14 sm:py-20 px-5 sm:px-8" aria-labelledby="research-heading">
        <div className="max-w-5xl mx-auto text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-cyan-50 text-cyan-700 text-xs font-semibold tracking-wide uppercase mb-3">Knowledge Hub</span>
          <h2 id="research-heading" className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 mb-3">Shrimp Farming Research Insights</h2>
          <p className="text-slate-500 text-sm sm:text-base mb-10 max-w-2xl mx-auto">
            Explore sustainable practices, innovations, and global trends shaping the future of shrimp farming.
          </p>
          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 mb-10">
            {researchTopics.map((item, idx) => (
              <article key={idx} className="group bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-left">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-cyan-700 transition-colors">{item.title}</h3>
                  <span className="ml-3 px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-600 text-xs font-semibold shrink-0">{item.tag}</span>
                </div>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Learn how cutting-edge research is improving shrimp farming worldwide.
                </p>
              </article>
            ))}
          </div>
          <Link href="/insights" className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all">
            Explore All Research Articles
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-14 sm:py-20 px-5 sm:px-8 bg-gradient-to-br from-cyan-600 via-blue-700 to-cyan-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-white rounded-full -translate-y-1/2 blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto text-center relative">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-4">Ready to Transform Your Shrimp Farm?</h2>
          <p className="text-cyan-100 text-sm sm:text-base mb-8 max-w-2xl mx-auto">
            Join leading shrimp farmers in Sri Lanka who are already benefiting from AI-powered aquaculture solutions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact" className="px-8 py-3.5 bg-white text-cyan-700 font-semibold rounded-xl shadow-lg hover:shadow-white/30 hover:shadow-xl hover:-translate-y-0.5 transition-all">
              Get Started Today
            </Link>
            <Link href="/about" className="px-8 py-3.5 border-2 border-white/40 text-white hover:bg-white/10 font-semibold rounded-xl transition-all hover:-translate-y-0.5">
              Learn More
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
