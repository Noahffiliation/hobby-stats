export interface TraktMovieIds {
	trakt?: number;
	tmdb?: number;
	imdb?: string;
	slug?: string;
}

export interface TraktMovie {
	title: string;
	year?: number;
	ids?: TraktMovieIds | null;
}

export interface TraktWatchlistMovie {
	movie: TraktMovie;
}

export interface TraktRecentMovie {
	id: number | string;
	movie: TraktMovie;
	watched_at: string;
}

export interface TraktShow {
	title: string;
	year?: number;
	ids?: TraktMovieIds | null;
}

export interface TraktWatchlistShow {
	id?: number | string;
	show: TraktShow;
}

export interface TraktEpisode {
	season: number;
	number: number;
	title?: string;
}

export interface TraktRecentEpisode {
	id?: number | string | null;
	show: TraktShow;
	episode: TraktEpisode;
	watched_at: string;
}

export interface TraktStats {
	movies: {
		watched: number;
		plays?: number;
		minutes?: number;
	};
	shows?: {
		watched?: number;
	};
	episodes?: {
		watched?: number;
	};
}

export interface LastFmArtist {
	'#text': string;
	mbid?: string;
}

export interface LastFmTrack {
	name: string;
	artist: LastFmArtist;
	mbid?: string;
	url?: string;
}

export interface LastFmResponse {
	recenttracks: {
		track: LastFmTrack[];
	};
}

const TRAKT_USERNAME = process.env.NEXT_PUBLIC_TRAKT_USERNAME || 'noahffiliation';
const LASTFM_USERNAME = process.env.NEXT_PUBLIC_LASTFM_USERNAME || 'noahffiliation';

function getTraktHeaders(): HeadersInit {
	return {
		'Content-Type': 'application/json',
		'trakt-api-version': '2',
		'trakt-api-key': process.env.NEXT_PUBLIC_TRAKT_API_KEY || ''
	};
}

async function fetchTrakt(endpointPath: string, errorMessage: string): Promise<Response> {
	const response = await fetch(`https://api.trakt.tv/users/${TRAKT_USERNAME}/${endpointPath}`, {
		method: 'GET',
		headers: getTraktHeaders()
	});

	if (!response.ok) {
		throw new Error(errorMessage);
	}

	return response;
}

async function fetchTraktPaginated<T>(endpointPath: string, errorMessage: string): Promise<T[]> {
	const limit = 250;
	const baseUrl = `https://api.trakt.tv/users/${TRAKT_USERNAME}/${endpointPath}`;
	const response = await fetch(`${baseUrl}?limit=${limit}&page=1`, {
		method: 'GET',
		headers: getTraktHeaders()
	});

	if (!response.ok) {
		throw new Error(errorMessage);
	}

	const pageCountHeader = response.headers?.get?.('X-Pagination-Page-Count');
	const pageCount = pageCountHeader ? Number.parseInt(pageCountHeader, 10) : 1;
	let allItems: T[] = await response.json();

	if (pageCount > 1) {
		const promises = [];
		for (let p = 2; p <= pageCount; p++) {
			promises.push(
				fetch(`${baseUrl}?limit=${limit}&page=${p}`, {
					method: 'GET',
					headers: getTraktHeaders()
				}).then(async res => {
					if (!res.ok) throw new Error(errorMessage);
					return res.json() as Promise<T[]>;
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

export async function getTraktStats(): Promise<TraktStats> {
	const response = await fetchTrakt('stats', 'Failed to fetch Trakt stats');
	return response.json();
}

export async function getWatchedShows(): Promise<number> {
	const response = await fetchTrakt('watched/shows?limit=1&page=1', 'Failed to fetch Trakt watched shows');

	const itemCountHeader = response.headers?.get?.('X-Pagination-Item-Count');
	if (itemCountHeader) {
		return Number.parseInt(itemCountHeader, 10);
	}

	const data = await response.json();
	return data.length;
}

export async function getWatchlistMovies(): Promise<TraktWatchlistMovie[]> {
	return fetchTraktPaginated<TraktWatchlistMovie>('watchlist/movies/released', 'Failed to fetch Trakt movie watchlist');
}

export async function getWatchlistShows(): Promise<TraktWatchlistShow[]> {
	return fetchTraktPaginated<TraktWatchlistShow>('watchlist/shows/released', 'Failed to fetch Trakt show watchlist');
}

export async function getRecentMovies(): Promise<TraktRecentMovie[]> {
	const response = await fetchTrakt('history/movies?limit=25', 'Failed to fetch recent movies');
	return response.json();
}

export async function getRecentEpisodes(): Promise<TraktRecentEpisode[]> {
	const response = await fetchTrakt('history/shows?limit=25', 'Failed to fetch recent episodes');
	return response.json();
}

export async function getLastFm(): Promise<LastFmResponse> {
	const apiKey = process.env.NEXT_PUBLIC_LASTFM_API_KEY || '';
	const response = await fetch(
		`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${LASTFM_USERNAME}&api_key=${apiKey}&format=json`,
		{ method: 'GET' }
	);

	if (!response.ok) {
		throw new Error('Failed to fetch last.fm stats');
	}

	return response.json();
}
