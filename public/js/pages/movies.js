import * as defaultApi from "../api.js";
import {
	bootPage,
	createBadge,
	createTitleRow,
	runWatchlistRecentPage,
} from "../components.js";

export async function initMoviesPage(
	doc = globalThis.document,
	api = defaultApi,
) {
	await runWatchlistRecentPage(doc, {
		tablistId: "movies-tabs",
		loadingMessage: "Loading movies...",
		errorMessage: "Unable to load movie data. Please try again later.",
		fetchWatchlist: () => api.getWatchlistMovies(),
		fetchRecent: () => api.getRecentMovies(),
		getWatchlistMedia: (item) => item.movie,
		renderRecentPrimary: (d, item) =>
			createTitleRow(
				d,
				item.movie.title,
				item.movie.year ? createBadge(d, item.movie.year) : null,
			),
	});
}

await bootPage("movies", initMoviesPage);
