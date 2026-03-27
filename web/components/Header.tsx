'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

const navLinks = [
  { href: '/',        label: 'Home' },
  { href: '/about',   label: 'About Us' },
  { href: '/contact', label: 'Contact Us' },
  { href: '/insights',label: 'Insights' },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-xl shadow-md border-b border-slate-100'
          : 'bg-white/60 backdrop-blur-md border-b border-white/40'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 flex items-center justify-between h-16">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group" aria-label="AquaNext Home">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 12c-2.67 0-5.03-1.37-6.4-3.45.03-2.12 4.27-3.3 6.4-3.3s6.37 1.18 6.4 3.3C15.03 14.63 12.67 16 10 16z"/>
            </svg>
          </span>
          <span className="text-xl font-extrabold tracking-tight text-slate-900">
            Aqua<span className="text-cyan-600">Next</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <ul className="hidden md:flex items-center gap-1" role="list">
          {navLinks.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="relative px-4 py-2 rounded-lg text-slate-600 hover:text-cyan-700 font-medium text-sm transition-colors duration-200 hover:bg-cyan-50 group"
              >
                {label}
                <span className="absolute bottom-1 left-4 right-4 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full" />
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/demo"
              className="ml-3 px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold shadow-md hover:shadow-lg hover:from-cyan-600 hover:to-blue-700 transition-all duration-200 hover:-translate-y-0.5"
            >
              Live Demo
            </Link>
          </li>
        </ul>

        {/* Mobile Hamburger */}
        <button
          id="mobile-menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
          className="md:hidden p-2 rounded-lg text-slate-600 hover:text-cyan-700 hover:bg-cyan-50 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile Dropdown */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          menuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <ul
          className="bg-white/95 backdrop-blur-xl border-t border-slate-100 px-6 py-4 flex flex-col gap-1 shadow-lg"
          role="list"
        >
          {navLinks.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-700 hover:text-cyan-700 hover:bg-cyan-50 font-medium transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                {label}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/demo"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center mt-2 px-4 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold transition-all hover:opacity-90"
            >
              Live Demo
            </Link>
          </li>
        </ul>
      </div>
    </header>
  );
}