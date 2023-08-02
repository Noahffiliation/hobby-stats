import './globals.css'
import { Providers } from "./providers";

export const metadata = {
  title: 'Hobby Stats'
}

export default function RootLayout({ children }) {
  return (
		<html lang="en" className='dark'>
      <body>
				<Providers>
					{children}
				</Providers>
			</body>
    </html>
  )
}
