import { Navbar, NavbarContent, NavbarItem } from '@nextui-org/react'
import Link from 'next/link'

const Nav = () => {
	return (
		<Navbar>
			<NavbarContent>
				<NavbarItem>
					<Link href='/'>Home</Link>
				</NavbarItem>
				<NavbarItem>
					<Link href='/movies'>Movie Watchlist</Link>
				</NavbarItem>
				<NavbarItem>
					<Link href='/recent_movies'>Recently Watched Movies</Link>
				</NavbarItem>
				<NavbarItem>
					<Link href='/tv'>TV Watchlist</Link>
				</NavbarItem>
				<NavbarItem>
					<Link href='/recent_episodes'>Recently Watched TV Episodes</Link>
				</NavbarItem>
				<NavbarItem>
					<Link href='/lastfm'>Recent Tracks</Link>
				</NavbarItem>
			</NavbarContent>
		</Navbar>
	)
}

export default Nav
