'use client'

import { useState, useEffect } from 'react'
import Nav from './components/Nav'
import Progress from './components/Progress'
import { getTraktStats, getWatchedShows, getWatchlistMovies, getWatchlistShows } from './api/get-data'

export default function Home() {
	const [movies_watched, setMovies_watched] = useState(0);
	const [movies_watchlist, setMovies_watchlist] = useState(0);
	const [shows_watched, setShows_watched] = useState(0);
	const [shows_watchlist, setShows_watchlist] = useState(0);

	useEffect(() => {
		const movies_watched = async () => {
			getTraktStats().then((response) => {
				setMovies_watched(response.movies.watched);
			}).catch((error) => {
				console.log(error);
			});
		};

		movies_watched();
	}, []);

	useEffect(() => {
		const movies_watchlist = async () => {
			getWatchlistMovies().then((response) => {
				setMovies_watchlist(response.length);
			}).catch((error) => {
				console.log(error);
			});
		};

		movies_watchlist();
	}, []);

	useEffect(() => {
		const shows_watched = async () => {
			getWatchedShows().then((count) => {
				setShows_watched(count);
			}).catch((error) => {
				console.log(error);
			});
		};

		shows_watched();
	}, []);

	useEffect(() => {
		const shows_watchlist = async () => {
			getWatchlistShows().then((response) => {
				setShows_watchlist(response.length);
			}).catch((error) => {
				console.log(error);
			});
		};

		shows_watchlist();
	}, [])

	const total_movies = movies_watched + movies_watchlist;
	const total_shows = shows_watched + shows_watchlist;

	const movie_progress = total_movies === 0 ? 0 : (movies_watched / total_movies) * 100;
	const show_progress = total_shows === 0 ? 0 : (shows_watched / total_shows) * 100;

	return (
		<div className="min-h-screen flex flex-col">
			<Nav />

			<main className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
				<Progress label={`Movie Progress - ${movies_watched} / ${total_movies}`} showValueLabel value={movie_progress} />

			<br />

				<Progress label={`Show Progress - ${shows_watched} / ${total_shows}`} showValueLabel value={show_progress} />
			</main>
		</div>
	)
}
