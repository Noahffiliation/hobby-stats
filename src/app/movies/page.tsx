'use client'

import { useEffect, useState } from 'react';
import Nav from '../components/Nav';
import { getWatchlistMovies, type TraktWatchlistMovie } from '../api/get-data';

export default function MoviesPage() {
	const [movies, setMovies] = useState<TraktWatchlistMovie[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let isMounted = true;

		async function fetchMovies() {
			try {
				const response = await getWatchlistMovies();
				if (isMounted) {
					setMovies(response.toReversed());
					setLoading(false);
				}
			} catch (err) {
				if (isMounted) {
					console.log(err);
					setError('Unable to load movie watchlist. Please try again later.');
					setLoading(false);
				}
			}
		}

		fetchMovies();

		return () => {
			isMounted = false;
		};
	}, []);

	return (
		<div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
			<Nav />

			<main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">
				<header className="mb-8">
					<h1 className="text-3xl font-extrabold tracking-tight text-white">Movie Watchlist</h1>
					<p className="mt-1 text-sm text-zinc-400">Movies queued up to watch on Trakt.</p>
				</header>

				{loading && (
					<div data-testid="loading-state" className="py-12 text-center text-zinc-400 animate-pulse">
						Loading watchlist...
					</div>
				)}

				{error && (
					<div data-testid="error-state" className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-center text-sm">
						{error}
					</div>
				)}

				{!loading && !error && (
					<ul className="space-y-3">
						{movies.map((item, idx) => {
							const ids = item.movie.ids || {};
							const key = ids.trakt || ids.tmdb || `${item.movie.title}-${item.movie.year || ''}-${idx}`;

							return (
								<li
									key={key}
									className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition"
								>
									<span className="font-semibold text-zinc-100">{item.movie.title}</span>
									{item.movie.year && (
										<span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
											{item.movie.year}
										</span>
									)}
								</li>
							);
						})}
					</ul>
				)}
			</main>
		</div>
	);
}
