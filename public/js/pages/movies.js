import * as defaultApi from "../api.js";
import {
	bootPage,
	createBadge,
	createTitleRow,
	runWatchlistRecentPage,
} from "../components.js";

function getTraktMovieUrl(movie) {
	const id = movie.ids?.slug || movie.ids?.trakt;
	return id
		? `https://og.trakt.tv/movies/${encodeURIComponent(id)}`
		: undefined;
}

export async function initMoviesPage(
	doc = globalThis.document,
	api = defaultApi,
) {
	await runWatchlistRecentPage(doc, {
		tablistId: "movies-tabs",
		loadingMessage: "Loading movies...",
		errorMessage: "Unable to load movie data. Please try again later.",
		fetchProfile: () => api.getTraktProfile(),
		fetchWatchlist: () => api.getWatchlistMovies(),
		fetchRecent: () => api.getRecentMovies(),
		getWatchlistMedia: (item) => item.movie,
		getWatchlistMediaUrl: getTraktMovieUrl,
		renderRecentPrimary: (d, item) =>
			createTitleRow(
				d,
				item.movie.title,
				getTraktMovieUrl(item.movie),
				item.movie.year ? createBadge(d, item.movie.year) : null,
			),
	});
}

await bootPage("movies", initMoviesPage);
