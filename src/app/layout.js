import './globals.css'
import { Providers } from "./providers";
import { Analytics } from '@vercel/analytics/react';

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
				</Providers>
			</body>
    </html>
  )
}
