import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { EventEmitter } from "node:events";
import http2 from "node:http2";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import zlib from "node:zlib";
import { GET as getAnime } from "../../api/anime.js";
import {
	GET as getDramas,
	parseMdlRows,
	parseSingleDramaRow,
} from "../../api/dramas.js";
import { GET as getMyAnimeList } from "../../api/myanimelist.js";
import { GET as getMyDramaList } from "../../api/mydramalist.js";
import { getMalUsername } from "../../src/lib/mal-utils.js";
import {
	collectMdlPages,
	fetchMdlHtml,
	fetchViaHttp2,
	fetchViaProxy,
	getCurlBin,
	getMdlCookie,
	getMdlFallbackStats,
	getMdlProxyUrl,
	getMdlUsername,
	parseMdlProfileStats,
} from "../../src/lib/mydramalist-utils.js";

describe("MyAnimeList & Anime endpoints", () => {
	const savedEnv = { ...process.env };
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		process.env = { ...savedEnv };
		delete process.env.MAL_USERNAME;
		delete process.env.NEXT_PUBLIC_MAL_USERNAME;
	});

	afterEach(() => {
		process.env = { ...savedEnv };
		globalThis.fetch = originalFetch;
	});

	const malProfileHtml = `
		<a href="https://myanimelist.net/animelist/Noah?status=2">Completed</a><span>1,050</span>
		<a href="https://myanimelist.net/animelist/Noah?status=6">Plan to Watch</a><span>320</span>
	`;

	it("handles getMalUsername, /api/myanimelist, and /api/anime across ok, missing, and network error cases", async () => {
		assert.equal(getMalUsername(), "Noahffiliation");
		process.env.NEXT_PUBLIC_MAL_USERNAME = "mal_pub";
		assert.equal(getMalUsername(), "mal_pub");
		process.env.MAL_USERNAME = "mal_custom";
		assert.equal(getMalUsername(), "mal_custom");

		globalThis.fetch = mock.fn(
			async () => new Response(malProfileHtml, { status: 200 }),
		);
		const malRes = await getMyAnimeList();
		assert.equal(malRes.status, 200);
		assert.deepEqual(await malRes.json(), {
			completed: 1050,
			planToWatch: 320,
		});

		// Profile HTML missing regex counts -> 502 on /api/myanimelist
		globalThis.fetch = mock.fn(
			async () => new Response("<html>no counts</html>", { status: 200 }),
		);
		assert.equal((await getMyAnimeList()).status, 502);

		globalThis.fetch = mock.fn(async (url) => {
			if (url.includes("status=6")) {
				return Response.json([
					{
						anime_id: 1,
						anime_title: "Frieren",
						anime_num_episodes: 28,
						anime_media_type_string: "TV",
					},
				]);
			}
			if (url.includes("status=2")) {
				return Response.json([
					{
						anime_id: 2,
						anime_title: "Shingeki",
						anime_title_eng: "Attack on Titan",
						anime_num_episodes: 25,
						num_watched_episodes: 25,
						score: 10,
						anime_media_type_string: "TV",
					},
				]);
			}
			return new Response(malProfileHtml, { status: 200 });
		});

		const animeRes = await getAnime();
		assert.equal(animeRes.status, 200);
		const animeJson = await animeRes.json();
		assert.equal(animeJson.totalCompleted, 1050);
		assert.equal(animeJson.totalPlanToWatch, 320);
		assert.equal(animeJson.planToWatch[0].title, "Frieren");
		assert.equal(animeJson.completed[0].title, "Attack on Titan");

		// /api/anime when profile returns 200 without counts & when profile returns 404
		globalThis.fetch = mock.fn(async (url) => {
			if (url.includes("load.json")) return Response.json([]);
			return new Response("<html>no counts</html>", { status: 200 });
		});
		const noCountsAnime = await (await getAnime()).json();
		assert.equal(noCountsAnime.totalCompleted, 0);
		assert.equal(noCountsAnime.totalPlanToWatch, 0);

		globalThis.fetch = mock.fn(async (url) => {
			if (url.includes("load.json")) return Response.json([]);
			return new Response("missing", { status: 404 });
		});
		assert.equal((await getAnime()).status, 200);

		// Non-ok & network throw cases
		globalThis.fetch = mock.fn(
			async () => new Response("err", { status: 500 }),
		);
		assert.equal((await getMyAnimeList()).status, 502);
		assert.equal((await getAnime()).status, 502);

		globalThis.fetch = mock.fn(async () => {
			throw new Error("network down");
		});
		assert.equal((await getMyAnimeList()).status, 502);
		assert.equal((await getAnime()).status, 502);
	});
});

