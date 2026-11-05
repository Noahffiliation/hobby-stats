import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { GET as getLastfm, getLastfmUsername } from "../../api/lastfm.js";
import {
	GET as getTrakt,
	getTraktHeaders,
	getTraktUsername,
} from "../../api/trakt.js";

describe("api/trakt", () => {
	const savedEnv = { ...process.env };
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		process.env = { ...savedEnv };
		delete process.env.TRAKT_USERNAME;
		delete process.env.NEXT_PUBLIC_TRAKT_USERNAME;
		delete process.env.TRAKT_API_KEY;
		delete process.env.NEXT_PUBLIC_TRAKT_API_KEY;
	});

	afterEach(() => {
		process.env = { ...savedEnv };
		globalThis.fetch = originalFetch;
	});

	it("resolves username and headers from primary, fallback, and default env vars", () => {
		assert.equal(getTraktUsername(), "noahffiliation");
		assert.equal(getTraktHeaders()["trakt-api-key"], "");

		process.env.NEXT_PUBLIC_TRAKT_USERNAME = "pub_user";
		process.env.NEXT_PUBLIC_TRAKT_API_KEY = "pub_key";
		assert.equal(getTraktUsername(), "pub_user");
		assert.equal(getTraktHeaders()["trakt-api-key"], "pub_key");

		process.env.TRAKT_USERNAME = "srv_user";
		process.env.TRAKT_API_KEY = "srv_key";
		assert.equal(getTraktUsername(), "srv_user");
		assert.equal(getTraktHeaders()["trakt-api-key"], "srv_key");
	});

	it("handles stats, watched-shows (with and without header), recent-movies, and recent-episodes", async () => {
		globalThis.fetch = mock.fn(async (url) => {
			if (url.endsWith("/stats")) {
				return Response.json({ movies: { watched: 42 } });
			}
			if (url.includes("/watched/shows")) {
				return new Response(JSON.stringify([{ show: { title: "A" } }]), {
					status: 200,
					headers: { "X-Pagination-Item-Count": "88" },
				});
			}
			if (url.includes("/history/movies")) {
				return Response.json([{ id: 1, movie: { title: "Inception" } }]);
			}
			if (url.includes("/history/shows")) {
				return Response.json([{ id: 2, show: { title: "Severance" } }]);
			}
			return new Response("Not found", { status: 404 });
		});

		const statsRes = await getTrakt(
			new Request("http://localhost/api/trakt?endpoint=stats"),
		);
		assert.equal(statsRes.status, 200);
		assert.deepEqual(await statsRes.json(), { movies: { watched: 42 } });

		const watchedRes = await getTrakt(
			new Request("http://localhost/api/trakt?endpoint=watched-shows"),
		);
		assert.deepEqual(await watchedRes.json(), { count: 88 });

		const moviesRes = await getTrakt(
			new Request("http://localhost/api/trakt?endpoint=recent-movies"),
		);
		assert.equal((await moviesRes.json())[0].movie.title, "Inception");

		const episodesRes = await getTrakt(
			new Request("http://localhost/api/trakt?endpoint=recent-episodes"),
		);
		assert.equal((await episodesRes.json())[0].show.title, "Severance");

		// Watched shows fallback to array length when pagination header is absent
		globalThis.fetch = mock.fn(async () =>
			Response.json([{ show: { title: "S1" } }, { show: { title: "S2" } }]),
		);
		const fallbackWatched = await getTrakt(
			new Request("http://localhost/api/trakt?endpoint=watched-shows"),
		);
		assert.deepEqual(await fallbackWatched.json(), { count: 2 });
	});

	it("handles paginated watchlist-movies and watchlist-shows across multiple pages", async () => {
		globalThis.fetch = mock.fn(async (url) => {
			if (url.includes("page=1")) {
				return new Response(JSON.stringify([{ movie: { title: "M1" } }]), {
					status: 200,
					headers: { "X-Pagination-Page-Count": "2" },
				});
			}
			return Response.json([{ movie: { title: "M2" } }]);
		});

		const moviesWl = await getTrakt(
			new Request("http://localhost/api/trakt?endpoint=watchlist-movies"),
		);
		assert.equal(moviesWl.status, 200);
		assert.deepEqual(await moviesWl.json(), [
			{ movie: { title: "M1" } },
			{ movie: { title: "M2" } },
		]);

		globalThis.fetch = mock.fn(async () =>
			Response.json([{ show: { title: "Show1" } }]),
		);
		const showsWl = await getTrakt(
			new Request("http://localhost/api/trakt?endpoint=watchlist-shows"),
		);
		assert.deepEqual(await showsWl.json(), [{ show: { title: "Show1" } }]);
	});

	it("returns 400 on invalid endpoint and 502 on upstream failure", async () => {
		const invalid = await getTrakt(
			new Request("http://localhost/api/trakt?endpoint=nope"),
		);
		assert.equal(invalid.status, 400);

		globalThis.fetch = mock.fn(
			async () => new Response("Err", { status: 500 }),
		);
		const failSingle = await getTrakt(
			new Request("http://localhost/api/trakt?endpoint=stats"),
		);
		assert.equal(failSingle.status, 502);

		const failPaginated1 = await getTrakt(
			new Request("http://localhost/api/trakt?endpoint=watchlist-movies"),
		);
		assert.equal(failPaginated1.status, 502);

		globalThis.fetch = mock.fn(async (url) => {
			if (url.includes("page=1")) {
				return new Response(JSON.stringify([{ movie: { title: "M1" } }]), {
					status: 200,
					headers: { "X-Pagination-Page-Count": "2" },
				});
			}
			return new Response("Page 2 failed", { status: 503 });
		});
		const failPaginated2 = await getTrakt(
			new Request("http://localhost/api/trakt?endpoint=watchlist-movies"),
		);
		assert.equal(failPaginated2.status, 502);
	});
});

