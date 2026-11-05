async function fetchJson(url, errorMessage) {
	const response = await fetch(url, { method: "GET" });
	if (!response.ok) {
		throw new Error(errorMessage);
	}
	return response.json();
}

export async function getTraktStats() {
	return fetchJson("/api/trakt?endpoint=stats", "Failed to fetch Trakt stats");
}

export async function getWatchedShows() {
	const data = await fetchJson(
		"/api/trakt?endpoint=watched-shows",
		"Failed to fetch Trakt watched shows",
	);
	return data.count;
}

export async function getWatchlistMovies() {
	return fetchJson(
		"/api/trakt?endpoint=watchlist-movies",
		"Failed to fetch Trakt movie watchlist",
	);
}

export async function getWatchlistShows() {
	return fetchJson(
		"/api/trakt?endpoint=watchlist-shows",
		"Failed to fetch Trakt show watchlist",
	);
}

export async function getRecentMovies() {
	return fetchJson(
		"/api/trakt?endpoint=recent-movies",
		"Failed to fetch recent movies",
	);
}

export async function getRecentEpisodes() {
	return fetchJson(
		"/api/trakt?endpoint=recent-episodes",
		"Failed to fetch recent episodes",
	);
}

export async function getLastFm() {
	return fetchJson("/api/lastfm", "Failed to fetch last.fm stats");
}

export async function getBackloggdStats() {
	return fetchJson("/api/backloggd", "Failed to fetch Backloggd stats");
}

export async function getMyAnimeListStats() {
	return fetchJson("/api/myanimelist", "Failed to fetch MyAnimeList stats");
}

export async function getMyDramaListStats() {
	return fetchJson("/api/mydramalist", "Failed to fetch MyDramaList stats");
}

export async function getGamesList() {
	return fetchJson("/api/games", "Failed to fetch games list");
}

export async function getAnimeList() {
	return fetchJson("/api/anime", "Failed to fetch anime list");
}

export async function getDramaList() {
	return fetchJson("/api/dramas", "Failed to fetch drama list");
}
