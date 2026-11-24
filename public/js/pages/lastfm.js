import * as defaultApi from "../api.js";
import {
	bootPage,
	createElement,
	createMediaItem,
	createMediaTitle,
	createTextOrLink,
	renderListPanel,
	runAsyncSection,
	updateProfileLink,
} from "../components.js";

function encodeLastFmPart(value) {
	return encodeURIComponent(value).replaceAll("%20", "+");
}

function getTrackUrl(track, artistName) {
	if (track.url) return track.url;
	if (!artistName || !track.name) return undefined;
	return `https://www.last.fm/music/${encodeLastFmPart(artistName)}/_/${encodeLastFmPart(track.name)}`;
}

function getArtistUrl(track, artistName) {
	if (track.url?.includes("/_/")) {
		return track.url.slice(0, track.url.indexOf("/_/"));
	}
	if (!artistName) return undefined;
	return `https://www.last.fm/music/${encodeLastFmPart(artistName)}`;
}

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
			updateProfileLink(doc, response.profileUrl);
			renderListPanel(
				doc,
				tracksContainer,
				response.recenttracks.track,
				(t) => {
					const artistName = t.artist["#text"];
					const stack = createElement(doc, "div", { className: "media-stack" });
					stack.appendChild(
						createMediaTitle(doc, t.name, getTrackUrl(t, artistName)),
					);
					stack.appendChild(
						createTextOrLink(
							doc,
							artistName,
							getArtistUrl(t, artistName),
							"media-meta-sm",
						),
					);
					return createMediaItem(doc, false, stack);
				},
			);
			return true;
		},
	);
}

await bootPage("lastfm", initLastFmPage);
