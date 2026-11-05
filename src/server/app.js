import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GET as getAnime } from "../../api/anime.js";
import { GET as getBackloggd } from "../../api/backloggd.js";
import { GET as getDramas } from "../../api/dramas.js";
import { GET as getGames } from "../../api/games.js";
import { GET as getLastfm } from "../../api/lastfm.js";
import { GET as getMyAnimeList } from "../../api/myanimelist.js";
import { GET as getMyDramaList } from "../../api/mydramalist.js";
import { GET as getTrakt } from "../../api/trakt.js";
import { ResponseCache } from "./cache.js";

const DEFAULT_PUBLIC_DIR = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../public",
);

const SECURITY_HEADERS = {
	"X-Content-Type-Options": "nosniff",
	"X-Frame-Options": "SAMEORIGIN",
	"Referrer-Policy": "strict-origin-when-cross-origin",
	"Cross-Origin-Opener-Policy": "same-origin-allow-popups",
	"Permissions-Policy": "camera=(), geolocation=(), microphone=()",
};

const MIME_TYPES = {
	".html": "text/html; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".mjs": "text/javascript; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".ico": "image/x-icon",
	".svg": "image/svg+xml",
	".png": "image/png",
	".webp": "image/webp",
	".txt": "text/plain; charset=utf-8",
};

const API_ROUTES = new Map([
	[
		"/api/anime",
		{ canonicalUrl: "http://localhost/api/anime", handler: getAnime },
	],
	[
		"/api/backloggd",
		{ canonicalUrl: "http://localhost/api/backloggd", handler: getBackloggd },
	],
	[
		"/api/dramas",
		{ canonicalUrl: "http://localhost/api/dramas", handler: getDramas },
	],
	[
		"/api/games",
		{ canonicalUrl: "http://localhost/api/games", handler: getGames },
	],
	[
		"/api/lastfm",
		{ canonicalUrl: "http://localhost/api/lastfm", handler: getLastfm },
	],
	[
		"/api/myanimelist",
		{
			canonicalUrl: "http://localhost/api/myanimelist",
			handler: getMyAnimeList,
		},
	],
	[
		"/api/mydramalist",
		{
			canonicalUrl: "http://localhost/api/mydramalist",
			handler: getMyDramaList,
		},
	],
	[
		"/api/trakt",
		{ canonicalUrl: "http://localhost/api/trakt", handler: getTrakt },
	],
]);

const TRAKT_CANONICAL_URLS = new Map([
	["stats", "http://localhost/api/trakt?endpoint=stats"],
	["watched-shows", "http://localhost/api/trakt?endpoint=watched-shows"],
	["watchlist-movies", "http://localhost/api/trakt?endpoint=watchlist-movies"],
	["watchlist-shows", "http://localhost/api/trakt?endpoint=watchlist-shows"],
	["recent-movies", "http://localhost/api/trakt?endpoint=recent-movies"],
	["recent-episodes", "http://localhost/api/trakt?endpoint=recent-episodes"],
]);

const VERCEL_SCRIPT_STUBS = new Set([
	"/_vercel/insights/script.js",
	"/_vercel/speed-insights/script.js",
]);

const CLEAN_PAGE_TARGETS = new Map([
	["/", "/"],
	["/index", "/"],
	["/games", "/games"],
	["/movies", "/movies"],
	["/tv", "/tv"],
	["/anime", "/anime"],
	["/dramas", "/dramas"],
	["/lastfm", "/lastfm"],
]);

function sendResponse(res, status, headers, body, isHead) {
	res.writeHead(status, { ...SECURITY_HEADERS, ...headers });
	if (isHead) {
		res.end();
	} else {
		res.end(body);
	}
}

function sendNotFound(res, isHead) {
	sendResponse(
		res,
		404,
		{ "Content-Type": "text/plain; charset=utf-8" },
		"Not Found",
		isHead,
	);
}

function isSlashChar(code) {
	return code === 47 || code === 92;
}

function stripLeadingSlashes(value) {
	let start = 0;
	while (start < value.length && isSlashChar(value.codePointAt(start))) {
		start++;
	}
	return value.slice(start);
}

function stripTrailingSlashes(value) {
	let end = value.length;
	while (end > 0 && value.codePointAt(end - 1) === 47) {
		end--;
	}
	return value.slice(0, end);
}

function normalizePageCandidate(pathname) {
	const trimmed = stripTrailingSlashes(pathname) || "/";
	if (trimmed.endsWith(".html")) {
		return trimmed.slice(0, -5);
	}
	return trimmed;
}

function getCleanUrlRedirect(pathname, hadExtraLeadingSlashes) {
	const cleanTarget = CLEAN_PAGE_TARGETS.get(normalizePageCandidate(pathname));
	if (!cleanTarget) {
		return null;
	}
	if (cleanTarget === pathname && !hadExtraLeadingSlashes) {
		return null;
	}
	return cleanTarget;
}

