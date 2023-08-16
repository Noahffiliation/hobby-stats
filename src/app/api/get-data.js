export async function getTraktStats() {
	const response = await fetch('https://api.trakt.tv/users/noahffiliation/stats', {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			'trakt-api-version': '2',
			'trakt-api-key': process.env.NEXT_PUBLIC_TRAKT_API_KEY,
		}
	});

	if (!response.ok) {
		throw new Error('Failed to fetch Trakt stats');
	}

	return response.json();
}

export async function getTraktMovies() {
	const response = await fetch('https://api.trakt.tv/users/noahffiliation/watchlist/movies', {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			'trakt-api-version': '2',
			'trakt-api-key': process.env.NEXT_PUBLIC_TRAKT_API_KEY,
		}
	});

	if (!response.ok) {
		throw new Error('Failed to fetch Trakt movie watchlist');
	}

	return response.json();
}

export async function getTraktShows() {
	const response = await fetch('https://api.trakt.tv/users/noahffiliation/watchlist/shows', {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			'trakt-api-version': '2',
			'trakt-api-key': process.env.NEXT_PUBLIC_TRAKT_API_KEY,
		}
	});

	if (!response.ok) {
		throw new Error('Failed to fetch Trakt show watchlist');
	}

	return response.json();
}