describe("api/lastfm", () => {
	const savedEnv = { ...process.env };
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		process.env = { ...savedEnv };
		delete process.env.LASTFM_USERNAME;
		delete process.env.NEXT_PUBLIC_LASTFM_USERNAME;
		delete process.env.LASTFM_API_KEY;
		delete process.env.NEXT_PUBLIC_LASTFM_API_KEY;
	});

	afterEach(() => {
		process.env = { ...savedEnv };
		globalThis.fetch = originalFetch;
	});

	it("resolves username/apiKey fallbacks and proxies recent tracks, non-ok status, and network errors", async () => {
		globalThis.fetch = mock.fn(async () =>
			Response.json({ recenttracks: { track: [{ name: "Song" }] } }),
		);

		// Empty API key fallback ("")
		assert.equal(getLastfmUsername(), "noahffiliation");
		assert.equal((await getLastfm()).status, 200);

		// NEXT_PUBLIC_LASTFM_* fallbacks
		process.env.NEXT_PUBLIC_LASTFM_USERNAME = "pub_fm";
		process.env.NEXT_PUBLIC_LASTFM_API_KEY = "pub_fm_key";
		assert.equal(getLastfmUsername(), "pub_fm");
		assert.equal((await getLastfm()).status, 200);

		// Primary LASTFM_* env vars
		process.env.LASTFM_USERNAME = "srv_fm";
		process.env.LASTFM_API_KEY = "fm_key";
		assert.equal(getLastfmUsername(), "srv_fm");
		const okRes = await getLastfm();
		assert.equal(okRes.status, 200);
		assert.deepEqual(await okRes.json(), {
			recenttracks: { track: [{ name: "Song" }] },
		});

		globalThis.fetch = mock.fn(
			async () => new Response("Forbidden", { status: 403 }),
		);
		const errRes = await getLastfm();
		assert.equal(errRes.status, 403);

		globalThis.fetch = mock.fn(async () => {
			throw new Error("Network down");
		});
		const netErr = await getLastfm();
		assert.equal(netErr.status, 502);
	});
});
