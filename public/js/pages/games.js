import * as defaultApi from "../api.js";
import {
	bootPage,
	createBadge,
	createElement,
	createMediaItem,
	createTimestamp,
	createTitleRow,
	runCollectionPage,
} from "../components.js";

export async function initGamesPage(
	doc = globalThis.document,
	api = defaultApi,
) {
	await runCollectionPage(doc, {
		tablistId: "games-tabs",
		firstPanelId: "panel-backlog",
		secondPanelId: "panel-played",
		firstKey: "backlog",
		secondKey: "played",
		firstTotalKey: "totalBacklog",
		secondTotalKey: "totalPlayed",
		firstEmptyMessage: "No backlog games found.",
		secondEmptyMessage: "No played games found.",
		loadingMessage: "Loading games...",
		errorMessage: "Unable to load games data. Please try again later.",
		fetchData: () => api.getGamesList(),
		renderFirstItem: (d, item) =>
			createMediaItem(
				d,
				false,
				createElement(d, "span", {
					className: "media-title",
					text: item.title,
				}),
				item.platform ? createBadge(d, item.platform) : null,
			),
		renderSecondItem: (d, item) =>
			createMediaItem(
				d,
				true,
				createTitleRow(
					d,
					item.title,
					item.status ? createBadge(d, item.status, "emerald") : null,
					item.platform ? createBadge(d, item.platform) : null,
				),
				item.date ? createTimestamp(d, item.date) : null,
			),
	});
}

await bootPage("games", initGamesPage);
