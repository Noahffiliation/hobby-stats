import { COMPLETED_REGEX, fetchMdlHtml, getMdlUsername, PTW_REGEX } from '../mydramalist/utils';

export const revalidate = 3600;

export { getCurlBin, getMdlUsername } from '../mydramalist/utils';

export interface DramaItem {
	title: string;
	year?: number | string;
	type?: string;
	country?: string;
	episodes?: string | number;
	score?: number | string;
}

export interface DramaListResponse {
	totalPlanToWatch?: number;
	totalCompleted?: number;
	planToWatch: DramaItem[];
	completed: DramaItem[];
}

function decodeHtmlEntities(str: string): string {
	return str
		.replaceAll('&amp;', '&')
		.replaceAll('&lt;', '<')
		.replaceAll('&gt;', '>')
		.replaceAll('&quot;', '"')
		.replaceAll('&#39;', "'");
}

export function parseSingleDramaRow(rowHtml: string): DramaItem | null {
	const titleMatch =
		/<td[^>]*class="[^"]*msv2-i-title[^"]*"[^>]*>[\s\S]*?<a[^>]*title="([^"]+)"/i.exec(rowHtml) ||
		/<td[^>]*class="[^"]*msv2-i-title[^"]*"[^>]*>[\s\S]*?<a[^>]*class="title"[^>]*><span>([^<]+)<\/span>/i.exec(rowHtml) ||
		/<div class="msv2-item--title"><a[^>]*title="([^"]+)"/i.exec(rowHtml) ||
		/<div class="msv2-item--title"><a[^>]*>([^<]+)<\/a>/i.exec(rowHtml);

	if (!titleMatch) return null;

	const title = decodeHtmlEntities(titleMatch[1].trim());
	const yearMatch = /<td class="msv2-i-year">([^<]+)<\/td>/i.exec(rowHtml);
	const typeMatch = /<td class="msv2-i-type">([^<]+)<\/td>/i.exec(rowHtml);
	const countryMatch = /<td class="msv2-i-country">([^<]+)<\/td>/i.exec(rowHtml);
	const scoreMatch = /<td class="msv2-i-score">[\s\S]*?<span class="score">([\d.]+)<\/span>/i.exec(rowHtml);
	const progressMatch = /<td class="msv2-i-progress">[\s\S]*?<span class="num-seen">(\d+)<\/span>\/<span class="num-total">(\d+)<\/span>/i.exec(rowHtml);

	let episodes: string | undefined;
	if (progressMatch) {
		episodes = `${progressMatch[1]}/${progressMatch[2]}`;
	}

	let score: number | undefined;
	if (scoreMatch) {
		const parsed = Number.parseFloat(scoreMatch[1]);
		if (parsed > 0) score = parsed;
	}

	return {
		title,
		year: yearMatch ? yearMatch[1].trim() : undefined,
		type: typeMatch ? typeMatch[1].trim() : undefined,
		country: countryMatch ? countryMatch[1].trim() : undefined,
		episodes,
		score,
	};
}

export function parseMdlRows(html: string | null): DramaItem[] {
	if (!html) return [];
	const items: DramaItem[] = [];
	const rowRegex = /<tr[^>]*id="ml\d+"[^>]*>([\s\S]*?)<\/tr>/gi;
	let match;

	while ((match = rowRegex.exec(html)) !== null) {
		const row = parseSingleDramaRow(match[1]);
		if (row) {
			items.push(row);
		}
	}

	return items;
}

async function fetchAllMdlList(statusPath: 'completed' | 'plan_to_watch'): Promise<DramaItem[]> {
	const username = getMdlUsername();
	let page = 1;
	const allItems: DramaItem[] = [];

	while (page <= 20) {
		const url = `https://mydramalist.com/dramalist/${username}/${statusPath}`;
		const html = page === 1 ? await fetchMdlHtml(url) : await fetchMdlHtml(url, { page, username });
		const items = parseMdlRows(html);
		if (items.length === 0) break;
		allItems.push(...items);
		if (items.length < 100) break;
		page++;
	}

	return allItems;
}

export async function GET() {
	const username = getMdlUsername();
	const mainHtml = await fetchMdlHtml(`https://mydramalist.com/dramalist/${username}`);

	let totalCompleted: number | undefined;
	let totalPlanToWatch: number | undefined;

	if (mainHtml) {
		const completedMatch = COMPLETED_REGEX.exec(mainHtml);
		const ptwMatch = PTW_REGEX.exec(mainHtml);

		if (completedMatch) {
			totalCompleted = Number.parseInt(completedMatch[1].replaceAll(',', ''), 10);
		}
		if (ptwMatch) {
			totalPlanToWatch = Number.parseInt(ptwMatch[1].replaceAll(',', ''), 10);
		}
	}

	const [completed, planToWatch] = await Promise.all([
		fetchAllMdlList('completed'),
		fetchAllMdlList('plan_to_watch'),
	]);

	if (totalCompleted === undefined && completed.length > 0) {
		totalCompleted = completed.length;
	}
	if (totalPlanToWatch === undefined && planToWatch.length > 0) {
		totalPlanToWatch = planToWatch.length;
	}

	return Response.json({
		totalPlanToWatch,
		totalCompleted,
		planToWatch,
		completed,
	});
}