describe("MyDramaList & Dramas endpoints", () => {
	const savedEnv = { ...process.env };
	const originalFetch = globalThis.fetch;
	let h2ConnectMock;

	beforeEach(() => {
		process.env = { ...savedEnv };
		delete process.env.MDL_USERNAME;
		delete process.env.NEXT_PUBLIC_MDL_USERNAME;
		delete process.env.MDL_COOKIE;
		delete process.env.NEXT_PUBLIC_MDL_COOKIE;
		delete process.env.MDL_PROXY_URL;
		delete process.env.NEXT_PUBLIC_MDL_PROXY_URL;
		delete process.env.SCRAPER_API_KEY;
		delete process.env.NEXT_PUBLIC_SCRAPER_API_KEY;
		delete process.env.MDL_COMPLETED;
		delete process.env.NEXT_PUBLIC_MDL_COMPLETED;
		delete process.env.MDL_PLAN_TO_WATCH;
		delete process.env.NEXT_PUBLIC_MDL_PLAN_TO_WATCH;
		process.env.MDL_CURL_BIN = "/nonexistent-curl-bin";
		h2ConnectMock = mock.method(http2, "connect", () => {
			throw new Error("Outbound HTTP/2 disabled in unit tests");
		});
	});

	afterEach(() => {
		h2ConnectMock?.mock.restore();
		process.env = { ...savedEnv };
		globalThis.fetch = originalFetch;
	});

	it("handles MDL env helpers, proxy URLs, fetchViaProxy, curl/direct errors, and fallback stats", async () => {
		assert.equal(getMdlUsername(), "Noahffiliation");
		process.env.NEXT_PUBLIC_MDL_USERNAME = "mdl_pub";
		assert.equal(getMdlUsername(), "mdl_pub");
		process.env.MDL_USERNAME = "mdl_srv";
		assert.equal(getMdlUsername(), "mdl_srv");

		assert.equal(getCurlBin(), "/nonexistent-curl-bin");
		delete process.env.MDL_CURL_BIN;
		assert.equal(getCurlBin("win32"), String.raw`C:\Windows\System32\curl.exe`);
		assert.equal(getCurlBin("linux"), "/usr/bin/curl");
		process.env.MDL_CURL_BIN = "/nonexistent-curl-bin";

		assert.equal(getMdlCookie(), undefined);
		process.env.NEXT_PUBLIC_MDL_COOKIE = "pub_cf=1";
		assert.equal(getMdlCookie(), "pub_cf=1");

		assert.equal(getMdlFallbackStats(), null);
		process.env.NEXT_PUBLIC_MDL_COMPLETED = "12";
		process.env.NEXT_PUBLIC_MDL_PLAN_TO_WATCH = "bad";
		assert.equal(getMdlFallbackStats(), null);

		assert.equal(getMdlProxyUrl("https://mydramalist.com/x"), null);

		process.env.MDL_PROXY_URL = "https://proxy.example/?u={url}";
		assert.equal(
			getMdlProxyUrl("https://a.com"),
			"https://proxy.example/?u=https%3A%2F%2Fa.com",
		);

		// Custom proxy used directly inside fetchMdlHtml
		globalThis.fetch = mock.fn(
			async () => new Response("<div>via custom proxy</div>", { status: 200 }),
		);
		assert.equal(
			await fetchMdlHtml("https://mydramalist.com/dramalist/u"),
			"<div>via custom proxy</div>",
		);

		process.env.MDL_PROXY_URL = "https://proxy.example/?u=";
		assert.equal(
			getMdlProxyUrl("https://a.com"),
			"https://proxy.example/?u=https%3A%2F%2Fa.com",
		);

		delete process.env.MDL_PROXY_URL;
		process.env.SCRAPER_API_KEY = "sk_123";
		assert.match(getMdlProxyUrl("https://a.com") ?? "", /scraperapi\.com/);
		delete process.env.SCRAPER_API_KEY;

		globalThis.fetch = mock.fn(
			async () => new Response("Just a moment...", { status: 200 }),
		);
		assert.equal(await fetchViaProxy("https://proxy.example"), null);

		// handleProxyFailure when res.text() rejects
		globalThis.fetch = mock.fn(async () => ({
			ok: false,
			status: 500,
			text: () => Promise.reject(new Error("stream broken")),
		}));
		assert.equal(await fetchViaProxy("https://proxy.example"), null);

		globalThis.fetch = mock.fn(
			async () => new Response("<div>ok</div>", { status: 200 }),
		);
		assert.equal(
			await fetchViaProxy("https://proxy.example", {
				page: 2,
				username: "u",
			}),
			"<div>ok</div>",
		);

		globalThis.fetch = mock.fn(async () => {
			throw new Error("proxy down");
		});
		assert.equal(await fetchViaProxy("https://proxy.example"), null);

		// Invalid URL protocol rejected before spawning curl
		assert.equal(await fetchMdlHtml("ftp://invalid"), null);

		// Direct fetch network throw + synchronous throw in execFileImpl
		globalThis.fetch = mock.fn(async () => {
			throw new Error("direct network failure");
		});
		const syncCurlFail = await fetchMdlHtml(
			"https://mydramalist.com/dramalist/u",
			undefined,
			() => {
				throw new Error("spawn sync throw");
			},
		);
		assert.equal(syncCurlFail, null);

		// curl fallback when fetch returns Cloudflare challenge
		process.env.MDL_COOKIE = "cf=cookie";
		globalThis.fetch = mock.fn(
			async () => new Response("Just a moment...", { status: 200 }),
		);
		const curlOk = await fetchMdlHtml(
			"https://mydramalist.com/dramalist/u",
			{ page: 2, username: "u" },
			(_bin, _args, _opts, cb) => cb(null, "<div>from curl</div>"),
		);
		assert.equal(curlOk, "<div>from curl</div>");

		const curlBlocked = await fetchMdlHtml(
			"https://mydramalist.com/dramalist/u",
			undefined,
			(_bin, _args, _opts, cb) => cb(new Error("curl err"), ""),
		);
		assert.equal(curlBlocked, null);

		process.env.MDL_COMPLETED = "150";
		process.env.MDL_PLAN_TO_WATCH = "90";
		assert.deepEqual(getMdlFallbackStats(), {
			completed: 150,
			planToWatch: 90,
		});
	});

	it("parses drama rows, multi-page lists, /api/mydramalist, and /api/dramas", async () => {
		assert.deepEqual(parseMdlProfileStats(null), {});
		assert.deepEqual(
			parseMdlProfileStats("Completed (1,200) Plan to Watch (45)"),
			{ completed: 1200, planToWatch: 45 },
		);

		assert.equal(parseSingleDramaRow("<td>empty</td>"), null);
		assert.deepEqual(parseMdlRows(null), []);

		const tableHtml = `
			<tr id="ml1">
				<td class="msv2-i-title"><a title="Crash Landing &amp; You">Link</a></td>
				<td class="msv2-i-year">2019</td>
				<td class="msv2-i-type">Drama</td>
				<td class="msv2-i-country">South Korea</td>
				<td class="msv2-i-score"><span class="score">9.5</span></td>
				<td class="msv2-i-progress"><span class="num-seen">16</span>/<span class="num-total">16</span></td>
			</tr>
			<tr id="ml2">
				<td><div class="msv2-item--title"><a href="/x">Moving</a></div></td>
				<td class="msv2-i-score"><span class="score">0.0</span></td>
			</tr>
			<tr id="ml3">
				<td>empty row skipped</td>
			</tr>
		`;

		const rows = parseMdlRows(tableHtml);
		assert.equal(rows.length, 2);
		assert.deepEqual(rows[0], {
			title: "Crash Landing & You",
			year: "2019",
			type: "Drama",
			country: "South Korea",
			episodes: "16/16",
			score: 9.5,
		});
		assert.equal(rows[1].title, "Moving");
		assert.equal(rows[1].score, undefined);

		// Multi-page collectMdlPages: page 1 has 100 items, page 2 has 0 items, plus null HTML case
		let pageCalls = 0;
		globalThis.fetch = mock.fn(async () => {
			pageCalls++;
			if (pageCalls === 1) {
				const hundred = Array.from(
					{ length: 100 },
					(_, i) => `<tr id="ml${i}"></tr>`,
				).join("");
				return new Response(hundred, { status: 200 });
			}
			return new Response("<html>empty page 2</html>", { status: 200 });
		});
		const pagedMatches = await collectMdlPages("completed", 5, (h) => [
			...h.matchAll(/<tr id="ml\d+">/gi),
		]);
		assert.equal(pagedMatches.length, 100);
		assert.equal(pageCalls, 2);

		globalThis.fetch = mock.fn(
			async () => new Response("blocked", { status: 500 }),
		);
		const nullMatches = await collectMdlPages("completed", 5, () => [1]);
		assert.deepEqual(nullMatches, []);

		process.env.MDL_COOKIE = "cf=1";
		globalThis.fetch = mock.fn(async (url) => {
			if (url.endsWith("/completed") || url.endsWith("/plan_to_watch")) {
				return new Response(tableHtml, { status: 200 });
			}
			return new Response("Completed (200) Plan to Watch (50)", {
				status: 200,
			});
		});

		const mdlStatsRes = await getMyDramaList();
		assert.equal(mdlStatsRes.status, 200);
		assert.deepEqual(await mdlStatsRes.json(), {
			completed: 200,
			planToWatch: 50,
		});

		const dramasRes = await getDramas();
		assert.equal(dramasRes.status, 200);
		const dramasJson = await dramasRes.json();
		assert.equal(dramasJson.totalCompleted, 200);
		assert.equal(dramasJson.totalPlanToWatch, 50);
		assert.equal(dramasJson.completed.length, 2);
		assert.equal(dramasJson.planToWatch.length, 2);

		// Fallback to row counting when profile HTML lacks summary counts (both >0 and 0 rows)
		globalThis.fetch = mock.fn(async (url) => {
			if (url.endsWith("/completed")) {
				return new Response(tableHtml, { status: 200 });
			}
			if (url.endsWith("/plan_to_watch")) {
				return new Response("<html>zero rows</html>", { status: 200 });
			}
			return new Response("<html>no summary</html>", { status: 200 });
		});
		assert.equal((await getMyDramaList()).status, 502);

		const partialDramasJson = await (await getDramas()).json();
		assert.equal(partialDramasJson.totalCompleted, 2);
		assert.equal(partialDramasJson.totalPlanToWatch, undefined);

		// ScraperAPI 403 credit exhaustion + Cloudflare block -> env fallback & 502
		const warnMock = mock.method(console, "warn", () => {});
		process.env.SCRAPER_API_KEY = "sk_exhausted";
		process.env.MDL_CURL_BIN = "/nonexistent-curl-bin";
		globalThis.fetch = mock.fn(async (url) => {
			if (new URL(String(url)).hostname === "api.scraperapi.com") {
				return new Response(
					"You have exhausted the API Credits available in this monthly cycle.",
					{ status: 403 },
				);
			}
			return new Response("Just a moment...", { status: 403 });
		});

		const blockedNoFallback = await getMyDramaList();
		assert.equal(blockedNoFallback.status, 502);
		assert.ok(warnMock.mock.callCount() >= 1);

		process.env.MDL_COMPLETED = "42";
		process.env.MDL_PLAN_TO_WATCH = "18";
		const blockedWithFallback = await getMyDramaList();
		assert.equal(blockedWithFallback.status, 200);
		assert.deepEqual(await blockedWithFallback.json(), {
			completed: 42,
			planToWatch: 18,
		});

		const blockedDramasWithFallback = await getDramas();
		assert.equal(blockedDramasWithFallback.status, 200);
		assert.deepEqual(await blockedDramasWithFallback.json(), {
			totalPlanToWatch: 18,
			totalCompleted: 42,
			planToWatch: [],
			completed: [],
		});
		warnMock.mock.restore();
	});

	it("handles fetchViaHttp2 decompression, redirects, limits, timeouts, and stream/client errors", async () => {
		assert.equal(await fetchViaHttp2("not-a-url"), null);
		assert.equal(await fetchViaHttp2("http://insecure.example/x"), null);

		function makeMockH2(responder, onClose) {
			return {
				connect(origin) {
					const session = new EventEmitter();
					session.close = onClose ?? (() => {});
					session.destroy = () => {};
					session.request = (headers) => {
						const stream = new EventEmitter();
						stream.close = () => {};
						stream.end = (body) => {
							queueMicrotask(() =>
								responder({ origin, headers, body, session, stream }),
							);
						};
						return stream;
					};
					return session;
				},
			};
		}

		// Brotli GET with cookie + close() throwing ignored cleanly
		const brBody = zlib.brotliCompressSync(Buffer.from("<div>br html</div>"));
		const brRes = await fetchViaHttp2(
			"https://mydramalist.com/dramalist/u",
			"cf=1",
			undefined,
			makeMockH2(
				({ headers, stream }) => {
					assert.equal(headers.cookie, "cf=1");
					stream.emit("response", { ":status": 200, "content-encoding": "br" });
					stream.emit("data", brBody);
					stream.emit("end");
				},
				() => {
					throw new Error("close err");
				},
			),
		);
		assert.equal(brRes, "<div>br html</div>");

		// String data chunk + Gzip POST + fetchMdlHtml integration
		const gzBody = zlib.gzipSync(Buffer.from("<div>gz post</div>"));
		globalThis.fetch = mock.fn(
			async () => new Response("blocked", { status: 403 }),
		);
		const h2ViaMain = await fetchMdlHtml(
			"https://mydramalist.com/dramalist/u/completed",
			{ page: 2, username: "u" },
			{
				http2Impl: makeMockH2(({ headers, body, stream }) => {
					assert.equal(headers[":method"], "POST");
					assert.ok(body.toString("utf8").includes('"page":2'));
					stream.emit("response", {
						":status": 200,
						"content-encoding": "gzip",
					});
					stream.emit("data", gzBody);
					stream.emit("end");
				}),
			},
		);
		assert.equal(h2ViaMain, "<div>gz post</div>");

		// String chunk without compression
		const strChunkRes = await fetchViaHttp2(
			"https://mydramalist.com/str",
			undefined,
			undefined,
			makeMockH2(({ stream }) => {
				stream.emit("response", { ":status": 200 });
				stream.emit("data", "<div>str chunk</div>");
				stream.emit("end");
			}),
		);
		assert.equal(strChunkRes, "<div>str chunk</div>");

		// Corrupt gzip -> decodeHttp2Body catch -> null
		const badGzRes = await fetchViaHttp2(
			"https://mydramalist.com/badgz",
			undefined,
			undefined,
			makeMockH2(({ stream }) => {
				stream.emit("response", {
					":status": 200,
					"content-encoding": "gzip",
				});
				stream.emit("data", Buffer.from("not-valid-gzip"));
				stream.emit("end");
			}),
		);
		assert.equal(badGzRes, null);

		// 302 redirect (drops POST) and 307/308 redirects (preserve POST)
		const deflateBody = zlib.deflateSync(Buffer.from("<div>redirected</div>"));
		let calls = 0;
		const redirRes = await fetchViaHttp2(
			"https://mydramalist.com/old",
			undefined,
			{ page: 1, username: "u" },
			makeMockH2(({ headers, stream }) => {
				calls++;
				if (calls === 1) {
					stream.emit("response", { ":status": 307, location: "/mid" });
					stream.emit("end");
				} else if (calls === 2) {
					assert.equal(headers[":method"], "POST");
					stream.emit("response", { ":status": 302, location: "/new" });
					stream.emit("end");
				} else {
					assert.equal(headers[":method"], "GET");
					assert.equal(headers[":path"], "/new");
					stream.emit("response", {
						":status": 200,
						"content-encoding": "deflate",
					});
					stream.emit("data", deflateBody);
					stream.emit("end");
				}
			}),
		);
		assert.equal(redirRes, "<div>redirected</div>");

		// Missing :status header & maxBytes limit exceeded
		const missingStatusRes = await fetchViaHttp2(
			"https://mydramalist.com/nostatus",
			undefined,
			undefined,
			makeMockH2(({ stream }) => {
				stream.emit("response", {});
				stream.emit("end");
			}),
		);
		assert.equal(missingStatusRes, null);

		const overLimitRes = await fetchViaHttp2(
			"https://mydramalist.com/huge",
			undefined,
			undefined,
			makeMockH2(({ stream }) => {
				stream.emit("response", { ":status": 200 });
				stream.emit("data", Buffer.from("12345678"));
			}),
			5,
			{ maxBytes: 4 },
		);
		assert.equal(overLimitRes, null);

		// Stream error + duplicate finish & duplicate redirectTo after settle
		const dupSettleRes = await fetchViaHttp2(
			"https://mydramalist.com/dup",
			undefined,
			undefined,
			makeMockH2(({ session, stream }) => {
				stream.emit("response", { ":status": 308, location: "/later" });
				stream.emit("error", new Error("stream reset"));
				session.emit("error", new Error("duplicate finish"));
				stream.emit("end");
			}),
		);
		assert.equal(dupSettleRes, null);

		// Timeout firing
		const timeoutRes = await fetchViaHttp2(
			"https://mydramalist.com/hang",
			undefined,
			undefined,
			makeMockH2(() => {}),
			5,
			{ timeoutMs: 5 },
		);
		assert.equal(timeoutRes, null);
	});
});
