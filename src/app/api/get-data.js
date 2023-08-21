const TRAKT_HEADER = {
	'Content-Type': 'application/json',
	'trakt-api-version': '2',
	'trakt-api-key': process.env.NEXT_PUBLIC_TRAKT_API_KEY
};

export async function getTraktStats() {
	const response = await fetch('https://api.trakt.tv/users/noahffiliation/stats', {
		method: 'GET',
		headers: TRAKT_HEADER
	});

	if (!response.ok) {
		throw new Error('Failed to fetch Trakt stats');
	}

	return response.json();
}

export async function getWatchlistMovies() {
	const response = await fetch('https://api.trakt.tv/users/noahffiliation/watchlist/movies/released', {
		method: 'GET',
		headers: TRAKT_HEADER
	});

	if (!response.ok) {
		throw new Error('Failed to fetch Trakt movie watchlist');
	}

	return response.json();
}

export async function getWatchlistShows() {
	const response = await fetch('https://api.trakt.tv/users/noahffiliation/watchlist/shows/released', {
		method: 'GET',
		headers: TRAKT_HEADER
	});

	if (!response.ok) {
		throw new Error('Failed to fetch Trakt show watchlist');
	}

	return response.json();
}

export async function getRecentMovies() {
	const response = await fetch('https://api.trakt.tv/users/noahffiliation/history/movies?limit=25', {
		method: 'GET',
		headers: TRAKT_HEADER
	});

	if (!response.ok) {
		throw new Error('Failed to fetch recent movies');
	}

	return response.json();
}

export async function getRecentEpisodes() {
	const response = await fetch('https://api.trakt.tv/users/noahffiliation/history/shows?limit=25', {
		method: 'GET',
		headers: TRAKT_HEADER
	});

	if (!response.ok) {
		throw new Error('Failed to fetch recent episodes');
	}

	return response.json();
}

export async function getLastFm() {
	const response = await fetch('https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=noahffiliation&api_key=' + process.env.NEXT_PUBLIC_LASTFM_API_KEY + '&format=json', {
		method: 'GET'
	});

	if (!response.ok) {
		throw new Error('Failed to fetch last.fm stats');
	}

	return response.json();
}
