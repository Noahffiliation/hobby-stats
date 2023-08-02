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
					<Link href='/games'>Games</Link>
				</NavbarItem>
				<NavbarItem>
					<Link href='/movies'>Movie Watchlist</Link>
				</NavbarItem>
				<NavbarItem>
					<Link href='/tv'>TV Watchlist</Link>
				</NavbarItem>
				<NavbarItem>
					<Link href='/letterboxd'>Recent Letterboxd Reviews</Link>
				</NavbarItem>
				<NavbarItem>
					<Link href='/episodes'>Recently Watched TV Episodes</Link>
				</NavbarItem>
				<NavbarItem>
					<Link href='/lastfm'>Recent Tracks</Link>
				</NavbarItem>
			</NavbarContent>
		</Navbar>
	)
}

export default Nav
