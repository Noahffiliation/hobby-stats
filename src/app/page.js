'use client'

import { Progress } from '@heroui/react'
import { useState, useEffect } from 'react'
import Nav from './components/Nav'
import { getTraktStats, getWatchlistMovies, getWatchlistShows } from './api/get-data'

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
			getTraktStats().then((response) => {
				setShows_watched(response.shows.watched);
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
		<div>
			<Nav />

			<Progress size='lg' label={`Movie Progress - ${movies_watched} / ${movies_watched + movies_watchlist}`} color='default' showValueLabel value={movie_progress} />

			<br />

			<Progress size='lg' label={`Show Progress - ${shows_watched} / ${shows_watched + shows_watchlist}`} color='default' showValueLabel value={show_progress} />
		</div>
	)
}