function mapDecodedToRelative(decoded) {
	if (decoded === "/") {
		return "index.html";
	}
	return path.extname(decoded) ? decoded.slice(1) : `${decoded.slice(1)}.html`;
}

export function resolveSafeStaticPath(rootDir, pathname) {
	let decoded;
	try {
		decoded = decodeURIComponent(pathname);
	} catch {
		return null;
	}

	if (decoded.includes("\0")) {
		return null;
	}

	const resolved = path.resolve(rootDir, mapDecodedToRelative(decoded));
	if (!resolved.startsWith(`${rootDir}${path.sep}`)) {
		return null;
	}
	return resolved;
}

function resolveCanonicalApiUrl(route, searchParams) {
	if (route.handler !== getTrakt) {
		return route.canonicalUrl;
	}
	const endpoint = searchParams.get("endpoint") ?? "";
	return TRAKT_CANONICAL_URLS.get(endpoint) ?? route.canonicalUrl;
}

async function handleApiRequest(res, url, cache, isHead) {
	const normalizedApiPath = stripTrailingSlashes(url.pathname);
	const route = API_ROUTES.get(normalizedApiPath);

	if (!route) {
		sendResponse(
			res,
			404,
			{
				"Content-Type": "application/json; charset=utf-8",
				"Cache-Control": "no-store",
			},
			JSON.stringify({ error: "API endpoint not found" }),
			isHead,
		);
		return;
	}

	const canonicalUrl = resolveCanonicalApiUrl(route, url.searchParams);
	const result = await cache.getOrFetch(canonicalUrl, () =>
		route.handler({ url: canonicalUrl }),
	);
	sendResponse(
		res,
		result.status,
		{
			"Content-Type": "application/json; charset=utf-8",
			...result.headers,
		},
		result.body,
		isHead,
	);
}

async function handleStaticRequest(res, publicDir, pathname, isHead) {
	const filePath = resolveSafeStaticPath(publicDir, pathname);
	if (!filePath) {
		sendNotFound(res, isHead);
		return;
	}

	try {
		const stat = await fs.stat(filePath);
		if (!stat.isFile()) {
			sendNotFound(res, isHead);
			return;
		}

		const ext = path.extname(filePath).toLowerCase();
		const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
		const content = isHead ? "" : await fs.readFile(filePath);

		sendResponse(
			res,
			200,
			{
				"Content-Type": contentType,
				"Content-Length": String(stat.size),
			},
			content,
			isHead,
		);
	} catch {
		sendNotFound(res, isHead);
	}
}

export function createApp(options = {}) {
	const publicDir = path.resolve(options.publicDir ?? DEFAULT_PUBLIC_DIR);
	const cacheTtlMs =
		options.cacheTtlMs ??
		Number.parseInt(process.env.CACHE_TTL_MS ?? "3600000", 10);
	const cache = new ResponseCache(
		Number.isNaN(cacheTtlMs) ? 3_600_000 : cacheTtlMs,
	);

	async function handler(req, res) {
		const method = req.method ?? "GET";
		const isHead = method === "HEAD";

		if (method !== "GET" && !isHead) {
			sendResponse(
				res,
				405,
				{
					Allow: "GET, HEAD",
					"Content-Type": "application/json; charset=utf-8",
				},
				JSON.stringify({ error: "Method not allowed" }),
				false,
			);
			return;
		}

		const rawUrl = req.url || "/";
		const strippedUrl = stripLeadingSlashes(rawUrl);
		const hadExtraLeadingSlashes = rawUrl.length - strippedUrl.length > 1;
		const url = new URL(`/${strippedUrl}`, "http://localhost");
		const { pathname } = url;

		if (VERCEL_SCRIPT_STUBS.has(pathname)) {
			sendResponse(
				res,
				200,
				{
					"Content-Type": "text/javascript; charset=utf-8",
					"Cache-Control": "public, max-age=3600",
				},
				"/* Vercel telemetry stub outside Vercel runtime */\n",
				isHead,
			);
			return;
		}

		if (pathname === "/api" || pathname.startsWith("/api/")) {
			await handleApiRequest(res, url, cache, isHead);
			return;
		}

		const redirectLocation = getCleanUrlRedirect(
			pathname,
			hadExtraLeadingSlashes,
		);
		if (redirectLocation) {
			sendResponse(
				res,
				308,
				{
					Location: redirectLocation,
					"Content-Type": "text/plain; charset=utf-8",
				},
				`Redirecting to ${redirectLocation}`,
				isHead,
			);
			return;
		}

		await handleStaticRequest(res, publicDir, pathname, isHead);
	}

	handler.cache = cache;
	return handler;
}
