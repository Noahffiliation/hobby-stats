import * as defaultApi from "../api.js";
import {
	bootPage,
	createBadgeLink,
	createElement,
	createTitleRow,
	runWatchlistRecentPage,
} from "../components.js";

function getTraktShowUrl(show) {
	const id = show.ids?.slug || show.ids?.trakt;
	return id ? `https://og.trakt.tv/shows/${encodeURIComponent(id)}` : undefined;
}

function getTraktEpisodeUrl(show, episode) {
	const showUrl = getTraktShowUrl(show);
	if (!showUrl) return undefined;
	return `${showUrl}/seasons/${encodeURIComponent(episode.season)}/episodes/${encodeURIComponent(episode.number)}`;
}

export async function initTvPage(doc = globalThis.document, api = defaultApi) {
	await runWatchlistRecentPage(doc, {
		tablistId: "tv-tabs",
		loadingMessage: "Loading TV shows...",
		errorMessage: "Unable to load TV data. Please try again later.",
		fetchProfile: () => api.getTraktProfile(),
		fetchWatchlist: () => api.getWatchlistShows(),
		fetchRecent: () => api.getRecentEpisodes(),
		getWatchlistMedia: (item) => item.show,
		getWatchlistMediaUrl: getTraktShowUrl,
		renderRecentPrimary: (d, item) =>
			createTitleRow(
				d,
				item.show.title,
				getTraktShowUrl(item.show),
				item.show.year
					? createElement(d, "span", {
							className: "media-meta-sm",
							text: `(${item.show.year})`,
						})
					: null,
				createBadgeLink(
					d,
					`S${item.episode.season} E${item.episode.number}`,
					getTraktEpisodeUrl(item.show, item.episode),
				),
			),
	});
}

await bootPage("tv", initTvPage);
