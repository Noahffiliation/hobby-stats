export const revalidate = 3600;

export function getMalUsername(): string {
	return process.env.NEXT_PUBLIC_MAL_USERNAME || 'Noahffiliation';
}

export interface RawAnimeItem {
	anime_id: number;
	anime_title: string;
	anime_title_eng?: string;
	anime_num_episodes?: number;
	num_watched_episodes?: number;
	score?: number;
	anime_media_type_string?: string;
	anime_image_path?: string;
	status?: number;
	updated_at?: number;
}

export interface AnimeItem {
	id: number;
	title: string;
	episodes?: number;
	watchedEpisodes?: number;
	score?: number;
	mediaType?: string;
}

export interface AnimeListResponse {
	totalPlanToWatch?: number;
	totalCompleted?: number;
	planToWatch: AnimeItem[];
	completed: AnimeItem[];
	watching?: AnimeItem[];
}

const COMPLETED_REGEX = /href="[^"]*status=2"[^>]*>[^<]*<\/a>\s*<span[^>]*>([0-9,]+)<\/span>/i;
const PTW_REGEX = /href="[^"]*status=6"[^>]*>[^<]*<\/a>\s*<span[^>]*>([0-9,]+)<\/span>/i;

export async function GET() {
	const username = getMalUsername();
	const headers = {
		'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
		Accept: 'application/json, text/javascript, */*; q=0.01',
	};

	try {
		const [ptwRes, compRes, profileRes] = await Promise.all([
			fetch(`https://myanimelist.net/animelist/${username}/load.json?offset=0&status=6`, { headers }),
			fetch(`https://myanimelist.net/animelist/${username}/load.json?offset=0&status=2`, { headers }),
			fetch(`https://myanimelist.net/profile/${username}`, { headers }),
		]);

		if (ptwRes.ok && compRes.ok) {
			const [ptwData, compData]: [RawAnimeItem[], RawAnimeItem[]] = await Promise.all([
				ptwRes.json(),
				compRes.json(),
			]);

			let totalCompleted: number | undefined = compData.length;
			let totalPlanToWatch: number | undefined = ptwData.length;

			if (profileRes.ok) {
				const profileHtml = await profileRes.text();
				const completedCountMatch = COMPLETED_REGEX.exec(profileHtml);
				const ptwCountMatch = PTW_REGEX.exec(profileHtml);

				if (completedCountMatch) {
					totalCompleted = Number.parseInt(completedCountMatch[1].replaceAll(',', ''), 10);
				}
				if (ptwCountMatch) {
					totalPlanToWatch = Number.parseInt(ptwCountMatch[1].replaceAll(',', ''), 10);
				}
			}

			return Response.json({
				totalPlanToWatch,
				totalCompleted,
				planToWatch: ptwData.map((item) => ({
					id: item.anime_id,
					title: item.anime_title_eng || item.anime_title,
					episodes: item.anime_num_episodes,
					mediaType: item.anime_media_type_string,
				})),
				completed: compData.map((item) => ({
					id: item.anime_id,
					title: item.anime_title_eng || item.anime_title,
					episodes: item.anime_num_episodes,
					watchedEpisodes: item.num_watched_episodes,
					score: item.score,
					mediaType: item.anime_media_type_string,
				})),
			});
		}
	} catch {
		// Handled by returning 502 error below
	}

	return Response.json({ error: 'Failed to fetch anime list' }, { status: 502 });
}
