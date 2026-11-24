import {
	BACKLOG_REGEX,
	fetchBackloggdHtml,
	getBackloggdFallbackStats,
	getBackloggdUsername,
	PLAYED_REGEX,
} from "../src/lib/backloggd-utils.js";
import { parseCountMatch } from "../src/lib/mal-utils.js";
import { jsonOk } from "../src/lib/response.js";
import { resolveOriginUrl } from "../src/lib/url-utils.js";

const BACKLOGGD_ORIGIN = "https://backloggd.com";

function extractBackloggdGameUrl(section, previousSection = "") {
	const withoutTrailingOpenAnchor = section.replace(/<a\b[^>]*>\s*$/i, "");
	const innerMatch = /href="(\/games\/[^/"]+\/?)"/i.exec(
		withoutTrailingOpenAnchor,
	);
	if (innerMatch) {
		return resolveOriginUrl(innerMatch[1], BACKLOGGD_ORIGIN);
	}
	const outerMatch = /<a\b[^>]*href="(\/games\/[^/"]+\/?)"[^>]*>\s*$/i.exec(
		previousSection,
	);
	return outerMatch
		? resolveOriginUrl(outerMatch[1], BACKLOGGD_ORIGIN)
		: undefined;
}

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
	const sections = html.split(/<div class="[^"]*game-cover[^"]*"[^>]*>/i);
	for (let i = 1; i < sections.length; i++) {
		const titleMatch = /<img[^>]*alt="([^"]+)"/i.exec(sections[i]);
		if (!titleMatch) continue;
		const url = extractBackloggdGameUrl(sections[i], sections[i - 1]);
		pushUniqueByTitle(backlog, seen, {
			title: cleanGameTitle(titleMatch[1]),
			...(url ? { url } : {}),
		});
	}
	return backlog;
}

export function parseReviewCard(sec) {
	const titleMatch = /<img[^>]*alt="([^"]+)"/i.exec(sec);
	if (!titleMatch) return null;

	const url = extractBackloggdGameUrl(sec);
	const statusMatch = /<p class="mb-0 play-type [^"]*">([^<]+)<\/p>/i.exec(sec);
	const platformMatch =
		/class="[^"]*review-platform"[^>]*><p class="mb-0">([^<]+)<\/p>/i.exec(sec);
	const dateMatch = /<time[^>]*>([^<]+)<\/time>/i.exec(sec);

	return {
		title: cleanGameTitle(titleMatch[1]),
		...(url ? { url } : {}),
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
		profileUrl: `${BACKLOGGD_ORIGIN}/u/${username}/`,
		totalBacklog: stats.totalBacklog,
		totalPlayed: stats.totalPlayed,
		backlog,
		played,
	});
}
