import './globals.css'
import { Providers } from "./providers";
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata = {
  title: 'Hobby Stats'
}

export default function RootLayout({ children }) {
  return (
		<html lang="en" className='dark'>
      <body>
				<Providers>
					{children}
					<Analytics />
					<SpeedInsights />
				</Providers>
			</body>
    </html>
  )
}

RootLayout.propTypes = {
	children: PropTypes.node.isRequired
}
