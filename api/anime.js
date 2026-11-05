import {
	DEFAULT_BROWSER_UA,
	getMalUsername,
	parseMalProfileCounts,
} from "../src/lib/mal-utils.js";
import { jsonError, jsonOk } from "../src/lib/response.js";

function mapBaseAnime(item) {
	return {
		id: item.anime_id,
		title: item.anime_title_eng || item.anime_title,
		episodes: item.anime_num_episodes,
		mediaType: item.anime_media_type_string,
	};
}

export async function GET() {
	const username = encodeURIComponent(getMalUsername());
	const headers = {
		"User-Agent": DEFAULT_BROWSER_UA,
		Accept: "application/json, text/javascript, */*; q=0.01",
	};

	try {
		const [ptwRes, compRes, profileRes] = await Promise.all([
			fetch(
				`https://myanimelist.net/animelist/${username}/load.json?offset=0&status=6`,
				{ headers },
			),
			fetch(
				`https://myanimelist.net/animelist/${username}/load.json?offset=0&status=2`,
				{ headers },
			),
			fetch(`https://myanimelist.net/profile/${username}`, { headers }),
		]);

		if (ptwRes.ok && compRes.ok) {
			const [ptwData, compData] = await Promise.all([
				ptwRes.json(),
				compRes.json(),
			]);

			let totalCompleted = compData.length;
			let totalPlanToWatch = ptwData.length;

			if (profileRes.ok) {
				const parsed = parseMalProfileCounts(await profileRes.text());
				totalCompleted = parsed.completed ?? totalCompleted;
				totalPlanToWatch = parsed.planToWatch ?? totalPlanToWatch;
			}

			return jsonOk({
				totalPlanToWatch,
				totalCompleted,
				planToWatch: ptwData.map(mapBaseAnime),
				completed: compData.map((item) => ({
					...mapBaseAnime(item),
					watchedEpisodes: item.num_watched_episodes,
					score: item.score,
				})),
			});
		}
	} catch {
		// Handled by returning 502 error below
	}

	return jsonError("Failed to fetch anime list", 502);
}
