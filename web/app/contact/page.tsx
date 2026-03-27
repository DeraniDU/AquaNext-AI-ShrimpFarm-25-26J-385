import type { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with the AquaNext student team from SLIIT Malabe.',
};

const team = [
  { name: 'Deranindu Gunasekara', title: 'BSc (Hons) IT – SLIIT Malabe', email: 'deranindu@gmail.com',             phone: '+94 71 123 4567', img: '/hero/deranindu.jpeg' },
  { name: 'Raveen De Silva',      title: 'BSc (Hons) IT – SLIIT Malabe', email: 'rdesilva614@gmail.com',           phone: '+94 71 234 5678', img: '/hero/raveen.jpg' },
  { name: 'Samadi Senavirathne', title: 'BSc (Hons) IT – SLIIT Malabe', email: 'jithmisamadi2001@gmail.com',      phone: '+94 77 345 6789', img: '/hero/samadi.jpeg' },
  { name: 'Piyumali Palihawadana',title: 'BSc (Hons) IT – SLIIT Malabe', email: 'piyumalipalihawadana@gmail.com', phone: '+94 77 456 7890', img: '/hero/piyumali.png' },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">

      {/* ── Hero ── */}
      <section className="relative bg-gradient-to-br from-cyan-600 via-blue-700 to-cyan-700 py-20 px-5 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto text-center relative">
          <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold tracking-wide uppercase mb-4">Get In Touch</span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">Contact <span className="text-cyan-200">Our Team</span></h1>
          <p className="text-cyan-100 text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed">
            If you wish to collaborate, have questions, or want to learn more, feel free to reach out to our student team directly.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16">

        {/* ── Team Cards ── */}
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 rounded-full bg-cyan-50 text-cyan-700 text-xs font-semibold tracking-wide uppercase mb-3">Team</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">Our Student Team</h2>
          <p className="text-slate-500 text-sm sm:text-base">Four passionate IT undergraduates building the future of aquaculture</p>
        </div>

        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {team.map((member, idx) => (
            <div key={idx} className="group relative bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 overflow-hidden">
              {/* Gradient top bar */}
              <div className="h-1.5 bg-gradient-to-r from-cyan-400 to-blue-600" />

              <div className="p-6 flex flex-col items-center">
                {/* Avatar */}
                <div className="relative mb-4">
                  <div className="w-24 h-24 rounded-full ring-2 ring-slate-200 group-hover:ring-cyan-400 transition-all overflow-hidden">
                    <Image
                      src={member.img}
                      alt={`Profile photo of ${member.name}`}
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 text-center mb-1">{member.name}</h3>
                <p className="text-xs text-slate-500 text-center mb-5 leading-relaxed">{member.title}</p>

                {/* Contact CTA */}
                <div className="w-full flex flex-col gap-2.5 mt-auto">
                  <a
                    href={`mailto:${member.email}`}
                    className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl border border-cyan-200 text-cyan-700 text-xs font-medium hover:bg-cyan-600 hover:text-white hover:border-cyan-600 hover:shadow-md transition-all"
                  >
                    <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                    <span className="truncate">{member.email}</span>
                  </a>
                  <a
                    href={`tel:${member.phone.replace(/\s/g, '')}`}
                    className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-900 hover:text-white hover:border-slate-900 hover:shadow-md transition-all"
                  >
                    <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                    </svg>
                    <span>{member.phone}</span>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Get In Touch Box ── */}
        <div className="mt-16">
          <div className="bg-gradient-to-br from-slate-50 to-cyan-50 rounded-2xl border border-slate-200 p-8 sm:p-12 max-w-3xl mx-auto text-center">
            <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-3">Collaborate With Us</h3>
            <p className="text-slate-600 mb-6 text-sm sm:text-base leading-relaxed">
              We are available to discuss collaboration opportunities and answer questions about our automated shrimp pond monitoring system.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="mailto:deranindu@gmail.com"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all text-sm"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                Send Us a Message
              </a>
            </div>
            <p className="text-xs text-slate-400 mt-5">📍 SLIIT, Malabe Campus • Sri Lanka</p>
          </div>
        </div>

      </div>
    </div>
  );
}