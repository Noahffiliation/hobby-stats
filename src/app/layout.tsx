import './globals.css';
import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata: Metadata = {
  title: 'Hobby Stats | Media & Music Tracker',
  description: 'Personal media stats tracker for Trakt.tv movies, TV shows, and Last.fm scrobbles',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen w-full bg-zinc-950 text-zinc-100 antialiased flex flex-col items-center" suppressHydrationWarning>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
