'use client';

import { useEffect, useState } from 'react';
import { FaFacebookF, FaTwitter, FaLinkedinIn, FaGithub } from 'react-icons/fa';
import Link from 'next/link';

const quickLinks = [
  { href: '/',         label: 'Home' },
  { href: '/about',    label: 'About Us' },
  { href: '/feeding',  label: 'Feeding System' },
  { href: '/contact',  label: 'Contact' },
];

const featureLinks = [
  { href: '/feeding',              label: 'Automated Feeding' },
  { href: '/waterqualitymonitoring', label: 'Water Quality' },
  { href: '/disease-detection',    label: 'Disease Detection' },
  { href: '/ai-assistant',         label: 'AI Assistant' },
];

export default function Footer() {
  const [year, setYear] = useState<number | null>(null);
  useEffect(() => { setYear(new Date().getFullYear()); }, []);

  return (
    <footer className="relative bg-slate-900 text-slate-300 overflow-hidden">
      {/* Decorative top gradient bar */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />

      {/* Background glow blobs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 pt-14 pb-8">
        {/* Main grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-12">

          {/* Brand column */}
          <div className="md:col-span-5">
            <Link href="/" className="inline-flex items-center gap-2.5 group mb-5">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 12c-2.67 0-5.03-1.37-6.4-3.45.03-2.12 4.27-3.3 6.4-3.3s6.37 1.18 6.4 3.3C15.03 14.63 12.67 16 10 16z"/>
                </svg>
              </span>
              <div>
                <p className="text-lg font-extrabold text-white leading-none">
                  Aqua<span className="text-cyan-400">Next</span>
                </p>
                <p className="text-xs text-slate-400 font-medium tracking-wide">Smart Aquaculture</p>
              </div>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              Revolutionising shrimp farming in Sri Lanka through AI-powered monitoring,
              automated feeding systems, and intelligent disease detection for
              sustainable, profitable aquaculture.
            </p>

            {/* Social icons */}
            <div className="flex gap-3 mt-6">
              <SocialLink href="https://facebook.com" label="Facebook"  icon={<FaFacebookF />} />
              <SocialLink href="https://twitter.com"  label="Twitter"   icon={<FaTwitter />}   />
              <SocialLink href="https://linkedin.com" label="LinkedIn"  icon={<FaLinkedinIn />} />
              <SocialLink href="https://github.com"   label="GitHub"    icon={<FaGithub />}    />
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-3">
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-5">Quick Links</h4>
            <ul className="space-y-3">
              {quickLinks.map(({ href, label }) => (
                <FooterLink key={href} href={href}>{label}</FooterLink>
              ))}
            </ul>
          </div>

          {/* Features */}
          <div className="md:col-span-4">
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-5">Features</h4>
            <ul className="space-y-3">
              {featureLinks.map(({ href, label }) => (
                <FooterLink key={href} href={href}>{label}</FooterLink>
              ))}
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-sm">
            © {year ?? '2025'} AquaNext Project. All rights reserved.
          </p>
          <div className="flex gap-5 text-sm">
            <a href="/privacy" className="text-slate-500 hover:text-cyan-400 transition-colors">Privacy Policy</a>
            <a href="/terms"   className="text-slate-500 hover:text-cyan-400 transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="text-sm text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-2 group"
      >
        <svg className="w-3 h-3 text-slate-600 group-hover:text-cyan-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {children}
      </Link>
    </li>
  );
}

function SocialLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <a
      href={href}
      aria-label={label}
      target="_blank"
      rel="noopener noreferrer"
      className="w-9 h-9 bg-slate-800 hover:bg-gradient-to-br hover:from-cyan-500 hover:to-blue-600 text-slate-400 hover:text-white rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-lg"
    >
      {icon}
    </a>
  );
}
