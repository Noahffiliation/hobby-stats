import * as defaultApi from "../api.js";
import {
	bootPage,
	createBadge,
	createElement,
	createMediaItem,
	createScoreRating,
	createTitleRow,
	runCollectionPage,
} from "../components.js";

function createAnimeTypeMeta(doc, mediaType) {
	return mediaType
		? createElement(doc, "span", {
				className: "media-meta",
				text: `(${mediaType})`,
			})
		: null;
}

function createEpisodesBadge(doc, episodes) {
	return episodes !== undefined && episodes > 0
		? createBadge(doc, `${episodes} eps`)
		: null;
}

export async function initAnimePage(
	doc = globalThis.document,
	api = defaultApi,
) {
	await runCollectionPage(doc, {
		tablistId: "anime-tabs",
		firstEmptyMessage: "No anime in plan to watch.",
		secondEmptyMessage: "No completed anime found.",
		loadingMessage: "Loading anime...",
		errorMessage: "Unable to load anime data. Please try again later.",
		fetchData: () => api.getAnimeList(),
		renderFirstItem: (d, item) =>
			createMediaItem(
				d,
				false,
				createTitleRow(d, item.title, createAnimeTypeMeta(d, item.mediaType)),
				createEpisodesBadge(d, item.episodes),
			),
		renderSecondItem: (d, item) =>
			createMediaItem(
				d,
				true,
				createTitleRow(
					d,
					item.title,
					createAnimeTypeMeta(d, item.mediaType),
					createEpisodesBadge(d, item.episodes),
				),
				item.score !== undefined && item.score > 0
					? createScoreRating(d, item.score)
					: null,
			),
	});
}

await bootPage("anime", initAnimePage);
