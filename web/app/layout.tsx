import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '../components/Header';
import Footer from '../components/Footer';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-inter',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0891b2',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://aquanext.vercel.app'),
  title: {
    default: 'AquaNext – AI-Powered Shrimp Farming in Sri Lanka',
    template: '%s | AquaNext',
  },
  description:
    'AquaNext revolutionises shrimp farming in Sri Lanka with real-time water quality monitoring, AI-powered feeding, disease detection, and an intelligent farm assistant.',
  keywords: [
    'shrimp farming',
    'aquaculture',
    'AI monitoring',
    'Sri Lanka',
    'water quality',
    'automated feeding',
    'disease detection',
    'AquaNext',
  ],
  authors: [{ name: 'AquaNext Team – SLIIT Malabe' }],
  openGraph: {
    type: 'website',
    locale: 'en_LK',
    siteName: 'AquaNext',
    title: 'AquaNext – AI-Powered Shrimp Farming',
    description:
      'Real-time monitoring, AI feeding, and disease detection for Sri Lankan shrimp farms.',
    images: [{ url: '/hero/view-fish-farms-scotland-united-kingdom.jpg', width: 1200, height: 630, alt: 'AquaNext Shrimp Farm' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AquaNext – AI-Powered Shrimp Farming',
    description: 'Real-time monitoring, AI feeding, and disease detection for Sri Lankan shrimp farms.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-white text-slate-900 antialiased">
        <Header />
        <main className="pt-16">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
