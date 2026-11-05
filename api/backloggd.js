import {
	BACKLOG_REGEX,
	fetchBackloggdHtml,
	getBackloggdFallbackStats,
	getBackloggdUsername,
	PLAYED_REGEX,
} from "../src/lib/backloggd-utils.js";
import { parseCountMatch } from "../src/lib/mal-utils.js";
import { jsonError, jsonOk } from "../src/lib/response.js";

export async function GET() {
	const username = encodeURIComponent(getBackloggdUsername());
	const html = await fetchBackloggdHtml(`https://backloggd.com/u/${username}/`);

	if (html) {
		const played = parseCountMatch(PLAYED_REGEX, html);
		const backlog = parseCountMatch(BACKLOG_REGEX, html);

		if (played !== undefined && backlog !== undefined) {
			return jsonOk({ played, backlog });
		}
	}

	const fallback = getBackloggdFallbackStats();
	if (fallback) {
		return jsonOk(fallback);
	}

	return jsonError("Failed to fetch Backloggd stats", 502);
}
