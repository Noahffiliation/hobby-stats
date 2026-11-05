import {
	collectMdlPages,
	fetchMdlOverview,
	getMdlFallbackStats,
} from "../src/lib/mydramalist-utils.js";
import { jsonError, jsonOk } from "../src/lib/response.js";

function extractRowMatches(html) {
	return [...html.matchAll(/<tr id="ml\d+">/gi)];
}

async function resolveStatsCount(current, statusPath) {
	if (current !== undefined) return current;
	const matches = await collectMdlPages(statusPath, 10, extractRowMatches);
	return matches.length > 0 ? matches.length : undefined;
}

export async function GET() {
	const { mainHtml, profileStats } = await fetchMdlOverview();
	let { completed, planToWatch } = profileStats;

	if (mainHtml) {
		completed = await resolveStatsCount(completed, "completed");
		planToWatch = await resolveStatsCount(planToWatch, "plan_to_watch");
	}

	if (completed === undefined || planToWatch === undefined) {
		const fallback = getMdlFallbackStats();
		if (fallback) {
			completed ??= fallback.completed;
			planToWatch ??= fallback.planToWatch;
		}
	}

	if (completed !== undefined && planToWatch !== undefined) {
		return jsonOk({ completed, planToWatch });
	}

	return jsonError("Failed to fetch MyDramaList stats", 502);
}
