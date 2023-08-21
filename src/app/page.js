'use client'

import { Progress } from '@nextui-org/react'
import { useState, useEffect } from 'react'
import Nav from './components/Nav'
import { getTraktStats, getWatchlistMovies, getWatchlistShows } from './api/get-data'

export default function Home() {
	const [movies_watched, setMoviesWatched] = useState([]);
	const [movies_watchlist, setMoviesWatchlist] = useState([]);
	const [shows_watched, setShowsWatched] = useState([]);
	const [shows_watchlist, setShowsWatchlist] = useState([]);

	useEffect(() => {
		const movies_watched = async () => {
			getTraktStats().then((response) => {
				setMoviesWatched(response.movies.watched);
			}).catch((error) => {
				console.log(error);
			});
		};

		movies_watched();
	}, []);

	useEffect(() => {
		const movies_watchlist = async () => {
			getWatchlistMovies().then((response) => {
				setMoviesWatchlist(response.length);
			}).catch((error) => {
				console.log(error);
			});
		};

		movies_watchlist();
	}, []);

	useEffect(() => {
		const shows_watched = async () => {
			getTraktStats().then((response) => {
				setShowsWatched(response.shows.watched);
			}).catch((error) => {
				console.log(error);
			});
		};

		shows_watched();
	}, []);

	useEffect(() => {
		const shows_watchlist = async () => {
			getWatchlistShows().then((response) => {
				setShowsWatchlist(response.length);
			}).catch((error) => {
				console.log(error);
			});
		};

		shows_watchlist();
	}, [])

	const movie_progress = movies_watched / (movies_watched + movies_watchlist) * 100;
	const show_progress = shows_watched / (shows_watched + shows_watchlist) * 100;

  return (
		<div>
			<Nav />

			<Progress size='lg' label={`Movie Progess - ${movies_watched} / ${movies_watched + movies_watchlist}`} color='default' showValueLabel value={movie_progress} />

			<br />

			<Progress size='lg' label={`Show Progess - ${shows_watched} / ${shows_watched + shows_watchlist}`} color='default' showValueLabel value={show_progress} />
		</div>
  )
}
