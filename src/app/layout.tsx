'use client'

import './globals.css'
import { Providers } from "./providers";
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
		<html lang="en" className='dark'>
			<body suppressHydrationWarning>
				<Providers>
					{children}
					<Analytics />
					<SpeedInsights />
				</Providers>
			</body>
		</html>
  )
}
