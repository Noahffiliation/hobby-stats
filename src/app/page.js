'use client'

import { Progress } from '@nextui-org/react'
import Nav from './components/Nav'

async function getTraktStats() {
	const res = await fetch('https://api.trakt.tv/users/noahffiliation/stats', {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			'trakt-api-version': '2',
			'trakt-api-key': process.env.NEXT_PUBLIC_TRAKT_API_KEY,
		}
	});

	if (!res.ok) {
		throw new Error('Failed to fetch Trakt stats');
	}

	return res.json();
}

async function getTraktMovies() {
	const res = await fetch('https://api.trakt.tv/users/noahffiliation/watchlist/movies', {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			'trakt-api-version': '2',
			'trakt-api-key': process.env.NEXT_PUBLIC_TRAKT_API_KEY,
		}
	});

	if (!res.ok) {
		throw new Error('Failed to fetch Trakt movie watchlist');
	}

	return res.json();
}

async function getTraktShows() {
	const res = await fetch('https://api.trakt.tv/users/noahffiliation/watchlist/shows', {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			'trakt-api-version': '2',
			'trakt-api-key': process.env.NEXT_PUBLIC_TRAKT_API_KEY,
		}
	});

	if (!res.ok) {
		throw new Error('Failed to fetch Trakt show watchlist');
	}

	return res.json();
}

async function getMalWatchlist() {
	const res = await fetch('https://api.myanimelist.net/v2/users/noahffiliation/animelist?limit=400&status=plan_to_watch', {
		method: 'GET',
		headers: {
			'X-MAL-CLIENT-ID': process.env.NEXT_PUBLIC_MAL_CLIENT_ID,
		}
	});

	if (!res.ok) {
		throw new Error('Failed to fetch MAL watchlist');
	}

	return res.json();
}

async function getMalCompleted() {
	const res = await fetch('https://api.myanimelist.net/v2/users/noahffiliation/animelist?limit=400&status=completed', {
		method: 'GET',
		headers: {
			'X-MAL-CLIENT-ID': process.env.NEXT_PUBLIC_MAL_CLIENT_ID,
		}
	});

	if (!res.ok) {
		throw new Error('Failed to fetch MAL completed');
	}

	return res.json();
}

export default function Home() {
	const [
		traktStats,
		traktMovies,
		traktShows,
		malWatchlist,
		malCompleted,
	] = Promise.all([
		getTraktStats(),
		getTraktMovies(),
		getTraktShows(),
		getMalWatchlist(),
		getMalCompleted(),
	]);

	const calculateProgress = (watched, total) => (watched / (watched + total)) * 100;

	const movie_progress = calculateProgress(traktStats.movies.watched, traktMovies.length);
	const show_progress = calculateProgress(traktStats.shows.watched, traktShows.length);
	const anime_progress = calculateProgress(malCompleted.data.length, malWatchlist.data.length);

  return (
		<div>
			<Nav />

			<Progress size='lg' label={`Movie Progess - ${traktStats.movies.watched} / ${traktMovies.length}`} color='default' showValueLabel value={movie_progress} />

			<br />

			<Progress size='lg' label={`Show Progess - ${traktStats.shows.watched} / ${traktShows.length}`} color='default' showValueLabel value={show_progress} />

			<br />

			<Progress size='lg' label={`Anime Progess - ${malCompleted.data.length} / ${malWatchlist.data.length}`} color='default' showValueLabel value={anime_progress} />
		</div>
  )
}
