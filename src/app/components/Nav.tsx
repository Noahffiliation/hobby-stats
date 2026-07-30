import Link from 'next/link'

const Nav = () => {
	return (
		<nav className="w-full border-b border-zinc-800 bg-zinc-900/50 backdrop-blur px-6 py-4 mb-6">
			<div className="flex flex-wrap items-center justify-center gap-6 text-sm font-bold text-zinc-300">
				<Link href='/' className="hover:text-white transition-colors">Home</Link>
				<Link href='/movies' className="hover:text-white transition-colors">Movie Watchlist</Link>
				<Link href='/recent_movies' className="hover:text-white transition-colors">Recently Watched Movies</Link>
				<Link href='/tv' className="hover:text-white transition-colors">TV Watchlist</Link>
				<Link href='/recent_episodes' className="hover:text-white transition-colors">Recently Watched TV Episodes</Link>
				<Link href='/lastfm' className="hover:text-white transition-colors">Recent Tracks</Link>
			</div>
		</nav>
	)
}

export default Nav
