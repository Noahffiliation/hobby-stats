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

function createDramaPrimary(doc, item, trailingNode = null) {
	return createTitleRow(
		doc,
		item.title,
		item.year
			? createElement(doc, "span", {
					className: "media-meta",
					text: `(${item.year})`,
				})
			: null,
		item.country
			? createElement(doc, "span", {
					className: "media-meta",
					text: `• ${item.country}`,
				})
			: null,
		trailingNode,
	);
}

export async function initDramasPage(
	doc = globalThis.document,
	api = defaultApi,
) {
	await runCollectionPage(doc, {
		tablistId: "dramas-tabs",
		firstEmptyMessage: "No K-dramas in plan to watch.",
		secondEmptyMessage: "No completed K-dramas found.",
		loadingMessage: "Loading K-dramas...",
		errorMessage: "Unable to load K-drama data. Please try again later.",
		fetchData: () => api.getDramaList(),
		renderFirstItem: (d, item) =>
			createMediaItem(
				d,
				false,
				createDramaPrimary(d, item),
				item.type ? createBadge(d, item.type) : null,
			),
		renderSecondItem: (d, item) =>
			createMediaItem(
				d,
				true,
				createDramaPrimary(
					d,
					item,
					item.episodes ? createBadge(d, item.episodes) : null,
				),
				item.score === undefined ? null : createScoreRating(d, item.score),
			),
	});
}

await bootPage("dramas", initDramasPage);
