import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { GET as getBackloggd } from "../../api/backloggd.js";
import {
	aggregatePlayedGames,
	extractFulfilledText,
	GET as getGames,
	parseBacklogHtml,
	parseProfileStats,
	parseReviewCard,
	parseReviewsHtml,
} from "../../api/games.js";
import {
	CookieJar,
	fetchBackloggdHtml,
	getBackloggdCookie,
	getBackloggdFallbackStats,
	getBackloggdUsername,
	parseAnubisChallenge,
	sharedBackloggdCookieJar,
	solveAnubisPoW,
} from "../../src/lib/backloggd-utils.js";

describe("backloggd-utils", () => {
	const savedEnv = { ...process.env };
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		process.env = { ...savedEnv };
		sharedBackloggdCookieJar.clear();
		delete process.env.BACKLOGGD_USERNAME;
		delete process.env.NEXT_PUBLIC_BACKLOGGD_USERNAME;
		delete process.env.BACKLOGGD_COOKIE;
		delete process.env.NEXT_PUBLIC_BACKLOGGD_COOKIE;
		delete process.env.BACKLOGGD_PLAYED;
		delete process.env.NEXT_PUBLIC_BACKLOGGD_PLAYED;
		delete process.env.BACKLOGGD_BACKLOG;
		delete process.env.NEXT_PUBLIC_BACKLOGGD_BACKLOG;
	});

	afterEach(() => {
		process.env = { ...savedEnv };
		globalThis.fetch = originalFetch;
		sharedBackloggdCookieJar.clear();
	});

	it("manages CookieJar and env helpers", () => {
		const jar = new CookieJar();
		jar.setCookieString();
		jar.setCookieString("=nameless; a=1; b=two; empty=");
		assert.equal(jar.toHeader(), "a=1; b=two");

		jar.setCookies(["c=3; Path=/; HttpOnly", "a=; Max-Age=0"]);
		assert.equal(jar.toHeader(), "b=two; c=3");
		jar.clear();
		assert.equal(jar.toHeader(), "");

		assert.equal(getBackloggdUsername(), "Noahffiliation");
		assert.equal(getBackloggdCookie(), undefined);
		assert.equal(getBackloggdFallbackStats(), null);

		process.env.NEXT_PUBLIC_BACKLOGGD_USERNAME = "pub_bg";
		process.env.NEXT_PUBLIC_BACKLOGGD_COOKIE = "s=pub";
		process.env.NEXT_PUBLIC_BACKLOGGD_PLAYED = "10";
		process.env.NEXT_PUBLIC_BACKLOGGD_BACKLOG = "bad";
		assert.equal(getBackloggdUsername(), "pub_bg");
		assert.equal(getBackloggdCookie(), "s=pub");
		assert.equal(getBackloggdFallbackStats(), null);

		process.env.BACKLOGGD_PLAYED = "120";
		process.env.BACKLOGGD_BACKLOG = "80";
		assert.deepEqual(getBackloggdFallbackStats(), { played: 120, backlog: 80 });
	});

	it("solves and parses Anubis PoW challenges", () => {
		assert.equal(solveAnubisPoW("seed", 7), null);
		assert.equal(solveAnubisPoW("seed", 4, 0), null);

		const evenSol = solveAnubisPoW("test-seed", 2);
		assert.ok(evenSol);
		assert.ok(evenSol.hash.startsWith("00"));

		const oddSol = solveAnubisPoW("test-seed", 1);
		assert.ok(oddSol);
		assert.ok(oddSol.hash.startsWith("0"));

		assert.equal(parseAnubisChallenge("<html>no challenge</html>"), null);
		assert.equal(
			parseAnubisChallenge(
				'<script id="anubis_challenge" type="application/json">{bad json</script>',
			),
			null,
		);
		assert.equal(
			parseAnubisChallenge(
				'<script id="anubis_challenge" type="application/json">null</script>',
			),
			null,
		);
		assert.equal(
			parseAnubisChallenge(
				'<script id="anubis_challenge" type="application/json">{"rules":{"algorithm":"slow","difficulty":1}}</script>',
			),
			null,
		);
		assert.equal(
			parseAnubisChallenge(
				'<script id="anubis_challenge" type="application/json">{"rules":{"algorithm":"fast","difficulty":1},"challenge":{}}</script>',
			),
			null,
		);

		const validChallenge = parseAnubisChallenge(
			'<script id="anubis_challenge" type="application/json">{"rules":{"algorithm":"fast","difficulty":1},"challenge":{"id":"cid","randomData":"abc"}}</script>',
		);
		assert.deepEqual(validChallenge, {
			id: "cid",
			randomData: "abc",
			difficulty: 1,
		});
	});

	it("fetches Backloggd HTML directly and solves Anubis bot challenge across edge cases", async () => {
		process.env.BACKLOGGD_COOKIE = "init=1";
		const challengeHtml =
			'Making sure you&#39;re not a bot! <script id="anubis_challenge" type="application/json">{"rules":{"algorithm":"fast","difficulty":1},"challenge":{"id":"c1","randomData":"seed"}}</script>';

		let step = 0;
		globalThis.fetch = mock.fn(async () => {
			step++;
			if (step === 1) {
				return new Response(challengeHtml, { status: 200 });
			}
			if (step === 2) {
				return new Response("", {
					status: 302,
					headers: { "set-cookie": "anubis=ok; Path=/" },
				});
			}
			return new Response("<html>profile ok</html>", { status: 200 });
		});

		const solvedHtml = await fetchBackloggdHtml(
			"https://backloggd.com/u/test/",
		);
		assert.equal(solvedHtml, "<html>profile ok</html>");

		// Response without getSetCookie function on headers
		globalThis.fetch = mock.fn(async () => ({
			ok: true,
			headers: {},
			text: async () => "<html>bare response</html>",
		}));
		assert.equal(
			await fetchBackloggdHtml("https://backloggd.com/u/bare/"),
			"<html>bare response</html>",
		);

		// Bot text without valid challenge script -> null
		globalThis.fetch = mock.fn(
			async () =>
				new Response("Making sure you&#39;re not a bot!", { status: 200 }),
		);
		assert.equal(await fetchBackloggdHtml("https://backloggd.com/u/x/"), null);

		// Challenge with excessive difficulty -> solveAnubisPoW returns null
		const hardChallengeHtml =
			'Making sure you&#39;re not a bot! <script id="anubis_challenge" type="application/json">{"rules":{"algorithm":"fast","difficulty":9},"challenge":{"id":"c9","randomData":"seed"}}</script>';
		globalThis.fetch = mock.fn(
			async () => new Response(hardChallengeHtml, { status: 200 }),
		);
		assert.equal(await fetchBackloggdHtml("https://backloggd.com/u/x/"), null);

		// Final response non-ok after passing challenge
		step = 0;
		globalThis.fetch = mock.fn(async () => {
			step++;
			if (step === 1) return new Response(challengeHtml, { status: 200 });
			if (step === 2) return new Response("", { status: 302 });
			return new Response("Server error", { status: 500 });
		});
		assert.equal(await fetchBackloggdHtml("https://backloggd.com/u/x/"), null);

		// Non-ok response without challenge
		globalThis.fetch = mock.fn(
			async () => new Response("Not found", { status: 404 }),
		);
		assert.equal(await fetchBackloggdHtml("https://backloggd.com/u/x/"), null);

		// Still blocked after passing challenge
		step = 0;
		globalThis.fetch = mock.fn(async () => {
			step++;
			if (step === 1) return new Response(challengeHtml, { status: 200 });
			if (step === 2) return new Response("", { status: 302 });
			return new Response("Making sure you&#39;re not a bot!", { status: 200 });
		});
		assert.equal(await fetchBackloggdHtml("https://backloggd.com/u/x/"), null);

		// Network throw
		globalThis.fetch = mock.fn(async () => {
			throw new Error("Connection reset");
		});
		assert.equal(await fetchBackloggdHtml("https://backloggd.com/u/x/"), null);
	});
});

