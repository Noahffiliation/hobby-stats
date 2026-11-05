import { Buffer } from "node:buffer";
import { execFile } from "node:child_process";
import http2 from "node:http2";
import zlib from "node:zlib";
import { DEFAULT_BROWSER_UA, parseCountMatch } from "./mal-utils.js";

export const COMPLETED_REGEX = /Completed[^(]*\(([\d,]+)\)/i;
export const PTW_REGEX = /Plan to Watch[^(]*\(([\d,]+)\)/i;

export function parseMdlProfileStats(html) {
	if (!html) return {};
	return {
		completed: parseCountMatch(COMPLETED_REGEX, html),
		planToWatch: parseCountMatch(PTW_REGEX, html),
	};
}

const CHROME_TLS13_CIPHERS =
	"TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256";
const CHROME_TLS_CIPHERS = [
	CHROME_TLS13_CIPHERS,
	"ECDHE-ECDSA-AES128-GCM-SHA256",
	"ECDHE-RSA-AES128-GCM-SHA256",
	"ECDHE-ECDSA-AES256-GCM-SHA384",
	"ECDHE-RSA-AES256-GCM-SHA384",
	"ECDHE-ECDSA-CHACHA20-POLY1305",
	"ECDHE-RSA-CHACHA20-POLY1305",
].join(":");
const CHROME_ECDH_CURVES = "X25519:prime256v1:secp384r1";
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export function getMdlUsername() {
	return (
		process.env.MDL_USERNAME ||
		process.env.NEXT_PUBLIC_MDL_USERNAME ||
		"Noahffiliation"
	);
}

export function getCurlBin(platform = process.platform) {
	if (process.env.MDL_CURL_BIN) {
		return process.env.MDL_CURL_BIN;
	}
	return platform === "win32"
		? String.raw`C:\Windows\System32\curl.exe`
		: "/usr/bin/curl";
}

export function getMdlCookie() {
	return process.env.MDL_COOKIE || process.env.NEXT_PUBLIC_MDL_COOKIE;
}

export function getMdlFallbackStats() {
	const completedStr =
		process.env.MDL_COMPLETED || process.env.NEXT_PUBLIC_MDL_COMPLETED;
	const ptwStr =
		process.env.MDL_PLAN_TO_WATCH || process.env.NEXT_PUBLIC_MDL_PLAN_TO_WATCH;

	if (completedStr !== undefined && ptwStr !== undefined) {
		const completed = Number.parseInt(completedStr, 10);
		const planToWatch = Number.parseInt(ptwStr, 10);
		if (!Number.isNaN(completed) && !Number.isNaN(planToWatch)) {
			return { completed, planToWatch };
		}
	}
	return null;
}

function getCustomMdlProxy() {
	return process.env.MDL_PROXY_URL || process.env.NEXT_PUBLIC_MDL_PROXY_URL;
}

function getScraperApiKey() {
	return process.env.SCRAPER_API_KEY || process.env.NEXT_PUBLIC_SCRAPER_API_KEY;
}

function formatCustomProxyUrl(template, targetUrl) {
	const encoded = encodeURIComponent(targetUrl);
	return template.includes("{url}")
		? template.replace("{url}", encoded)
		: `${template}${encoded}`;
}

function formatScraperApiUrl(apiKey, targetUrl) {
	return `https://api.scraperapi.com?api_key=${encodeURIComponent(apiKey)}&url=${encodeURIComponent(targetUrl)}`;
}

export function getMdlProxyUrl(targetUrl) {
	const customProxy = getCustomMdlProxy();
	if (customProxy) {
		return formatCustomProxyUrl(customProxy, targetUrl);
	}

	const scraperApiKey = getScraperApiKey();
	if (scraperApiKey) {
		return formatScraperApiUrl(scraperApiKey, targetUrl);
	}

	return null;
}

function sanitizeHtmlResult(text) {
	if (!text || text.includes("Just a moment...")) {
		return null;
	}
	return text;
}

async function handleProxyFailure(res) {
	const errText = await res.text().catch(() => "");
	if (res.status === 403 && errText.includes("exhausted the API Credits")) {
		console.warn(
			"[mydramalist] ScraperAPI monthly credits exhausted (HTTP 403); falling back.",
		);
	}
}

export async function fetchViaProxy(proxyUrl, postJson) {
	const requestInit = postJson
		? {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(postJson),
			}
		: { method: "GET" };

	try {
		const res = await fetch(proxyUrl, requestInit);
		if (!res.ok) {
			await handleProxyFailure(res);
			return null;
		}
		return sanitizeHtmlResult(await res.text());
	} catch {
		return null;
	}
}

function decompressBody(buffer, contentEncoding) {
	const enc = (contentEncoding || "").toLowerCase().trim();
	if (enc === "br") {
		return zlib.brotliDecompressSync(buffer);
	}
	if (enc === "gzip" || enc === "x-gzip") {
		return zlib.gunzipSync(buffer);
	}
	if (enc === "deflate") {
		return zlib.inflateSync(buffer);
	}
	return buffer;
}

function parseHttpsUrl(url) {
	try {
		const parsed = new URL(url);
		return parsed.protocol === "https:" ? parsed : null;
	} catch {
		return null;
	}
}

function buildHttp2Headers(parsedUrl, cookie, bodyBuffer) {
	const headers = {
		":method": bodyBuffer ? "POST" : "GET",
		":path": `${parsedUrl.pathname}${parsedUrl.search}`,
		"user-agent": DEFAULT_BROWSER_UA,
		accept: bodyBuffer
			? "text/html, */*; q=0.01"
			: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
		"accept-encoding": "gzip, deflate, br",
		"accept-language": "en-US,en;q=0.9",
	};

	if (cookie) {
		headers.cookie = cookie;
	}
	if (bodyBuffer) {
		headers["x-requested-with"] = "XMLHttpRequest";
		headers["content-type"] = "application/json";
		headers["content-length"] = String(bodyBuffer.byteLength);
	}
	return headers;
}

function closeHttp2Client(client, timer) {
	clearTimeout(timer);
	try {
		client?.close();
		client?.destroy();
	} catch {
		// Ignore session teardown errors
	}
}

function decodeHttp2Body(chunks, contentEncoding) {
	try {
		const raw = Buffer.concat(chunks);
		const decoded = decompressBody(raw, contentEncoding).toString("utf8");
		return sanitizeHtmlResult(decoded);
	} catch {
		return null;
	}
}

function resolveHttp2End(state, ctx) {
	const { statusCode, redirectLocation, chunks, contentEncoding } = state;
	if (
		REDIRECT_STATUSES.has(statusCode) &&
		redirectLocation &&
		ctx.redirectsLeft > 0
	) {
		const nextUrl = new URL(redirectLocation, ctx.parsedUrl).href;
		const nextPost =
			statusCode === 307 || statusCode === 308 ? ctx.postJson : undefined;
		ctx.redirectTo(nextUrl, nextPost);
		return;
	}

	if (statusCode < 200 || statusCode >= 300) {
		ctx.finish(null);
		return;
	}

	ctx.finish(decodeHttp2Body(chunks, contentEncoding));
}

function attachHttp2Listeners(req, ctx) {
	const state = {
		statusCode: 0,
		contentEncoding: "",
		redirectLocation: "",
		chunks: [],
		totalBytes: 0,
	};

	req.on("response", (headers) => {
		state.statusCode = Number(headers[":status"] || 0);
		state.contentEncoding = String(headers["content-encoding"] || "");
		state.redirectLocation = String(headers.location || "");
	});

	req.on("data", (chunk) => {
		state.totalBytes += chunk.length;
		if (state.totalBytes > ctx.maxBytes) {
			req.close();
			ctx.finish(null);
			return;
		}
		state.chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
	});

	req.on("error", () => ctx.finish(null));
	req.on("end", () => resolveHttp2End(state, ctx));
}

export function fetchViaHttp2(
	url,
	cookie,
	postJson,
	http2Impl = http2,
	redirectsLeft = 5,
	limits = {},
) {
	const parsedUrl = parseHttpsUrl(url);
	if (!parsedUrl) {
		return Promise.resolve(null);
	}

	const timeoutMs = limits.timeoutMs ?? 15000;
	const maxBytes = limits.maxBytes ?? 20 * 1024 * 1024;

	return new Promise((resolve) => {
		let settled = false;
		let client;
		let timer;

		const finish = (result) => {
			if (settled) return;
			settled = true;
			closeHttp2Client(client, timer);
			resolve(result);
		};

		const redirectTo = (nextUrl, nextPost) => {
			if (settled) return;
			settled = true;
			closeHttp2Client(client, timer);
			resolve(
				fetchViaHttp2(
					nextUrl,
					cookie,
					nextPost,
					http2Impl,
					redirectsLeft - 1,
					limits,
				),
			);
		};

		try {
			client = http2Impl.connect(parsedUrl.origin, {
				ciphers: CHROME_TLS_CIPHERS,
				ecdhCurve: CHROME_ECDH_CURVES,
			});

			timer = setTimeout(() => finish(null), timeoutMs);
			client.on("error", () => finish(null));

			const bodyBuffer = postJson
				? Buffer.from(JSON.stringify(postJson), "utf8")
				: null;
			const req = client.request(
				buildHttp2Headers(parsedUrl, cookie, bodyBuffer),
			);
			attachHttp2Listeners(req, {
				parsedUrl,
				postJson,
				redirectsLeft,
				maxBytes,
				finish,
				redirectTo,
			});
			req.end(bodyBuffer ?? undefined);
		} catch {
			finish(null);
		}
	});
}

function buildCurlArgs(url, cookie, postJson) {
	const args = [
		"-s",
		"-f",
		"-L",
		"-A",
		DEFAULT_BROWSER_UA,
		"--tls13-ciphers",
		CHROME_TLS13_CIPHERS,
		"--compressed",
	];

	if (cookie) {
		args.push("-H", `Cookie: ${cookie}`);
	}

	if (postJson) {
		args.push(
			"-X",
			"POST",
			"-H",
			"Content-Type: application/json",
			"-H",
			"X-Requested-With: XMLHttpRequest",
			"-d",
			JSON.stringify(postJson),
		);
	}

	args.push("--", url);
	return args;
}

function fetchViaCurl(url, cookie, postJson, execFileImpl = execFile) {
	return new Promise((resolve) => {
		try {
			execFileImpl(
				getCurlBin(),
				buildCurlArgs(url, cookie, postJson),
				{ timeout: 15000, maxBuffer: 20 * 1024 * 1024 },
				(error, stdout) => {
					resolve(error ? null : sanitizeHtmlResult(stdout));
				},
			);
		} catch {
			resolve(null);
		}
	});
}

function buildDirectFetchInit(cookie, postJson) {
	const headers = {
		"User-Agent": DEFAULT_BROWSER_UA,
		Accept: postJson
			? "text/html, */*; q=0.01"
			: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
	};

	if (cookie) {
		headers.Cookie = cookie;
	}

	if (!postJson) {
		return { method: "GET", headers };
	}

	headers["X-Requested-With"] = "XMLHttpRequest";
	headers["Content-Type"] = "application/json";
	return {
		method: "POST",
		headers,
		body: JSON.stringify(postJson),
	};
}

async function fetchViaDirect(url, cookie, postJson) {
	try {
		const response = await fetch(url, buildDirectFetchInit(cookie, postJson));
		if (!response.ok) {
			return null;
		}
		return sanitizeHtmlResult(await response.text());
	} catch {
		return null;
	}
}

function resolveMdlOptions(options) {
	if (typeof options === "function") {
		return { execFileImpl: options, http2Impl: http2 };
	}
	return {
		execFileImpl: options?.execFileImpl ?? execFile,
		http2Impl: options?.http2Impl ?? http2,
	};
}

async function tryProxyFetch(proxyUrl, postJson) {
	if (!proxyUrl) {
		return null;
	}
	return fetchViaProxy(proxyUrl, postJson);
}

export async function fetchMdlHtml(url, postJson, options) {
	if (!url.startsWith("https://") && !url.startsWith("http://")) {
		return null;
	}

	const { execFileImpl, http2Impl } = resolveMdlOptions(options);
	const cookie = getMdlCookie();
	const customProxy = getCustomMdlProxy();
	const scraperApiKey = getScraperApiKey();

	return (
		(await tryProxyFetch(
			customProxy ? formatCustomProxyUrl(customProxy, url) : null,
			postJson,
		)) ??
		(await fetchViaDirect(url, cookie, postJson)) ??
		(await fetchViaHttp2(url, cookie, postJson, http2Impl)) ??
		(await tryProxyFetch(
			scraperApiKey ? formatScraperApiUrl(scraperApiKey, url) : null,
			postJson,
		)) ??
		(await fetchViaCurl(url, cookie, postJson, execFileImpl))
	);
}

export async function collectMdlPages(statusPath, maxPages, extractItems) {
	const rawUsername = getMdlUsername();
	const encodedUsername = encodeURIComponent(rawUsername);
	const url = `https://mydramalist.com/dramalist/${encodedUsername}/${statusPath}`;
	const collected = [];

	for (let page = 1; page <= maxPages; page++) {
		const html =
			page === 1
				? await fetchMdlHtml(url)
				: await fetchMdlHtml(url, { page, username: rawUsername });
		const items = html ? extractItems(html) : [];
		if (items.length === 0) break;
		collected.push(...items);
		if (items.length < 100) break;
	}

	return collected;
}

export async function fetchMdlOverview() {
	const username = encodeURIComponent(getMdlUsername());
	const mainHtml = await fetchMdlHtml(
		`https://mydramalist.com/dramalist/${username}`,
	);
	return {
		mainHtml,
		profileStats: parseMdlProfileStats(mainHtml),
	};
}
