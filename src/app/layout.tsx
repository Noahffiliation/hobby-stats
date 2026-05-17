'use client'

import './globals.css'
import { Providers } from "./providers";
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { HeroUIProvider } from '@heroui/react';
	
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
		<HeroUIProvider>
			<html lang="en" className='dark'>
				<body suppressHydrationWarning>
					<Providers>
						{children}
						<Analytics />
						<SpeedInsights />
					</Providers>
				</body>
			</html>
		</HeroUIProvider>
  )
}
