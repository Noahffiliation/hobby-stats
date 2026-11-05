import { DEFAULT_BROWSER_UA } from "../src/lib/mal-utils.js";
import { jsonError, jsonOk } from "../src/lib/response.js";

export function getLastfmUsername() {
	return (
		process.env.LASTFM_USERNAME ||
		process.env.NEXT_PUBLIC_LASTFM_USERNAME ||
		"noahffiliation"
	);
}

export async function GET() {
	const username = encodeURIComponent(getLastfmUsername());
	const apiKey = encodeURIComponent(
		process.env.LASTFM_API_KEY || process.env.NEXT_PUBLIC_LASTFM_API_KEY || "",
	);

	try {
		const response = await fetch(
			`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${apiKey}&format=json`,
			{
				method: "GET",
				headers: {
					"User-Agent": DEFAULT_BROWSER_UA,
					Accept: "application/json",
				},
			},
		);

		if (!response.ok) {
			return jsonError("Failed to fetch Last.fm stats", response.status);
		}

		const data = await response.json();
		return jsonOk(data);
	} catch {
		return jsonError("Failed to fetch Last.fm stats", 502);
	}
}
