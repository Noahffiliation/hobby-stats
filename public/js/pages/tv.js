import * as defaultApi from "../api.js";
import {
	bootPage,
	createBadge,
	createElement,
	createTitleRow,
	runWatchlistRecentPage,
} from "../components.js";

export async function initTvPage(doc = globalThis.document, api = defaultApi) {
	await runWatchlistRecentPage(doc, {
		tablistId: "tv-tabs",
		loadingMessage: "Loading TV shows...",
		errorMessage: "Unable to load TV data. Please try again later.",
		fetchWatchlist: () => api.getWatchlistShows(),
		fetchRecent: () => api.getRecentEpisodes(),
		getWatchlistMedia: (item) => item.show,
		renderRecentPrimary: (d, item) =>
			createTitleRow(
				d,
				item.show.title,
				item.show.year
					? createElement(d, "span", {
							className: "media-meta-sm",
							text: `(${item.show.year})`,
						})
					: null,
				createBadge(d, `S${item.episode.season} E${item.episode.number}`),
			),
	});
}

await bootPage("tv", initTvPage);