describe("api/backloggd and api/games", () => {
	const savedEnv = { ...process.env };
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		process.env = { ...savedEnv };
		sharedBackloggdCookieJar.clear();
		delete process.env.BACKLOGGD_PLAYED;
		delete process.env.BACKLOGGD_BACKLOG;
		delete process.env.NEXT_PUBLIC_BACKLOGGD_PLAYED;
		delete process.env.NEXT_PUBLIC_BACKLOGGD_BACKLOG;
	});

	afterEach(() => {
		process.env = { ...savedEnv };
		globalThis.fetch = originalFetch;
	});

	const sampleProfile = `
		<a href="/u/Noahffiliation/games/played/type:played/"><h4>1,234</h4></a>
		<a href="/u/Noahffiliation/games/backlog/"><h4>56</h4></a>
	`;

	it("handles /api/backloggd scraped stats, missing regex counts, env fallback, and 502 error", async () => {
		globalThis.fetch = mock.fn(
			async () => new Response(sampleProfile, { status: 200 }),
		);
		const okRes = await getBackloggd();
		assert.equal(okRes.status, 200);
		assert.deepEqual(await okRes.json(), { played: 1234, backlog: 56 });

		// 200 HTML without matching counters
		globalThis.fetch = mock.fn(
			async () => new Response("<html>no counters</html>", { status: 200 }),
		);
		assert.equal((await getBackloggd()).status, 502);

		globalThis.fetch = mock.fn(
			async () => new Response("empty", { status: 500 }),
		);
		const failRes = await getBackloggd();
		assert.equal(failRes.status, 502);

		process.env.BACKLOGGD_PLAYED = "77";
		process.env.BACKLOGGD_BACKLOG = "33";
		const fbRes = await getBackloggd();
		assert.equal(fbRes.status, 200);
		assert.deepEqual(await fbRes.json(), { played: 77, backlog: 33 });
	});

	it("parses games backlog, review cards, deduplication, and /api/games endpoint", async () => {
		assert.deepEqual(parseProfileStats(sampleProfile), {
			totalPlayed: 1234,
			totalBacklog: 56,
		});
		assert.deepEqual(parseBacklogHtml("Making sure you&#39;re not a bot!"), []);
		assert.deepEqual(parseReviewsHtml("Making sure you&#39;re not a bot!"), []);
		assert.equal(parseReviewCard("<div>no img</div>"), null);

		const backlogHtml = `
			<div class="card game-cover"><img src="a.jpg" alt="Baldur&#39;s Gate 3"></div>
			<div class="card game-cover"><img src="a.jpg" alt="Baldur&#39;s Gate 3"></div>
			<div class="card game-cover"><img src="b.jpg" alt="Hades &amp; More"></div>
		`;
		assert.deepEqual(parseBacklogHtml(backlogHtml), [
			{ title: "Baldur's Gate 3" },
			{ title: "Hades & More" },
		]);

		const reviewsHtml = `
			<div class="review-card">
				<img alt="Elden Ring">
				<p class="mb-0 play-type completed">Completed</p>
				<div class="review-platform"><p class="mb-0">PC</p></div>
				<time>Oct 10, 2026</time>
			</div>
			<div class="review-card">
				<div>no title card</div>
			</div>
			<div class="review-card">
				<img alt="Elden Ring">
			</div>
		`;
		assert.deepEqual(aggregatePlayedGames([reviewsHtml, reviewsHtml]), [
			{
				title: "Elden Ring",
				status: "Completed",
				platform: "PC",
				date: "Oct 10, 2026",
			},
		]);

		assert.equal(
			await extractFulfilledText({
				status: "fulfilled",
				value: new Response("hello", { status: 200 }),
			}),
			"hello",
		);
		assert.equal(
			await extractFulfilledText({
				status: "fulfilled",
				value: new Response("err", { status: 500 }),
			}),
			null,
		);
		assert.equal(
			await extractFulfilledText({ status: "rejected", reason: "err" }),
			null,
		);

		process.env.BACKLOGGD_PLAYED = "99";
		process.env.BACKLOGGD_BACKLOG = "44";
		globalThis.fetch = mock.fn(async (url) => {
			if (url.endsWith("/backlog")) {
				return new Response(backlogHtml, { status: 200 });
			}
			if (url.includes("/reviews")) {
				return new Response(reviewsHtml, { status: 200 });
			}
			return new Response("no counts", { status: 200 });
		});

		const gamesRes = await getGames();
		assert.equal(gamesRes.status, 200);
		const gamesJson = await gamesRes.json();
		assert.equal(gamesJson.totalPlayed, 99);
		assert.equal(gamesJson.totalBacklog, 44);
		assert.equal(gamesJson.backlog.length, 2);
		assert.equal(gamesJson.played.length, 1);

		// Upstream 500 -> null profileHtml & null backlogHtml without fallback
		delete process.env.BACKLOGGD_PLAYED;
		delete process.env.BACKLOGGD_BACKLOG;
		globalThis.fetch = mock.fn(
			async () => new Response("down", { status: 500 }),
		);
		const emptyGamesRes = await getGames();
		assert.deepEqual(await emptyGamesRes.json(), {
			backlog: [],
			played: [],
		});
	});
});
