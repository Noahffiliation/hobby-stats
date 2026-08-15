'use client'

import { useEffect, useState } from 'react';
import Nav from '../components/Nav';
import {
	getRecentMovies,
	getWatchlistMovies,
	type TraktRecentMovie,
	type TraktWatchlistMovie
} from '../api/get-data';

export default function MoviesPage() {
	const [watchlist, setWatchlist] = useState<TraktWatchlistMovie[]>([]);
	const [recent, setRecent] = useState<TraktRecentMovie[]>([]);
	const [activeTab, setActiveTab] = useState<'watchlist' | 'recent'>('watchlist');
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let isMounted = true;

		async function fetchMovieData() {
			try {
				const [watchlistRes, recentRes] = await Promise.all([
					getWatchlistMovies(),
					getRecentMovies(),
				]);

				if (isMounted) {
					setWatchlist(watchlistRes.toReversed());
					setRecent(recentRes);
					setLoading(false);
				}
			} catch (err) {
				if (isMounted) {
					console.log(err);
					setError('Unable to load movie data. Please try again later.');
					setLoading(false);
				}
			}
		}

		fetchMovieData();

		return () => {
			isMounted = false;
		};
	}, []);

	return (
		<div className="min-h-screen w-full flex flex-col items-center bg-zinc-950 text-zinc-100">
			<Nav />

			<main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8 flex flex-col items-center justify-center text-center">
				<header className="mb-6 text-center">
					<h1 className="text-3xl font-extrabold tracking-tight text-white">Movies</h1>
					<p className="mt-1 text-sm text-zinc-400">Tracked movie watchlist and recent viewing history on Trakt.</p>
				</header>

				<div role="tablist" className="flex justify-center gap-2 mb-6 border-b border-zinc-800 pb-3 w-full max-w-2xl">
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === 'watchlist'}
						onClick={() => setActiveTab('watchlist')}
						className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
							activeTab === 'watchlist'
								? 'bg-zinc-800 text-white shadow-sm'
								: 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
						}`}
					>
						Watchlist ({watchlist.length})
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === 'recent'}
						onClick={() => setActiveTab('recent')}
						className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
							activeTab === 'recent'
								? 'bg-zinc-800 text-white shadow-sm'
								: 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
						}`}
					>
						Recently Watched ({recent.length})
					</button>
				</div>

				{loading && (
					<div data-testid="loading-state" className="w-full max-w-2xl py-12 text-center text-zinc-400 animate-pulse">
						Loading movies...
					</div>
				)}

				{error && (
					<div data-testid="error-state" className="w-full max-w-2xl p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-center text-sm">
						{error}
					</div>
				)}

				{!loading && !error && activeTab === 'watchlist' && (
					<ul className="w-full max-w-2xl space-y-3">
						{watchlist.map((item, idx) => {
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

				{!loading && !error && activeTab === 'recent' && (
					<ul className="w-full max-w-2xl space-y-3">
						{recent.map((item) => (
							<li
								key={item.id}
								className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition gap-2"
							>
								<div className="flex items-center space-x-2">
									<span className="font-semibold text-zinc-100">{item.movie.title}</span>
									{item.movie.year && (
										<span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
											{item.movie.year}
										</span>
									)}
								</div>
								<time className="text-xs text-zinc-400 font-mono">
									{new Date(item.watched_at).toLocaleString()}
								</time>
							</li>
						))}
					</ul>
				)}
			</main>
		</div>
	);
}
