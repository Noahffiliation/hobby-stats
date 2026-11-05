import {
	collectMdlPages,
	fetchMdlOverview,
	getMdlFallbackStats,
} from "../src/lib/mydramalist-utils.js";
import { jsonOk } from "../src/lib/response.js";

function decodeHtmlEntities(str) {
	return str
		.replaceAll("&lt;", "<")
		.replaceAll("&gt;", ">")
		.replaceAll("&quot;", '"')
		.replaceAll("&#39;", "'")
		.replaceAll("&amp;", "&");
}

export function parseSingleDramaRow(rowHtml) {
	const titleMatch =
		/<td[^>]*class="[^"]*msv2-i-title[^"]*"[^>]*>[\s\S]*?<a[^>]*title="([^"]+)"/i.exec(
			rowHtml,
		) ||
		/<td[^>]*class="[^"]*msv2-i-title[^"]*"[^>]*>[\s\S]*?<a[^>]*class="title"[^>]*><span>([^<]+)<\/span>/i.exec(
			rowHtml,
		) ||
		/<div class="msv2-item--title"><a[^>]*title="([^"]+)"/i.exec(rowHtml) ||
		/<div class="msv2-item--title"><a[^>]*>([^<]+)<\/a>/i.exec(rowHtml);

	if (!titleMatch) return null;

	const title = decodeHtmlEntities(titleMatch[1].trim());
	const yearMatch = /<td class="msv2-i-year">([^<]+)<\/td>/i.exec(rowHtml);
	const typeMatch = /<td class="msv2-i-type">([^<]+)<\/td>/i.exec(rowHtml);
	const countryMatch = /<td class="msv2-i-country">([^<]+)<\/td>/i.exec(
		rowHtml,
	);
	const scoreMatch =
		/<td class="msv2-i-score">[\s\S]*?<span class="score">([\d.]+)<\/span>/i.exec(
			rowHtml,
		);
	const progressMatch =
		/<td class="msv2-i-progress">[\s\S]*?<span class="num-seen">(\d+)<\/span>\/<span class="num-total">(\d+)<\/span>/i.exec(
			rowHtml,
		);

	let episodes;
	if (progressMatch) {
		episodes = `${progressMatch[1]}/${progressMatch[2]}`;
	}

	let score;
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

export function parseMdlRows(html) {
	if (!html) return [];
	const items = [];
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

function resolveTotalCount(parsed, itemsCount, fallbackCount) {
	if (parsed !== undefined) return parsed;
	if (itemsCount > 0) return itemsCount;
	return fallbackCount;
}

export async function GET() {
	const { mainHtml, profileStats } = await fetchMdlOverview();

	const [completed, planToWatch] = mainHtml
		? await Promise.all([
				collectMdlPages("completed", 20, parseMdlRows),
				collectMdlPages("plan_to_watch", 20, parseMdlRows),
			])
		: [[], []];

	const fallback = getMdlFallbackStats();
	const totalCompleted = resolveTotalCount(
		profileStats.completed,
		completed.length,
		fallback?.completed,
	);
	const totalPlanToWatch = resolveTotalCount(
		profileStats.planToWatch,
		planToWatch.length,
		fallback?.planToWatch,
	);

	return jsonOk({
		totalPlanToWatch,
		totalCompleted,
		planToWatch,
		completed,
	});
}
