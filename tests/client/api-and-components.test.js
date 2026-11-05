import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import { JSDOM } from "jsdom";
import {
	getAnimeList,
	getBackloggdStats,
	getDramaList,
	getGamesList,
	getLastFm,
	getMyAnimeListStats,
	getMyDramaListStats,
	getRecentEpisodes,
	getRecentMovies,
	getTraktStats,
	getWatchedShows,
	getWatchlistMovies,
	getWatchlistShows,
} from "../../public/js/api.js";
import {
	bootPage,
	clearStatus,
	createBadge,
	createElement,
	createEmptyMessage,
	createMediaList,
	createProgress,
	createScoreRating,
	getTabbedPageElements,
	initTabs,
	renderError,
	renderLoading,
	runTabbedPage,
} from "../../public/js/components.js";

describe("public/js/api.js", () => {
	const originalFetch = globalThis.fetch;

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	it("calls each /api/* endpoint and unwraps JSON payloads", async () => {
		const calls = [];
		globalThis.fetch = mock.fn(async (url) => {
			calls.push(url);
			if (url.includes("watched-shows")) {
				return Response.json({ count: 77 });
			}
			return Response.json({ ok: true, url });
		});

		assert.deepEqual(await getTraktStats(), {
			ok: true,
			url: "/api/trakt?endpoint=stats",
		});
		assert.equal(await getWatchedShows(), 77);
		assert.equal((await getWatchlistMovies()).ok, true);
		assert.equal((await getWatchlistShows()).ok, true);
		assert.equal((await getRecentMovies()).ok, true);
		assert.equal((await getRecentEpisodes()).ok, true);
		assert.equal((await getLastFm()).ok, true);
		assert.equal((await getBackloggdStats()).ok, true);
		assert.equal((await getMyAnimeListStats()).ok, true);
		assert.equal((await getMyDramaListStats()).ok, true);
		assert.equal((await getGamesList()).ok, true);
		assert.equal((await getAnimeList()).ok, true);
		assert.equal((await getDramaList()).ok, true);
		assert.equal(calls.length, 13);
	});

	it("throws descriptive errors when responses are not ok", async () => {
		globalThis.fetch = mock.fn(
			async () => new Response("err", { status: 502 }),
		);

		await assert.rejects(() => getTraktStats(), /Failed to fetch Trakt stats/);
		await assert.rejects(
			() => getWatchedShows(),
			/Failed to fetch Trakt watched shows/,
		);
		await assert.rejects(() => getGamesList(), /Failed to fetch games list/);
		await assert.rejects(() => getAnimeList(), /Failed to fetch anime list/);
		await assert.rejects(() => getDramaList(), /Failed to fetch drama list/);
	});
});

