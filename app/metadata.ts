import type { Metadata } from 'next';

export const defaultMetadata: Metadata = {
  title: {
    default: 'Brown and Beatty Solutions | Labour Relations Software',
    template: '%s | Brown and Beatty Solutions'
  },
  description: 'Leading labour relations software for Canadian organizations. AI-powered grievance management, collective bargaining, union management, and workplace dispute resolution.',
  keywords: 'labour relations, labor relations, collective bargaining, union management, grievance management, workplace disputes, employment relations, industrial relations, Canadian labour law, Brown and Beatty Solutions, Brown and Beatty AI',
  authors: [{ name: 'Brown and Beatty Solutions' }],
  creator: 'Brown and Beatty Solutions',
  publisher: 'Brown and Beatty Solutions',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_CA',
    url: 'https://brownbeattyai.com',
    siteName: 'Brown and Beatty Solutions',
    title: 'Labour Relations Software | Brown and Beatty Solutions',
    description: 'AI-powered labour relations software for Canadian organizations. Streamline grievance management, collective bargaining, and workplace dispute resolution.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Brown and Beatty Solutions - Labour Relations Software',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Labour Relations Software | Brown and Beatty Solutions',
    description: 'AI-powered labour relations software for Canadian organizations.',
    images: ['/twitter-image.jpg'],
  },
  verification: {
    google: '86uVUsw70ElBIr8rbvOHbxS3_9tHdEFUEcPjdvIzdKY',
  },
};