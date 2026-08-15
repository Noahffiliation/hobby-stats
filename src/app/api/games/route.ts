export const revalidate = 3600;

export function getBackloggdUsername(): string {
	return process.env.NEXT_PUBLIC_BACKLOGGD_USERNAME || 'Noahffiliation';
}

export interface GameItem {
	title: string;
	platform?: string;
	status?: string;
	date?: string;
}

export interface GamesListResponse {
	totalBacklog?: number;
	totalPlayed?: number;
	backlog: GameItem[];
	played: GameItem[];
}

const PLAYED_REGEX = /href="\/u\/[^/]+\/played\/[^"]*"[^>]*>\s*<h\d+>\s*([0-9,]+)\s*<\/h\d+>/i;
const BACKLOG_REGEX = /href="\/u\/[^/]+\/backlog\/[^"]*"[^>]*>\s*<h\d+>\s*([0-9,]+)\s*<\/h\d+>/i;

function cleanGameTitle(raw: string): string {
	return raw
		.replaceAll('&#39;', "'")
		.replaceAll('&amp;', '&')
		.replaceAll('&quot;', '"')
		.trim();
}

export function parseProfileStats(html: string): { totalPlayed?: number; totalBacklog?: number } {
	const playedMatch = PLAYED_REGEX.exec(html);
	const backlogMatch = BACKLOG_REGEX.exec(html);

	const totalPlayed = playedMatch ? Number.parseInt(playedMatch[1].replaceAll(',', ''), 10) : undefined;
	const totalBacklog = backlogMatch ? Number.parseInt(backlogMatch[1].replaceAll(',', ''), 10) : undefined;

	return { totalPlayed, totalBacklog };
}

export function parseBacklogHtml(html: string): GameItem[] {
	if (html.includes('Making sure you&#39;re not a bot!')) {
		return [];
	}

	const backlog: GameItem[] = [];
	const matches = [...html.matchAll(/<div class="[^"]*game-cover[^"]*"[^>]*>[\s\S]*?<img [^>]*alt="([^"]+)"/gi)];
	for (const m of matches) {
		const title = cleanGameTitle(m[1]);
		if (title && !backlog.some(b => b.title === title)) {
			backlog.push({ title });
		}
	}
	return backlog;
}

export function parseReviewCard(sec: string): GameItem | null {
	const titleMatch = /<img[^>]*alt="([^"]+)"/i.exec(sec);
	if (!titleMatch) return null;

	const title = cleanGameTitle(titleMatch[1]);
	const statusMatch = /<p class="mb-0 play-type [^"]*">([^<]+)<\/p>/i.exec(sec);
	const platformMatch = /class="[^"]*review-platform"[^>]*><p class="mb-0">([^<]+)<\/p>/i.exec(sec);
	const dateMatch = /<time[^>]*>([^<]+)<\/time>/i.exec(sec);

	return {
		title,
		status: statusMatch?.[1]?.trim(),
		platform: platformMatch?.[1]?.trim(),
		date: dateMatch?.[1]?.trim(),
	};
}

export function parseReviewsHtml(html: string): GameItem[] {
	if (html.includes('Making sure you&#39;re not a bot!')) {
		return [];
	}

	const played: GameItem[] = [];
	const sections = html.split('review-card');
	for (let i = 1; i < sections.length; i++) {
		const item = parseReviewCard(sections[i]);
		if (item && !played.some(p => p.title === item.title)) {
			played.push(item);
		}
	}
	return played;
}

export function aggregatePlayedGames(reviewsHtmls: string[]): GameItem[] {
	const played: GameItem[] = [];
	for (const html of reviewsHtmls) {
		const items = parseReviewsHtml(html);
		for (const item of items) {
			if (!played.some(p => p.title === item.title)) {
				played.push(item);
			}
		}
	}
	return played;
}

export async function extractFulfilledText(res: PromiseSettledResult<Response>): Promise<string | null> {
	if (res.status === 'fulfilled' && res.value.ok) {
		return res.value.text();
	}
	return null;
}

export async function GET() {
	const username = getBackloggdUsername();
	const headers = {
		'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
		Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	};

	try {
		const [profileRes, backlogRes, reviewsRes1, reviewsRes2] = await Promise.allSettled([
			fetch(`https://backloggd.com/u/${username}/`, { headers }),
			fetch(`https://backloggd.com/u/${username}/backlog`, { headers }),
			fetch(`https://backloggd.com/u/${username}/reviews/`, { headers }),
			fetch(`https://backloggd.com/u/${username}/reviews?page=2`, { headers }),
		]);

		const [profileHtml, backlogHtml, reviewsHtml1, reviewsHtml2] = await Promise.all([
			extractFulfilledText(profileRes),
			extractFulfilledText(backlogRes),
			extractFulfilledText(reviewsRes1),
			extractFulfilledText(reviewsRes2),
		]);

		const stats = profileHtml ? parseProfileStats(profileHtml) : {};
		const backlog = backlogHtml ? parseBacklogHtml(backlogHtml) : [];
		const validReviewsHtmls = [reviewsHtml1, reviewsHtml2].filter((html): html is string => html !== null);
		const played = aggregatePlayedGames(validReviewsHtmls);

		return Response.json({
			totalBacklog: stats.totalBacklog,
			totalPlayed: stats.totalPlayed,
			backlog,
			played,
		});
	} catch {
		return Response.json({ error: 'Failed to fetch games data' }, { status: 502 });
	}
}
