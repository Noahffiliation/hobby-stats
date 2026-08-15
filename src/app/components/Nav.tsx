'use client'

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navLinks = [
	{ href: '/', label: 'Home' },
	{ href: '/games', label: 'Games' },
	{ href: '/movies', label: 'Movies' },
	{ href: '/tv', label: 'TV Shows' },
	{ href: '/anime', label: 'Anime' },
	{ href: '/dramas', label: 'K-Dramas' },
	{ href: '/lastfm', label: 'Recent Tracks' },
];

const Nav = () => {
	const pathname = usePathname();

	return (
		<nav className="w-full border-b border-zinc-800 bg-zinc-900/50 backdrop-blur px-6 py-4 mb-6">
			<div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-sm font-bold text-zinc-300">
				{navLinks.map((link) => {
					const isActive = pathname === link.href;
					return (
						<Link
							key={link.href}
							href={link.href}
							aria-current={isActive ? 'page' : undefined}
							className={`px-3 py-1.5 rounded-lg transition-colors ${
								isActive
									? 'bg-zinc-800 text-white shadow-xs'
									: 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
							}`}
						>
							{link.label}
						</Link>
					);
				})}
			</div>
		</nav>
	);
};

export default Nav;
