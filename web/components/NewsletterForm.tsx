'use client';

import { useState } from 'react';

export default function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    setMessage('');

    try {
      // POST to the Next.js API route
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to subscribe');
      }

      setStatus('success');
      setMessage('Welcome aboard! Check your inbox for the welcome email.');
      setEmail('');
    } catch (err: any) {
      console.error('Subscription error:', err);
      setStatus('error');
      setMessage(err.message || 'An error occurred. Please try again.');
    }
  };

  return (
    <div className="bg-gradient-to-br from-cyan-600 to-blue-600 rounded-xl p-8 md:p-12 text-center text-white relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-blue-900/20 blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Stay Updated with Latest Research
        </h2>
        <p className="text-cyan-50 mb-8 max-w-2xl mx-auto text-lg">
          Get weekly insights, research summaries, and industry updates delivered directly to your inbox.
        </p>
        
        <form onSubmit={handleSubmit} className="max-w-md mx-auto flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === 'loading' || status === 'success'}
            placeholder="Enter your email address"
            className="flex-1 px-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-75 disabled:cursor-not-allowed transition-all"
          />
          <button 
            type="submit"
            disabled={status === 'loading' || status === 'success'}
            className="bg-white text-cyan-600 px-6 py-3 rounded-lg font-semibold hover:bg-cyan-50 transition-colors whitespace-nowrap disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center min-w-[160px]"
          >
            {status === 'loading' ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-cyan-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Subscribing...
              </span>
            ) : status === 'success' ? (
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Subscribed!
              </span>
            ) : (
              'Subscribe Now'
            )}
          </button>
        </form>

        {/* Feedback Messages */}
        <div className="mt-3 h-6">
          {status === 'success' && (
            <p className="text-green-200 text-sm font-medium animate-fadeIn">{message}</p>
          )}
          {status === 'error' && (
            <p className="text-red-200 text-sm font-medium animate-fadeIn">{message}</p>
          )}
        </div>

        <p className="text-cyan-100 text-sm mt-3 border-t border-cyan-500/30 pt-4 max-w-xs mx-auto">
          Join over 5,000 researchers and industry professionals
        </p>
      </div>
    </div>
  );
}
