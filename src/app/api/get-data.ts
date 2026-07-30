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

export async function getWatchedShows() {
	const response = await fetch('https://api.trakt.tv/users/noahffiliation/watched/shows?limit=1&page=1', {
		method: 'GET',
		headers: TRAKT_HEADER
	});

	if (!response.ok) {
		throw new Error('Failed to fetch Trakt watched shows');
	}

	const itemCountHeader = response.headers?.get?.('X-Pagination-Item-Count');
	if (itemCountHeader) {
		return Number.parseInt(itemCountHeader, 10);
	}

	const data = await response.json();
	return data.length;
}

export async function getWatchlistMovies() {
	const limit = 250;
	const response = await fetch(`https://api.trakt.tv/users/noahffiliation/watchlist/movies/released?limit=${limit}&page=1`, {
		method: 'GET',
		headers: TRAKT_HEADER
	});

	if (!response.ok) {
		throw new Error('Failed to fetch Trakt movie watchlist');
	}

	const pageCountHeader = response.headers?.get?.('X-Pagination-Page-Count');
	const pageCount = pageCountHeader ? Number.parseInt(pageCountHeader, 10) : 1;
	let allMovies = await response.json();

	if (pageCount > 1) {
		const promises = [];
		for (let p = 2; p <= pageCount; p++) {
			promises.push(
				fetch(`https://api.trakt.tv/users/noahffiliation/watchlist/movies/released?limit=${limit}&page=${p}`, {
					method: 'GET',
					headers: TRAKT_HEADER
				}).then(res => {
					if (!res.ok) throw new Error('Failed to fetch Trakt movie watchlist');
					return res.json();
				})
			);
		}
		const remainingPages = await Promise.all(promises);
		for (const pageData of remainingPages) {
			allMovies = allMovies.concat(pageData);
		}
	}

	return allMovies;
}

export async function getWatchlistShows() {
	const limit = 250;
	const response = await fetch(`https://api.trakt.tv/users/noahffiliation/watchlist/shows/released?limit=${limit}&page=1`, {
		method: 'GET',
		headers: TRAKT_HEADER
	});

	if (!response.ok) {
		throw new Error('Failed to fetch Trakt show watchlist');
	}

	const pageCountHeader = response.headers?.get?.('X-Pagination-Page-Count');
	const pageCount = pageCountHeader ? Number.parseInt(pageCountHeader, 10) : 1;
	let allShows = await response.json();

	if (pageCount > 1) {
		const promises = [];
		for (let p = 2; p <= pageCount; p++) {
			promises.push(
				fetch(`https://api.trakt.tv/users/noahffiliation/watchlist/shows/released?limit=${limit}&page=${p}`, {
					method: 'GET',
					headers: TRAKT_HEADER
				}).then(res => {
					if (!res.ok) throw new Error('Failed to fetch Trakt show watchlist');
					return res.json();
				})
			);
		}
		const remainingPages = await Promise.all(promises);
		for (const pageData of remainingPages) {
			allShows = allShows.concat(pageData);
		}
	}

	return allShows;
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
