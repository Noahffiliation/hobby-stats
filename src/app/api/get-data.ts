const TRAKT_HEADER = {
	'Content-Type': 'application/json',
	'trakt-api-version': '2',
	'trakt-api-key': process.env.NEXT_PUBLIC_TRAKT_API_KEY
};

async function fetchTrakt(endpointPath: string, errorMessage: string) {
	const response = await fetch(`https://api.trakt.tv/users/noahffiliation/${endpointPath}`, {
		method: 'GET',
		headers: TRAKT_HEADER
	});

	if (!response.ok) {
		throw new Error(errorMessage);
	}

	return response;
}

async function fetchTraktPaginated(endpointPath: string, errorMessage: string) {
	const limit = 250;
	const baseUrl = `https://api.trakt.tv/users/noahffiliation/${endpointPath}`;
	const response = await fetch(`${baseUrl}?limit=${limit}&page=1`, {
		method: 'GET',
		headers: TRAKT_HEADER
	});

	if (!response.ok) {
		throw new Error(errorMessage);
	}

	const pageCountHeader = response.headers?.get?.('X-Pagination-Page-Count');
	const pageCount = pageCountHeader ? Number.parseInt(pageCountHeader, 10) : 1;
	let allItems = await response.json();

	if (pageCount > 1) {
		const promises = [];
		for (let p = 2; p <= pageCount; p++) {
			promises.push(
				fetch(`${baseUrl}?limit=${limit}&page=${p}`, {
					method: 'GET',
					headers: TRAKT_HEADER
				}).then(res => {
					if (!res.ok) throw new Error(errorMessage);
					return res.json();
				})
			);
		}
		const remainingPages = await Promise.all(promises);
		for (const pageData of remainingPages) {
			allItems = allItems.concat(pageData);
		}
	}

	return allItems;
}

export async function getTraktStats() {
	const response = await fetchTrakt('stats', 'Failed to fetch Trakt stats');
	return response.json();
}

export async function getWatchedShows() {
	const response = await fetchTrakt('watched/shows?limit=1&page=1', 'Failed to fetch Trakt watched shows');

	const itemCountHeader = response.headers?.get?.('X-Pagination-Item-Count');
	if (itemCountHeader) {
		return Number.parseInt(itemCountHeader, 10);
	}

	const data = await response.json();
	return data.length;
}

export async function getWatchlistMovies() {
	return fetchTraktPaginated('watchlist/movies/released', 'Failed to fetch Trakt movie watchlist');
}

export async function getWatchlistShows() {
	return fetchTraktPaginated('watchlist/shows/released', 'Failed to fetch Trakt show watchlist');
}

export async function getRecentMovies() {
	const response = await fetchTrakt('history/movies?limit=25', 'Failed to fetch recent movies');
	return response.json();
}

export async function getRecentEpisodes() {
	const response = await fetchTrakt('history/shows?limit=25', 'Failed to fetch recent episodes');
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
