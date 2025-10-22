'use client'

import './globals.css'
import { Providers } from "./providers";
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { HeroUIProvider } from '@heroui/react';
import PropTypes from 'prop-types';

export default function RootLayout({ children }) {
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

RootLayout.propTypes = {
	children: PropTypes.node.isRequired
}
