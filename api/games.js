import {
	BACKLOG_REGEX,
	fetchBackloggdHtml,
	getBackloggdFallbackStats,
	getBackloggdUsername,
	PLAYED_REGEX,
} from "../src/lib/backloggd-utils.js";
import { parseCountMatch } from "../src/lib/mal-utils.js";
import { jsonOk } from "../src/lib/response.js";

function cleanGameTitle(raw) {
	return raw
		.replaceAll("&#39;", "'")
		.replaceAll("&quot;", '"')
		.replaceAll("&amp;", "&")
		.trim();
}

function pushUniqueByTitle(list, seen, item) {
	if (item?.title && !seen.has(item.title)) {
		seen.add(item.title);
		list.push(item);
	}
}

export function parseProfileStats(html) {
	return {
		totalPlayed: parseCountMatch(PLAYED_REGEX, html),
		totalBacklog: parseCountMatch(BACKLOG_REGEX, html),
	};
}

export function parseBacklogHtml(html) {
	if (html.includes("Making sure you&#39;re not a bot!")) {
		return [];
	}

	const backlog = [];
	const seen = new Set();
	const matches = html.matchAll(
		/<div class="[^"]*game-cover[^"]*"[^>]*>[\s\S]*?<img [^>]*alt="([^"]+)"/gi,
	);
	for (const m of matches) {
		pushUniqueByTitle(backlog, seen, { title: cleanGameTitle(m[1]) });
	}
	return backlog;
}

export function parseReviewCard(sec) {
	const titleMatch = /<img[^>]*alt="([^"]+)"/i.exec(sec);
	if (!titleMatch) return null;

	const statusMatch = /<p class="mb-0 play-type [^"]*">([^<]+)<\/p>/i.exec(sec);
	const platformMatch =
		/class="[^"]*review-platform"[^>]*><p class="mb-0">([^<]+)<\/p>/i.exec(sec);
	const dateMatch = /<time[^>]*>([^<]+)<\/time>/i.exec(sec);

	return {
		title: cleanGameTitle(titleMatch[1]),
		status: statusMatch ? statusMatch[1].trim() : undefined,
		platform: platformMatch ? platformMatch[1].trim() : undefined,
		date: dateMatch ? dateMatch[1].trim() : undefined,
	};
}

export function parseReviewsHtml(html) {
	if (html.includes("Making sure you&#39;re not a bot!")) {
		return [];
	}

	const played = [];
	const seen = new Set();
	const sections = html.split("review-card");
	for (let i = 1; i < sections.length; i++) {
		pushUniqueByTitle(played, seen, parseReviewCard(sections[i]));
	}
	return played;
}

export function aggregatePlayedGames(reviewsHtmls) {
	const played = [];
	const seen = new Set();
	for (const html of reviewsHtmls) {
		for (const item of parseReviewsHtml(html)) {
			pushUniqueByTitle(played, seen, item);
		}
	}
	return played;
}

export async function extractFulfilledText(res) {
	if (res.status === "fulfilled" && res.value.ok) {
		return res.value.text();
	}
	return null;
}

export async function GET() {
	const username = encodeURIComponent(getBackloggdUsername());

	const [profileHtml, backlogHtml, reviewsHtml1, reviewsHtml2] =
		await Promise.all([
			fetchBackloggdHtml(`https://backloggd.com/u/${username}/`),
			fetchBackloggdHtml(`https://backloggd.com/u/${username}/backlog`),
			fetchBackloggdHtml(`https://backloggd.com/u/${username}/reviews/`),
			fetchBackloggdHtml(`https://backloggd.com/u/${username}/reviews?page=2`),
		]);

	const stats = profileHtml ? parseProfileStats(profileHtml) : {};
	const fallback = getBackloggdFallbackStats();
	if (fallback) {
		stats.totalBacklog ??= fallback.backlog;
		stats.totalPlayed ??= fallback.played;
	}
	const backlog = backlogHtml ? parseBacklogHtml(backlogHtml) : [];
	const validReviewsHtmls = [reviewsHtml1, reviewsHtml2].filter(
		(html) => html !== null,
	);
	const played = aggregatePlayedGames(validReviewsHtmls);

	return jsonOk({
		totalBacklog: stats.totalBacklog,
		totalPlayed: stats.totalPlayed,
		backlog,
		played,
	});
}
