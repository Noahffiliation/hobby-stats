import {
	DEFAULT_BROWSER_UA,
	getMalUsername,
	parseMalProfileCounts,
} from "../src/lib/mal-utils.js";
import { jsonError, jsonOk } from "../src/lib/response.js";

export async function GET() {
	const username = encodeURIComponent(getMalUsername());
	try {
		const response = await fetch(
			`https://myanimelist.net/profile/${username}`,
			{
				method: "GET",
				headers: {
					"User-Agent": DEFAULT_BROWSER_UA,
					Accept:
						"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
				},
			},
		);

		if (response.ok) {
			const html = await response.text();
			const { completed, planToWatch } = parseMalProfileCounts(html);

			if (completed !== undefined && planToWatch !== undefined) {
				return jsonOk({ completed, planToWatch });
			}
		}
	} catch {
		// Handled by returning 502 error below
	}

	return jsonError("Failed to fetch MyAnimeList stats", 502);
}
