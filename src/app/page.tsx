'use client'

import { useState, useEffect } from 'react'
import Nav from './components/Nav'
import Progress from './components/Progress'
import { getTraktStats, getWatchedShows, getWatchlistMovies, getWatchlistShows } from './api/get-data'

export default function Home() {
	const [moviesWatched, setMoviesWatched] = useState(0);
	const [moviesWatchlist, setMoviesWatchlist] = useState(0);
	const [showsWatched, setShowsWatched] = useState(0);
	const [showsWatchlist, setShowsWatchlist] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let isMounted = true;

		async function loadStats() {
			try {
				const [stats, watchlistMovies, watchedShows, watchlistShows] = await Promise.all([
					getTraktStats(),
					getWatchlistMovies(),
					getWatchedShows(),
					getWatchlistShows(),
				]);

				if (isMounted) {
					setMoviesWatched(stats.movies.watched);
					setMoviesWatchlist(watchlistMovies.length);
					setShowsWatched(watchedShows);
					setShowsWatchlist(watchlistShows.length);
					setLoading(false);
				}
			} catch (err) {
				if (isMounted) {
					console.log(err);
					setError('Unable to load stats. Please try again later.');
					setLoading(false);
				}
			}
		}

		loadStats();

		return () => {
			isMounted = false;
		};
	}, []);

	const totalMovies = moviesWatched + moviesWatchlist;
	const totalShows = showsWatched + showsWatchlist;

	const movieProgress = totalMovies === 0 ? 0 : (moviesWatched / totalMovies) * 100;
	const showProgress = totalShows === 0 ? 0 : (showsWatched / totalShows) * 100;

	return (
		<div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
			<Nav />

			<main className="flex-1 flex flex-col items-center justify-center p-6 space-y-6 max-w-4xl mx-auto w-full">
				<div className="text-center mb-2">
					<h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Media Progress Dashboard</h1>
					<p className="mt-2 text-sm text-zinc-400">Tracking watched vs. watchlist progress across movies and TV series.</p>
				</div>

				{loading && (
					<div data-testid="loading-state" className="w-full max-w-2xl py-12 text-center text-zinc-400 animate-pulse">
						Loading stats...
					</div>
				)}

				{error && (
					<div data-testid="error-state" className="w-full max-w-2xl p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-center text-sm">
						{error}
					</div>
				)}

				{!loading && !error && (
					<div className="w-full max-w-2xl space-y-8 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800/80 backdrop-blur">
						<Progress label={`Movie Progress - ${moviesWatched} / ${totalMovies}`} showValueLabel value={movieProgress} />
						<Progress label={`Show Progress - ${showsWatched} / ${totalShows}`} showValueLabel value={showProgress} />
					</div>
				)}
			</main>
		</div>
	);
}
