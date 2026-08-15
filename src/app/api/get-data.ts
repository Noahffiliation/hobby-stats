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

export interface BackloggdStats {
	played: number;
	backlog: number;
}

export interface MyAnimeListStats {
	completed: number;
	planToWatch: number;
}

export interface MyDramaListStats {
	completed: number;
	planToWatch: number;
}

export interface GameItem {
	title: string;
	status?: string;
	platform?: string;
	date?: string;
}

export interface GamesListResponse {
	totalBacklog?: number;
	totalPlayed?: number;
	backlog: GameItem[];
	played: GameItem[];
}

export interface AnimeItem {
	id: number;
	title: string;
	episodes?: number;
	watchedEpisodes?: number;
	score?: number;
	mediaType?: string;
}

export interface AnimeListResponse {
	totalPlanToWatch?: number;
	totalCompleted?: number;
	planToWatch: AnimeItem[];
	completed: AnimeItem[];
	watching?: AnimeItem[];
}

export interface DramaItem {
	title: string;
	year?: number | string;
	type?: string;
	country?: string;
	episodes?: string | number;
	score?: number | string;
}

export interface DramaListResponse {
	totalPlanToWatch?: number;
	totalCompleted?: number;
	planToWatch: DramaItem[];
	completed: DramaItem[];
}

export async function getTraktStats(): Promise<TraktStats> {
	const response = await fetch('/api/trakt?endpoint=stats', { method: 'GET' });
	if (!response.ok) {
		throw new Error('Failed to fetch Trakt stats');
	}
	return response.json();
}

export async function getWatchedShows(): Promise<number> {
	const response = await fetch('/api/trakt?endpoint=watched-shows', { method: 'GET' });
	if (!response.ok) {
		throw new Error('Failed to fetch Trakt watched shows');
	}
	const data = await response.json();
	return data.count;
}

export async function getWatchlistMovies(): Promise<TraktWatchlistMovie[]> {
	const response = await fetch('/api/trakt?endpoint=watchlist-movies', { method: 'GET' });
	if (!response.ok) {
		throw new Error('Failed to fetch Trakt movie watchlist');
	}
	return response.json();
}

export async function getWatchlistShows(): Promise<TraktWatchlistShow[]> {
	const response = await fetch('/api/trakt?endpoint=watchlist-shows', { method: 'GET' });
	if (!response.ok) {
		throw new Error('Failed to fetch Trakt show watchlist');
	}
	return response.json();
}

export async function getRecentMovies(): Promise<TraktRecentMovie[]> {
	const response = await fetch('/api/trakt?endpoint=recent-movies', { method: 'GET' });
	if (!response.ok) {
		throw new Error('Failed to fetch recent movies');
	}
	return response.json();
}

export async function getRecentEpisodes(): Promise<TraktRecentEpisode[]> {
	const response = await fetch('/api/trakt?endpoint=recent-episodes', { method: 'GET' });
	if (!response.ok) {
		throw new Error('Failed to fetch recent episodes');
	}
	return response.json();
}

export async function getLastFm(): Promise<LastFmResponse> {
	const response = await fetch('/api/lastfm', { method: 'GET' });
	if (!response.ok) {
		throw new Error('Failed to fetch last.fm stats');
	}
	return response.json();
}

export async function getBackloggdStats(): Promise<BackloggdStats> {
	const response = await fetch('/api/backloggd', { method: 'GET' });
	if (!response.ok) {
		throw new Error('Failed to fetch Backloggd stats');
	}
	return response.json();
}

export async function getMyAnimeListStats(): Promise<MyAnimeListStats> {
	const response = await fetch('/api/myanimelist', { method: 'GET' });
	if (!response.ok) {
		throw new Error('Failed to fetch MyAnimeList stats');
	}
	return response.json();
}

export async function getMyDramaListStats(): Promise<MyDramaListStats> {
	const response = await fetch('/api/mydramalist', { method: 'GET' });
	if (!response.ok) {
		throw new Error('Failed to fetch MyDramaList stats');
	}
	return response.json();
}

export async function getGamesList(): Promise<GamesListResponse> {
	const response = await fetch('/api/games', { method: 'GET' });
	if (!response.ok) {
		throw new Error('Failed to fetch games list');
	}
	return response.json();
}

export async function getAnimeList(): Promise<AnimeListResponse> {
	const response = await fetch('/api/anime', { method: 'GET' });
	if (!response.ok) {
		throw new Error('Failed to fetch anime list');
	}
	return response.json();
}

export async function getDramaList(): Promise<DramaListResponse> {
	const response = await fetch('/api/dramas', { method: 'GET' });
	if (!response.ok) {
		throw new Error('Failed to fetch drama list');
	}
	return response.json();
}
