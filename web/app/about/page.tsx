import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn about the AquaNext team — SLIIT undergraduates modernising Sri Lankan shrimp aquaculture with AI.',
};

const values = [
  { title: 'Innovation',     description: 'Pushing the frontiers of AI and IoT to solve real aquaculture challenges.',       icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', color: 'from-cyan-500 to-blue-600' },
  { title: 'Sustainability', description: 'Building solutions that protect marine ecosystems for future generations.',           icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'from-green-500 to-teal-600' },
  { title: 'Impact',         description: 'Delivering measurable results for farmers: higher yields, lower costs, safer harvests.', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6', color: 'from-orange-500 to-amber-600' },
  { title: 'Collaboration',  description: 'Working alongside farmers, researchers, and industry to co-create real solutions.',  icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', color: 'from-violet-500 to-purple-600' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">

      {/* ── Hero Banner ── */}
      <section className="relative bg-gradient-to-br from-cyan-600 via-blue-700 to-cyan-700 py-20 px-5 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto text-center relative">
          <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold tracking-wide uppercase mb-4">Our Story</span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
            About <span className="text-cyan-200">AquaNext</span>
          </h1>
          <p className="text-cyan-100 text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Our mission is to transform shrimp farming in Sri Lanka through advanced AI technology and sustainable innovation.
          </p>
        </div>
      </section>

      {/* ── Who We Are ── */}
      <section className="max-w-5xl mx-auto px-5 sm:px-8 py-16">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-block px-3 py-1 rounded-full bg-cyan-50 text-cyan-700 text-xs font-semibold tracking-wide uppercase mb-4">Who We Are</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-5">A Team of Passionate Innovators</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              We are a dedicated team of undergraduate students from <span className="font-semibold text-cyan-600">SLIIT Malabe</span>, specialising in Information Technology
              and driven to modernise aquaculture with real-time monitoring, AI-powered decision-making, and smart automation.
            </p>
            <p className="text-slate-600 leading-relaxed">
              Our diverse skill sets—spanning machine learning, IoT, full-stack development, and UI/UX—fuel our shared vision for
              profitable, sustainable, and efficient shrimp farms across Sri Lanka.
            </p>
          </div>
          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl border border-cyan-100 p-8 text-center">
            <div className="text-5xl font-extrabold text-cyan-600 mb-2">4</div>
            <div className="text-slate-700 font-semibold mb-4">Team Members</div>
            <div className="h-px bg-slate-200 my-4" />
            <div className="text-5xl font-extrabold text-blue-600 mb-2">4</div>
            <div className="text-slate-700 font-semibold mb-4">Core AI Modules</div>
            <div className="h-px bg-slate-200 my-4" />
            <div className="text-5xl font-extrabold text-indigo-600 mb-2">24/7</div>
            <div className="text-slate-700 font-semibold">Real-Time Monitoring</div>
          </div>
        </div>
      </section>

      {/* ── Our Project ── */}
      <section className="bg-slate-50 py-16 px-5 sm:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-cyan-50 text-cyan-700 text-xs font-semibold tracking-wide uppercase mb-3">The Project</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3">The AquaNext Platform</h2>
          </div>
          <p className="text-slate-600 leading-relaxed text-center max-w-3xl mx-auto">
            The <span className="font-semibold text-cyan-600">AI Shrimp Farming Project</span> introduces state-of-the-art solutions for water quality monitoring,
            automated feeding, disease detection, and a knowledgeable AI assistant. By empowering farmers with data-driven insights
            and automated systems, we aim to boost shrimp yields, minimise losses, and promote environmentally responsible practices.
          </p>
        </div>
      </section>

      {/* ── Our Values ── */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 py-16">
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 rounded-full bg-cyan-50 text-cyan-700 text-xs font-semibold tracking-wide uppercase mb-3">Our Values</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3">What Drives Us</h2>
          <p className="text-slate-500 text-sm sm:text-base max-w-2xl mx-auto">The principles that guide every line of code and every design decision we make</p>
        </div>
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v, i) => (
            <div key={i} className="group bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className={`w-12 h-12 bg-gradient-to-br ${v.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md`}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={v.icon} />
                </svg>
              </div>
              <h3 className="font-bold text-slate-900 mb-2 group-hover:text-cyan-700 transition-colors">{v.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{v.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Commitment ── */}
      <section className="bg-gradient-to-br from-cyan-600 to-blue-700 py-16 px-5">
        <div className="max-w-3xl mx-auto text-center">
          <svg className="w-10 h-10 text-cyan-300 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
          </svg>
          <blockquote className="text-xl sm:text-2xl font-semibold text-white mb-4 leading-relaxed">
            &ldquo;We believe in making technology accessible and impactful for all Sri Lankan shrimp farmers.&rdquo;
          </blockquote>
          <p className="text-cyan-100 text-sm sm:text-base">
            Through research, innovation, and collaboration, we strive to pave the way for a more prosperous and sustainable aquaculture industry.
          </p>
          <div className="mt-8">
            <span className="inline-block px-4 py-1.5 rounded-full bg-white/20 text-white text-sm font-medium">AquaNext Team – SLIIT Malabe</span>
          </div>
        </div>
      </section>

    </div>
  );
}
