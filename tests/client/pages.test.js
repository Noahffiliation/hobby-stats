import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it, mock } from "node:test";
import { JSDOM } from "jsdom";
import { bootPage } from "../../public/js/components.js";
import { initAnimePage } from "../../public/js/pages/anime.js";
import { initDramasPage } from "../../public/js/pages/dramas.js";
import { initGamesPage } from "../../public/js/pages/games.js";
import { initHomePage } from "../../public/js/pages/home.js";
import { initLastFmPage } from "../../public/js/pages/lastfm.js";
import { initMoviesPage } from "../../public/js/pages/movies.js";
import { initTvPage } from "../../public/js/pages/tv.js";

function loadHtmlDom(filename) {
	const html = fs.readFileSync(path.resolve("public", filename), "utf8");
	return new JSDOM(html);
}

describe("Static HTML pages & Vanilla JS page modules", () => {
	it("validates landmarks, active nav link, skip link, profile links, and Vercel scripts across all 7 HTML files", () => {
		const pages = [
			{ file: "index.html", href: "/" },
			{
				file: "games.html",
				href: "/games",
				profileHref: "https://backloggd.com/u/Noahffiliation/",
			},
			{
				file: "movies.html",
				href: "/movies",
				profileHref: "https://og.trakt.tv/users/noahffiliation",
			},
			{
				file: "tv.html",
				href: "/tv",
				profileHref: "https://og.trakt.tv/users/noahffiliation",
			},
			{
				file: "anime.html",
				href: "/anime",
				profileHref: "https://myanimelist.net/profile/Noahffiliation",
			},
			{
				file: "dramas.html",
				href: "/dramas",
				profileHref: "https://mydramalist.com/profile/Noahffiliation",
			},
			{
				file: "lastfm.html",
				href: "/lastfm",
				profileHref: "https://www.last.fm/user/noahffiliation",
			},
		];

		for (const { file, href, profileHref } of pages) {
			const dom = loadHtmlDom(file);
			const doc = dom.window.document;

			assert.equal(doc.documentElement.getAttribute("lang"), "en");
			assert.ok(doc.title.length > 0);
			assert.equal(doc.querySelectorAll("main").length, 1);
			assert.equal(doc.querySelectorAll("h1").length, 1);
			assert.equal(
				doc.querySelector("nav")?.getAttribute("aria-label"),
				"Primary",
			);

			const currentLinks = doc.querySelectorAll('nav a[aria-current="page"]');
			assert.equal(currentLinks.length, 1);
			assert.equal(currentLinks[0].getAttribute("href"), href);

			if (profileHref) {
				const profileLink = doc.getElementById("profile-link");
				assert.equal(profileLink?.getAttribute("href"), profileHref);
				assert.equal(profileLink?.getAttribute("target"), "_blank");
				assert.equal(profileLink?.getAttribute("rel"), "noopener noreferrer");
			}

			assert.ok(doc.querySelector('script[src="/_vercel/insights/script.js"]'));
			assert.ok(
				doc.querySelector('script[src="/_vercel/speed-insights/script.js"]'),
			);
		}
	});

	it("hydrates Home page: full data, zero totals, partial failures, total failure, and sync errors", async () => {
		const consoleSpy = mock.method(console, "error", () => {});
		try {
			const dom = loadHtmlDom("index.html");
			const doc = dom.window.document;

			await initHomePage(doc, {
				getTraktStats: async () => ({ movies: { watched: 100 } }),
				getWatchlistMovies: async () => new Array(20),
				getWatchedShows: async () => 50,
				getWatchlistShows: async () => new Array(10),
				getBackloggdStats: async () => ({ played: 280, backlog: 240 }),
				getMyAnimeListStats: async () => ({ completed: 350, planToWatch: 320 }),
				getMyDramaListStats: async () => ({ completed: 200, planToWatch: 230 }),
			});

			const bars = doc.querySelectorAll('[data-testid="progress"]');
			assert.equal(bars.length, 5);
			assert.match(bars[0].textContent ?? "", /Game Progress - 280 \/ 520/);
			assert.match(bars[1].textContent ?? "", /Movie Progress - 100 \/ 120/);
			assert.match(bars[2].textContent ?? "", /Show Progress - 50 \/ 60/);
			assert.match(bars[3].textContent ?? "", /Anime Progress - 350 \/ 670/);
			assert.match(bars[4].textContent ?? "", /K-Drama Progress - 200 \/ 430/);
			assert.equal(doc.querySelector('[data-testid="loading-state"]'), null);

			// Partial failure + 0 division safety
			const domPartial = loadHtmlDom("index.html");
			await initHomePage(domPartial.window.document, {
				getTraktStats: async () => ({ movies: { watched: 0 } }),
				getWatchlistMovies: async () => [],
				getWatchedShows: async () => {
					throw new Error("watched fail");
				},
				getWatchlistShows: async () => [],
				getBackloggdStats: async () => {
					throw new Error("bg fail");
				},
				getMyAnimeListStats: async () => ({ completed: 0, planToWatch: 0 }),
				getMyDramaListStats: async () => ({ completed: 0, planToWatch: 0 }),
			});
			assert.equal(
				domPartial.window.document.querySelectorAll('[data-testid="progress"]')
					.length,
				5,
			);

			// All rejected -> error banner
			const domFail = loadHtmlDom("index.html");
			const rejectFn = async () => {
				throw new Error("down");
			};
			await initHomePage(domFail.window.document, {
				getTraktStats: rejectFn,
				getWatchlistMovies: rejectFn,
				getWatchedShows: rejectFn,
				getWatchlistShows: rejectFn,
				getBackloggdStats: rejectFn,
				getMyAnimeListStats: rejectFn,
				getMyDramaListStats: rejectFn,
			});
			assert.match(
				domFail.window.document.querySelector('[data-testid="error-state"]')
					?.textContent ?? "",
				/Unable to load stats/,
			);

			// Synchronous throw inside task -> caught by runAsyncSection
			const domSyncErr = loadHtmlDom("index.html");
			await initHomePage(domSyncErr.window.document, {
				getTraktStats: () => {
					throw new Error("sync boom");
				},
			});
			assert.match(
				domSyncErr.window.document.querySelector('[data-testid="error-state"]')
					?.textContent ?? "",
				/Unable to load stats/,
			);

			// Guard when DOM container missing
			const emptyDom = new JSDOM("<!DOCTYPE html><body></body>");
			await initHomePage(emptyDom.window.document);
		} finally {
			consoleSpy.mock.restore();
		}
	});

	it("hydrates Games page: populated lists, optional fields, empty states, tab switch, and error", async () => {
		const consoleSpy = mock.method(console, "error", () => {});
		try {
			const dom = loadHtmlDom("games.html");
			const doc = dom.window.document;

			await initGamesPage(doc, {
				getGamesList: async () => ({
					profileUrl: "https://backloggd.com/u/custom_gamer/",
					totalBacklog: 5,
					totalPlayed: 10,
					backlog: [
						{
							title: "Hollow Knight",
							url: "https://backloggd.com/games/hollow-knight/",
							platform: "Switch",
						},
						{ title: "Silksong" },
					],
					played: [
						{
							title: "Celeste",
							url: "https://backloggd.com/games/celeste/",
							status: "Completed",
							platform: "PC",
							date: "Jan 1, 2026",
						},
						{ title: "Portal" },
					],
				}),
			});

			assert.equal(
				doc.getElementById("profile-link")?.getAttribute("href"),
				"https://backloggd.com/u/custom_gamer/",
			);
			assert.equal(
				doc.getElementById("tab-backlog")?.textContent,
				"Backlog (5)",
			);
			assert.equal(
				doc.getElementById("tab-played")?.textContent,
				"Played / Reviews (10)",
			);
			assert.equal(
				doc.querySelector("#panel-backlog a")?.getAttribute("href"),
				"https://backloggd.com/games/hollow-knight/",
			);
			assert.match(
				doc.getElementById("panel-backlog")?.textContent ?? "",
				/Hollow Knight/,
			);

			doc.getElementById("tab-played")?.click();
			assert.equal(doc.getElementById("panel-played")?.hidden, false);
			assert.equal(
				doc.querySelector("#panel-played a")?.getAttribute("href"),
				"https://backloggd.com/games/celeste/",
			);
			assert.match(
				doc.getElementById("panel-played")?.textContent ?? "",
				/Celeste/,
			);

			const domEmpty = loadHtmlDom("games.html");
			await initGamesPage(domEmpty.window.document, {
				getGamesList: async () => ({}),
			});
			assert.match(
				domEmpty.window.document.getElementById("panel-backlog")?.textContent ??
					"",
				/No backlog games found/,
			);

			const domErr = loadHtmlDom("games.html");
			await initGamesPage(domErr.window.document, {
				getGamesList: async () => {
					throw new Error("fail");
				},
			});
			assert.match(
				domErr.window.document.querySelector('[data-testid="error-state"]')
					?.textContent ?? "",
				/Unable to load games data/,
			);
		} finally {
			consoleSpy.mock.restore();
		}
	});

	it("hydrates Movies and TV pages with reversed watchlists, optional years, timestamps, and errors", async () => {
		const consoleSpy = mock.method(console, "error", () => {});
		try {
			const moviesDom = loadHtmlDom("movies.html");
			const mDoc = moviesDom.window.document;

			await initMoviesPage(mDoc, {
				getTraktProfile: async () => ({
					profileUrl: "https://og.trakt.tv/users/custom_movie_fan",
				}),
				getWatchlistMovies: async () => [
					{ movie: { title: "First Added", ids: { trakt: 99 } } },
					{ movie: { title: "No Id Movie" } },
					{
						movie: {
							title: "Latest Added",
							year: 2025,
							ids: { slug: "latest-added-2025" },
						},
					},
				],
				getRecentMovies: async () => [
					{
						id: 1,
						movie: {
							title: "Dune: Part Two",
							year: 2024,
							ids: { slug: "dune-part-two-2024" },
						},
						watched_at: "2026-05-01T12:00:00Z",
					},
					{
						id: 2,
						movie: { title: "Mystery Film" },
						watched_at: "2026-05-02T12:00:00Z",
					},
				],
			});

			assert.equal(
				mDoc.getElementById("profile-link")?.getAttribute("href"),
				"https://og.trakt.tv/users/custom_movie_fan",
			);
			const wlItems = mDoc.querySelectorAll("#panel-watchlist li");
			assert.equal(wlItems.length, 3);
			assert.equal(
				wlItems[0].querySelector("a")?.getAttribute("href"),
				"https://og.trakt.tv/movies/latest-added-2025",
			);
			assert.equal(wlItems[1].querySelector("a"), null);
			assert.equal(
				wlItems[2].querySelector("a")?.getAttribute("href"),
				"https://og.trakt.tv/movies/99",
			);

			mDoc.getElementById("tab-recent")?.click();
			assert.equal(
				mDoc.querySelector("#panel-recent a")?.getAttribute("href"),
				"https://og.trakt.tv/movies/dune-part-two-2024",
			);
			assert.match(
				mDoc.getElementById("panel-recent")?.textContent ?? "",
				/Dune: Part Two/,
			);

			const moviesErrDom = loadHtmlDom("movies.html");
			await initMoviesPage(moviesErrDom.window.document, {
				getTraktProfile: async () => null,
				getWatchlistMovies: async () => {
					throw new Error("err");
				},
				getRecentMovies: async () => [],
			});
			assert.match(
				moviesErrDom.window.document.querySelector(
					'[data-testid="error-state"]',
				)?.textContent ?? "",
				/Unable to load movie data/,
			);

			// TV page
			const tvDom = loadHtmlDom("tv.html");
			const tvDoc = tvDom.window.document;
			await initTvPage(tvDoc, {
				getTraktProfile: async () => null,
				getWatchlistShows: async () => [
					{ show: { title: "Show A", ids: { trakt: 42 } } },
					{ show: { title: "Show No Id" } },
					{ show: { title: "Show B", year: 2024, ids: { slug: "show-b" } } },
				],
				getRecentEpisodes: async () => [
					{
						id: 9,
						show: { title: "Andor", year: 2022, ids: { slug: "andor" } },
						episode: { season: 2, number: 3 },
						watched_at: "2026-06-01T20:00:00Z",
					},
					{
						id: 10,
						show: { title: "Yearless Show" },
						episode: { season: 1, number: 1 },
						watched_at: "2026-06-02T20:00:00Z",
					},
				],
			});

			const tvWl = tvDoc.querySelectorAll("#panel-watchlist li");
			assert.equal(
				tvWl[0].querySelector("a")?.getAttribute("href"),
				"https://og.trakt.tv/shows/show-b",
			);
			assert.equal(tvWl[1].querySelector("a"), null);
			assert.equal(
				tvWl[2].querySelector("a")?.getAttribute("href"),
				"https://og.trakt.tv/shows/42",
			);
			tvDoc.getElementById("tab-recent")?.click();
			const tvRecentLinks = tvDoc.querySelectorAll("#panel-recent a");
			assert.equal(tvRecentLinks.length, 2);
			assert.equal(
				tvRecentLinks[0].getAttribute("href"),
				"https://og.trakt.tv/shows/andor",
			);
			assert.equal(
				tvRecentLinks[1].getAttribute("href"),
				"https://og.trakt.tv/shows/andor/seasons/2/episodes/3",
			);
			assert.match(
				tvDoc.getElementById("panel-recent")?.textContent ?? "",
				/S2 E3/,
			);

			const tvErrDom = loadHtmlDom("tv.html");
			await initTvPage(tvErrDom.window.document, {
				getTraktProfile: async () => ({
					profileUrl: "https://og.trakt.tv/users/noahffiliation",
				}),
				getWatchlistShows: async () => {
					throw new Error("err");
				},
				getRecentEpisodes: async () => [],
			});
			assert.match(
				tvErrDom.window.document.querySelector('[data-testid="error-state"]')
					?.textContent ?? "",
				/Unable to load TV data/,
			);
		} finally {
			consoleSpy.mock.restore();
		}
	});

	it("hydrates Anime, Dramas, and Last.fm pages across populated, sparse, empty, and error states", async () => {
		const consoleSpy = mock.method(console, "error", () => {});
		try {
			// Anime
			const animeDom = loadHtmlDom("anime.html");
			await initAnimePage(animeDom.window.document, {
				getAnimeList: async () => ({
					profileUrl: "https://myanimelist.net/profile/custom_mal",
					totalPlanToWatch: 3,
					totalCompleted: 2,
					planToWatch: [
						{
							id: 1,
							title: "Pluto",
							url: "https://myanimelist.net/anime/1/Pluto",
							mediaType: "ONA",
							episodes: 8,
						},
						{ id: 2, title: "TBA Anime", episodes: 0 },
						{ title: "Idless Anime" },
					],
					completed: [
						{
							id: 3,
							title: "Monster",
							mediaType: "TV",
							episodes: 74,
							score: 10,
						},
						{ id: 4, title: "Unscored OVA", score: 0 },
					],
				}),
			});
			assert.equal(
				animeDom.window.document
					.getElementById("profile-link")
					?.getAttribute("href"),
				"https://myanimelist.net/profile/custom_mal",
			);
			const animePtwLinks = animeDom.window.document.querySelectorAll(
				"#panel-plan-to-watch a",
			);
			assert.equal(animePtwLinks.length, 2);
			assert.equal(
				animePtwLinks[0].getAttribute("href"),
				"https://myanimelist.net/anime/1/Pluto",
			);
			assert.equal(
				animePtwLinks[1].getAttribute("href"),
				"https://myanimelist.net/anime/2",
			);
			assert.equal(
				animeDom.window.document
					.querySelector("#panel-completed a")
					?.getAttribute("href"),
				"https://myanimelist.net/anime/3",
			);
			assert.match(
				animeDom.window.document.getElementById("panel-completed")
					?.textContent ?? "",
				/10\/10/,
			);

			const animeEmpty = loadHtmlDom("anime.html");
			await initAnimePage(animeEmpty.window.document, {
				getAnimeList: async () => ({}),
			});
			assert.match(
				animeEmpty.window.document.getElementById("panel-plan-to-watch")
					?.textContent ?? "",
				/No anime in plan to watch/,
			);

			const animeErr = loadHtmlDom("anime.html");
			await initAnimePage(animeErr.window.document, {
				getAnimeList: async () => {
					throw new Error("err");
				},
			});
			assert.match(
				animeErr.window.document.querySelector('[data-testid="error-state"]')
					?.textContent ?? "",
				/Unable to load anime data/,
			);

			// Dramas
			const dramasDom = loadHtmlDom("dramas.html");
			await initDramasPage(dramasDom.window.document, {
				getDramaList: async () => ({
					profileUrl: "https://mydramalist.com/profile/custom_mdl",
					totalPlanToWatch: 2,
					totalCompleted: 2,
					planToWatch: [
						{
							title: "Signal",
							url: "https://mydramalist.com/13239-signal",
							year: 2016,
							country: "South Korea",
							type: "Drama",
						},
						{ title: "Minimal PTW" },
					],
					completed: [
						{
							title: "My Mister",
							url: "https://mydramalist.com/25172-my-ajusshi",
							year: 2018,
							country: "South Korea",
							episodes: "16/16",
							score: 10,
						},
						{ title: "Minimal Completed" },
					],
				}),
			});
			assert.equal(
				dramasDom.window.document
					.getElementById("profile-link")
					?.getAttribute("href"),
				"https://mydramalist.com/profile/custom_mdl",
			);
			assert.equal(
				dramasDom.window.document
					.querySelector("#panel-plan-to-watch a")
					?.getAttribute("href"),
				"https://mydramalist.com/13239-signal",
			);
			assert.equal(
				dramasDom.window.document
					.querySelector("#panel-completed a")
					?.getAttribute("href"),
				"https://mydramalist.com/25172-my-ajusshi",
			);

			const dramasEmpty = loadHtmlDom("dramas.html");
			await initDramasPage(dramasEmpty.window.document, {
				getDramaList: async () => ({}),
			});
			assert.match(
				dramasEmpty.window.document.getElementById("panel-completed")
					?.textContent ?? "",
				/No completed K-dramas found/,
			);

			const dramasErr = loadHtmlDom("dramas.html");
			await initDramasPage(dramasErr.window.document, {
				getDramaList: async () => {
					throw new Error("err");
				},
			});
			assert.match(
				dramasErr.window.document.querySelector('[data-testid="error-state"]')
					?.textContent ?? "",
				/Unable to load K-drama data/,
			);

			// Last.fm
			const lastfmDom = loadHtmlDom("lastfm.html");
			await initLastFmPage(lastfmDom.window.document, {
				getLastFm: async () => ({
					profileUrl: "https://www.last.fm/user/custom_fm",
					recenttracks: {
						track: [
							{
								name: "Weird Fishes",
								url: "https://www.last.fm/music/Radiohead/_/Weird+Fishes",
								artist: { "#text": "Radiohead" },
							},
							{
								name: "Let It Happen",
								artist: { "#text": "Tame Impala" },
							},
							{
								name: "Custom Page",
								url: "https://www.last.fm/music/Daft+Punk",
								artist: { "#text": "Daft Punk" },
							},
							{
								name: "Nameless Artist Track",
								artist: { "#text": "" },
							},
							{
								name: "",
								artist: { "#text": "Solo Artist" },
							},
						],
					},
				}),
			});
			assert.equal(
				lastfmDom.window.document
					.getElementById("profile-link")
					?.getAttribute("href"),
				"https://www.last.fm/user/custom_fm",
			);
			const lastfmLinks = Array.from(
				lastfmDom.window.document.querySelectorAll("#tracks-container a"),
			).map((a) => a.getAttribute("href"));
			assert.deepEqual(lastfmLinks, [
				"https://www.last.fm/music/Radiohead/_/Weird+Fishes",
				"https://www.last.fm/music/Radiohead",
				"https://www.last.fm/music/Tame+Impala/_/Let+It+Happen",
				"https://www.last.fm/music/Tame+Impala",
				"https://www.last.fm/music/Daft+Punk",
				"https://www.last.fm/music/Daft+Punk",
				"https://www.last.fm/music/Solo+Artist",
			]);

			const lastfmErr = loadHtmlDom("lastfm.html");
			await initLastFmPage(lastfmErr.window.document, {
				getLastFm: async () => {
					throw new Error("err");
				},
			});
			assert.match(
				lastfmErr.window.document.querySelector('[data-testid="error-state"]')
					?.textContent ?? "",
				/Unable to load Last\.fm scrobbles/,
			);

			// Last.fm missing containers guard
			const missingLastfm1 = new JSDOM("<!DOCTYPE html><body></body>");
			await initLastFmPage(missingLastfm1.window.document);
			const missingLastfm2 = new JSDOM(
				"<!DOCTYPE html><body><div id='status-feedback'></div></body>",
			);
			await initLastFmPage(missingLastfm2.window.document);
		} finally {
			consoleSpy.mock.restore();
		}
	});

	it("boots each page module using default globalThis.document and defaultApi parameters", async () => {
		const originalDoc = globalThis.document;
		const originalFetch = globalThis.fetch;
		const consoleSpy = mock.method(console, "error", () => {});

		const mockPayloads = new Map([
			[
				"/api/trakt?endpoint=profile",
				{
					username: "noahffiliation",
					profileUrl: "https://og.trakt.tv/users/noahffiliation",
				},
			],
			["/api/trakt?endpoint=stats", { movies: { watched: 1 } }],
			["/api/trakt?endpoint=watched-shows", { count: 1 }],
			["/api/trakt?endpoint=watchlist-movies", []],
			["/api/trakt?endpoint=watchlist-shows", []],
			["/api/trakt?endpoint=recent-movies", []],
			["/api/trakt?endpoint=recent-episodes", []],
			["/api/lastfm", { recenttracks: { track: [] } }],
			["/api/backloggd", { played: 1, backlog: 1 }],
			["/api/myanimelist", { completed: 1, planToWatch: 1 }],
			["/api/mydramalist", { completed: 1, planToWatch: 1 }],
			["/api/games", { backlog: [], played: [] }],
			["/api/anime", { planToWatch: [], completed: [] }],
			["/api/dramas", { planToWatch: [], completed: [] }],
		]);

		try {
			globalThis.fetch = async (url) =>
				Response.json(mockPayloads.get(String(url)));

			const bootMatrix = [
				["home", "index.html", initHomePage],
				["games", "games.html", initGamesPage],
				["movies", "movies.html", initMoviesPage],
				["tv", "tv.html", initTvPage],
				["anime", "anime.html", initAnimePage],
				["dramas", "dramas.html", initDramasPage],
				["lastfm", "lastfm.html", initLastFmPage],
			];

			for (const [pageId, file, initFn] of bootMatrix) {
				const dom = loadHtmlDom(file);
				globalThis.document = dom.window.document;
				await bootPage(pageId, initFn);
				assert.equal(
					dom.window.document.getElementById("status-feedback").hidden,
					true,
				);
			}
			assert.equal(consoleSpy.mock.callCount(), 0);
		} finally {
			globalThis.document = originalDoc;
			globalThis.fetch = originalFetch;
			consoleSpy.mock.restore();
		}
	});
});
