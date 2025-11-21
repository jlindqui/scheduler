import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#1e40af',
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  title: {
    template: "%s | CBA Scheduling System",
    default: "CBA Scheduling System - Intelligent Workforce Scheduling",
  },
  description:
    "Intelligent workforce scheduling system for organizations with Collective Bargaining Agreements. AI-powered chat agent, schedule optimization, and CBA compliance.",
  keywords: [
    "scheduling",
    "workforce management",
    "collective agreements",
    "shift scheduling",
    "CBA compliance",
    "union scheduling",
    "staff scheduling",
    "healthcare scheduling",
    "time off management",
  ],
  authors: [{ name: "CBA Scheduling System" }],
  creator: "CBA Scheduling System",
  publisher: "CBA Scheduling System",
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
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "CBA Scheduling System",
    title: "CBA Scheduling System - Intelligent Workforce Scheduling",
    description: "Intelligent workforce scheduling for organizations with CBAs",
  },
  twitter: {
    card: "summary_large_image",
    title: "CBA Scheduling System - Intelligent Workforce Scheduling",
    description: "Intelligent workforce scheduling for organizations with CBAs",
  },
  alternates: {
    canonical: "/",
  },
  category: "Business Software",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