describe("public/js/components.js", () => {
	it("builds progress bars, badges, ratings, lists, and status banners safely via textContent", () => {
		const dom = new JSDOM(
			"<!DOCTYPE html><body><div id='status'></div></body>",
		);
		const doc = dom.window.document;

		const plainDiv = createElement(doc, "div");
		assert.equal(plainDiv.tagName, "DIV");

		const el = createElement(doc, "span", {
			className: "test",
			text: "<script>alert(1)</script>",
			attrs: { "data-a": "1", "data-null": null },
		});
		assert.equal(el.textContent, "<script>alert(1)</script>");
		assert.equal(el.children.length, 0);
		assert.equal(el.hasAttribute("data-null"), false);

		const p1 = createProgress(doc, {
			label: "Movies - 10 / 20",
			showValueLabel: true,
			value: 50.4,
		});
		assert.equal(p1.getAttribute("data-testid"), "progress");
		assert.match(p1.textContent ?? "", /50%/);
		assert.equal(p1.querySelector("progress")?.getAttribute("value"), "50");

		const pLabelOnly = createProgress(doc, {
			label: "Label Only",
			showValueLabel: false,
			value: 25,
		});
		assert.match(pLabelOnly.textContent ?? "", /Label Only/);

		const pValueOnly = createProgress(doc, {
			showValueLabel: true,
			value: 75,
		});
		assert.match(pValueOnly.textContent ?? "", /75%/);

		const pClampHigh = createProgress(doc, { value: 180 });
		assert.equal(
			pClampHigh.querySelector("progress")?.getAttribute("value"),
			"100",
		);
		const pClampLow = createProgress(doc, { value: -20 });
		assert.equal(
			pClampLow.querySelector("progress")?.getAttribute("value"),
			"0",
		);

		const badge1 = createBadge(doc, "PC");
		assert.equal(badge1.className, "badge");
		const badge2 = createBadge(doc, "Completed", "emerald");
		assert.equal(badge2.className, "badge badge-emerald");

		const score = createScoreRating(doc, 9);
		assert.match(score.textContent ?? "", /9\/10/);

		const empty = createEmptyMessage(doc, "Nothing here.");
		assert.equal(empty.textContent, "Nothing here.");

		const list = createMediaList(doc);
		assert.equal(list.getAttribute("role"), "list");

		const status = doc.getElementById("status");
		renderLoading(status, "Loading...");
		assert.equal(status.hidden, false);
		assert.ok(status.querySelector('[data-testid="loading-state"]'));

		renderError(status, "Something broke");
		const errNode = status.querySelector('[data-testid="error-state"]');
		assert.ok(errNode);
		assert.equal(errNode.getAttribute("role"), "alert");
		assert.match(errNode.textContent ?? "", /Something broke/);

		clearStatus(status);
		assert.equal(status.hidden, true);
		assert.equal(status.children.length, 0);
	});

	it("manages ARIA tab selection, counts, keyboard navigation, and bootPage/runTabbedPage guards", async () => {
		const dom = new JSDOM(`
			<!DOCTYPE html>
			<body data-page="demo">
				<div id="tabs" role="tablist">
					<button id="t1" role="tab" data-tab="first" data-label="First" aria-selected="true" aria-controls="p1" tabindex="0">First</button>
					<button id="t2" role="tab" data-tab="second" aria-selected="false" aria-controls="p2" tabindex="-1">Second</button>
					<button id="t3" role="tab" aria-selected="false" aria-controls="missing-panel" tabindex="-1">Orphan</button>
					<button id="t4" role="tab" data-tab="fourth" aria-selected="false" tabindex="-1">NoPanel</button>
				</div>
				<div id="status-feedback"></div>
				<div id="content-panels">
					<div id="p1" role="tabpanel"></div>
					<div id="p2" role="tabpanel" hidden></div>
				</div>
			</body>
		`);
		const doc = dom.window.document;
		const selectedIds = [];
		const controller = initTabs(doc.getElementById("tabs"), (id) =>
			selectedIds.push(id),
		);

		const t1 = doc.getElementById("t1");
		const t2 = doc.getElementById("t2");
		const t3 = doc.getElementById("t3");
		const p1 = doc.getElementById("p1");
		const p2 = doc.getElementById("p2");

		controller.setTabCounts({ first: 12, second: null });
		assert.equal(t1.textContent, "First (12)");
		assert.equal(t2.textContent, "Second");
		assert.equal(t3.textContent, "Orphan");

		t2.click();
		assert.equal(t2.getAttribute("aria-selected"), "true");
		assert.equal(p1.hidden, true);
		assert.equal(p2.hidden, false);
		assert.deepEqual(selectedIds, ["second"]);

		t3.click();
		assert.equal(t3.getAttribute("aria-selected"), "true");

		t2.dispatchEvent(
			new dom.window.KeyboardEvent("keydown", {
				key: "ArrowLeft",
				bubbles: true,
			}),
		);
		assert.equal(t1.getAttribute("aria-selected"), "true");

		t1.dispatchEvent(
			new dom.window.KeyboardEvent("keydown", {
				key: "ArrowRight",
				bubbles: true,
			}),
		);
		assert.equal(t2.getAttribute("aria-selected"), "true");

		t2.dispatchEvent(
			new dom.window.KeyboardEvent("keydown", { key: "Home", bubbles: true }),
		);
		assert.equal(t1.getAttribute("aria-selected"), "true");

		t1.dispatchEvent(
			new dom.window.KeyboardEvent("keydown", { key: "End", bubbles: true }),
		);
		assert.equal(
			doc.getElementById("t4").getAttribute("aria-selected"),
			"true",
		);

		t1.dispatchEvent(
			new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
		);

		controller.selectTab("first");
		assert.equal(t1.getAttribute("aria-selected"), "true");
		controller.selectTab("does-not-exist");
		assert.equal(t1.getAttribute("aria-selected"), "true");

		assert.ok(getTabbedPageElements(doc, "tabs", "p1", "p2"));
		assert.equal(getTabbedPageElements(doc, "missing", "p1", "p2"), null);

		// runTabbedPage early return when required DOM nodes are absent
		await runTabbedPage(doc, {
			tablistId: "missing",
			firstPanelId: "p1",
			secondPanelId: "p2",
			loadingMessage: "Loading...",
			errorMessage: "Error",
			load: async () => {},
		});

		// bootPage guard & activation
		let booted = 0;
		await bootPage(
			"demo",
			async () => {
				booted++;
			},
			undefined,
		);
		await bootPage(
			"other",
			async () => {
				booted++;
			},
			doc,
		);
		assert.equal(booted, 0);

		await bootPage(
			"demo",
			async () => {
				booted++;
			},
			doc,
		);
		assert.equal(booted, 1);
	});
});
