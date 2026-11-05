import * as defaultApi from "../api.js";
import {
	bootPage,
	createElement,
	createMediaItem,
	renderListPanel,
	runAsyncSection,
} from "../components.js";

export async function initLastFmPage(
	doc = globalThis.document,
	api = defaultApi,
) {
	const statusContainer = doc.getElementById("status-feedback");
	const tracksContainer = doc.getElementById("tracks-container");
	if (!statusContainer || !tracksContainer) return;

	await runAsyncSection(
		statusContainer,
		tracksContainer,
		{
			loadingMessage: "Loading recent tracks...",
			errorMessage: "Unable to load Last.fm scrobbles. Please try again later.",
		},
		async () => {
			const response = await api.getLastFm();
			renderListPanel(
				doc,
				tracksContainer,
				response.recenttracks.track,
				(t) => {
					const stack = createElement(doc, "div", { className: "media-stack" });
					stack.appendChild(
						createElement(doc, "span", {
							className: "media-title",
							text: t.name,
						}),
					);
					stack.appendChild(
						createElement(doc, "span", {
							className: "media-meta-sm",
							text: t.artist["#text"],
						}),
					);
					return createMediaItem(doc, false, stack);
				},
			);
			return true;
		},
	);
}

await bootPage("lastfm", initLastFmPage);
