import * as defaultApi from "../api.js";
import {
	bootPage,
	createProgress,
	renderError,
	runAsyncSection,
} from "../components.js";

function logRejections(results) {
	for (const res of results) {
		if (res.status === "rejected") {
			console.error(res.reason);
		}
	}
}

function settledOrZero(result, mapValue) {
	return result.status === "fulfilled" ? mapValue(result.value) : 0;
}

function computeStats([
	statsRes,
	watchlistMoviesRes,
	watchedShowsRes,
	watchlistShowsRes,
	backloggdRes,
	malRes,
	mdlRes,
]) {
	const moviesWatched = settledOrZero(statsRes, (v) => v.movies.watched);
	const moviesWatchlist = settledOrZero(watchlistMoviesRes, (v) => v.length);
	const showsWatched = settledOrZero(watchedShowsRes, (v) => v);
	const showsWatchlist = settledOrZero(watchlistShowsRes, (v) => v.length);
	const gamesPlayed = settledOrZero(backloggdRes, (v) => v.played);
	const gamesBacklog = settledOrZero(backloggdRes, (v) => v.backlog);
	const animeCompleted = settledOrZero(malRes, (v) => v.completed);
	const animePlanToWatch = settledOrZero(malRes, (v) => v.planToWatch);
	const dramasCompleted = settledOrZero(mdlRes, (v) => v.completed);
	const dramasPlanToWatch = settledOrZero(mdlRes, (v) => v.planToWatch);

	return [
		["Game Progress", gamesPlayed, gamesPlayed + gamesBacklog],
		["Movie Progress", moviesWatched, moviesWatched + moviesWatchlist],
		["Show Progress", showsWatched, showsWatched + showsWatchlist],
		["Anime Progress", animeCompleted, animeCompleted + animePlanToWatch],
		["K-Drama Progress", dramasCompleted, dramasCompleted + dramasPlanToWatch],
	];
}

function calcPercent(done, total) {
	return total === 0 ? 0 : (done / total) * 100;
}

export async function initHomePage(
	doc = globalThis.document,
	api = defaultApi,
) {
	const statusContainer = doc.getElementById("status-feedback");
	const dashboardPanel = doc.getElementById("dashboard-panel");
	if (!statusContainer || !dashboardPanel) return;

	const errorMessage = "Unable to load stats. Please try again later.";
	await runAsyncSection(
		statusContainer,
		dashboardPanel,
		{ loadingMessage: "Loading stats...", errorMessage },
		async () => {
			const results = await Promise.allSettled([
				api.getTraktStats(),
				api.getWatchlistMovies(),
				api.getWatchedShows(),
				api.getWatchlistShows(),
				api.getBackloggdStats(),
				api.getMyAnimeListStats(),
				api.getMyDramaListStats(),
			]);

			logRejections(results);

			if (results.every((res) => res.status === "rejected")) {
				renderError(statusContainer, errorMessage);
				return false;
			}

			const rows = computeStats(results);
			dashboardPanel.replaceChildren(
				...rows.map(([title, done, total]) =>
					createProgress(doc, {
						label: `${title} - ${done} / ${total}`,
						showValueLabel: true,
						value: calcPercent(done, total),
					}),
				),
			);
			return true;
		},
	);
}

await bootPage("home", initHomePage);
