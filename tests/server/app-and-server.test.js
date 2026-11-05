import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it, mock } from "node:test";
import { pathToFileURL } from "node:url";
import { createApp, resolveSafeStaticPath } from "../../src/server/app.js";
import { runMainIfCli, startServer } from "../../src/server/index.js";

describe("HTTP server & static/API router", () => {
	let server;
	let baseUrl;
	const originalFetch = globalThis.fetch;
	const savedEnv = { ...process.env };

	before(async () => {
		server = await startServer({
			port: 0,
			hostname: "127.0.0.1",
			cacheTtlMs: 0,
		});
		const addr = server.address();
		baseUrl = `http://127.0.0.1:${addr.port}`;
	});

	after(async () => {
		process.env = { ...savedEnv };
		globalThis.fetch = originalFetch;
		await new Promise((resolve) => server.close(resolve));
	});

	it("serves home page and clean URLs with security headers", async () => {
		const res = await originalFetch(`${baseUrl}/`);
		assert.equal(res.status, 200);
		assert.match(res.headers.get("content-type") ?? "", /text\/html/);
		assert.equal(res.headers.get("x-content-type-options"), "nosniff");
		assert.equal(res.headers.get("x-frame-options"), "SAMEORIGIN");
		const html = await res.text();
		assert.match(html, /Media Progress Dashboard/);

		const gamesRes = await originalFetch(`${baseUrl}/games`);
		assert.equal(gamesRes.status, 200);
		assert.match(await gamesRes.text(), /Tracked video game backlog/);
	});

	it("supports HEAD requests and static CSS/JS/ICO assets", async () => {
		const headRes = await originalFetch(`${baseUrl}/css/styles.css`, {
			method: "HEAD",
		});
		assert.equal(headRes.status, 200);
		assert.match(headRes.headers.get("content-type") ?? "", /text\/css/);
		assert.equal(await headRes.text(), "");

		const jsRes = await originalFetch(`${baseUrl}/js/api.js`);
		assert.equal(jsRes.status, 200);
		assert.match(jsRes.headers.get("content-type") ?? "", /text\/javascript/);

		const icoRes = await originalFetch(`${baseUrl}/favicon.ico`);
		assert.equal(icoRes.status, 200);
		assert.match(icoRes.headers.get("content-type") ?? "", /image\/x-icon/);
	});

	it("issues 308 clean-URL redirects only for allowlisted routes and blocks open redirects", async () => {
		const indexRedir = await originalFetch(`${baseUrl}/index.html`, {
			redirect: "manual",
		});
		assert.equal(indexRedir.status, 308);
		assert.equal(indexRedir.headers.get("location"), "/");

		const dotHtmlRedir = await originalFetch(`${baseUrl}/.html`, {
			redirect: "manual",
		});
		assert.equal(dotHtmlRedir.status, 308);
		assert.equal(dotHtmlRedir.headers.get("location"), "/");

		const htmlRedir = await originalFetch(`${baseUrl}/movies.html`, {
			redirect: "manual",
		});
		assert.equal(htmlRedir.status, 308);
		assert.equal(htmlRedir.headers.get("location"), "/movies");

		const slashRedir = await originalFetch(`${baseUrl}/anime/`, {
			redirect: "manual",
		});
		assert.equal(slashRedir.status, 308);
		assert.equal(slashRedir.headers.get("location"), "/anime");

		const multiSlashKnown = await originalFetch(`${baseUrl}///games`, {
			redirect: "manual",
		});
		assert.equal(multiSlashKnown.status, 308);
		assert.equal(multiSlashKnown.headers.get("location"), "/games");

		const multiSlashEvil = await originalFetch(
			`${baseUrl}///evil.example.html`,
			{ redirect: "manual" },
		);
		assert.equal(multiSlashEvil.status, 404);
		assert.equal(multiSlashEvil.headers.get("location"), null);

		const backslashEvil = await originalFetch(
			`${baseUrl}/%5Cevil.example.html`,
			{ redirect: "manual" },
		);
		assert.equal(backslashEvil.status, 404);
		assert.equal(backslashEvil.headers.get("location"), null);
	});

	it("serves Vercel script stubs locally without 404", async () => {
		const insights = await originalFetch(
			`${baseUrl}/_vercel/insights/script.js`,
		);
		assert.equal(insights.status, 200);
		assert.match(
			insights.headers.get("content-type") ?? "",
			/text\/javascript/,
		);

		const speed = await originalFetch(
			`${baseUrl}/_vercel/speed-insights/script.js`,
		);
		assert.equal(speed.status, 200);
	});

	it("rejects unsupported HTTP methods with 405 and blocks path traversal / invalid URLs with 404", async () => {
		const postRes = await originalFetch(`${baseUrl}/api/games`, {
			method: "POST",
		});
		assert.equal(postRes.status, 405);
		assert.equal(postRes.headers.get("allow"), "GET, HEAD");

		const traversalRes = await originalFetch(`${baseUrl}/%2e%2e/package.json`);
		assert.equal(traversalRes.status, 404);

		// Direct unit verification of encoded-slash traversal & sibling-prefix bypass
		const sampleRoot = path.resolve("/srv/public");
		assert.equal(resolveSafeStaticPath(sampleRoot, "/..%2fsecret.txt"), null);
		assert.equal(resolveSafeStaticPath(sampleRoot, "/..%2fpublic"), null);

		const badEncodingRes = await originalFetch(`${baseUrl}/%E0%A4%A`);
		assert.equal(badEncodingRes.status, 404);

		const nullByteRes = await originalFetch(`${baseUrl}/test%00.txt`);
		assert.equal(nullByteRes.status, 404);

		const missingPage = await originalFetch(`${baseUrl}/nonexistent-route`);
		assert.equal(missingPage.status, 404);

		const directoryPath = await originalFetch(`${baseUrl}/css.ext`);
		assert.equal(directoryPath.status, 404);
	});

	it("dispatches known /api/* routes and returns 404 for unknown /api/* routes", async () => {
		const unknownApi = await originalFetch(`${baseUrl}/api/unknown`);
		assert.equal(unknownApi.status, 404);

		const traktBadParam = await originalFetch(`${baseUrl}/api/trakt`);
		assert.equal(traktBadParam.status, 400);
		const body = await traktBadParam.json();
		assert.equal(body.error, "Invalid or missing endpoint parameter");

		globalThis.fetch = async () =>
			Response.json({ movies: { watched: 10 }, recenttracks: { track: [] } });
		try {
			const traktOk = await originalFetch(
				`${baseUrl}/api/trakt?endpoint=stats`,
			);
			assert.equal(traktOk.status, 200);

			const lastfmOk = await originalFetch(`${baseUrl}/api/lastfm`);
			assert.equal(lastfmOk.status, 200);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	it("returns 404 for directories and application/octet-stream for unknown file extensions", async () => {
		const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "hobby-pub-"));
		fs.mkdirSync(path.join(tmpDir, "folder.txt"));
		fs.writeFileSync(path.join(tmpDir, "raw.bin"), "binary");
		const customServer = await startServer({
			port: 0,
			hostname: "127.0.0.1",
			publicDir: tmpDir,
			cacheTtlMs: 0,
		});
		try {
			const addr = customServer.address();
			const dirRes = await originalFetch(
				`http://127.0.0.1:${addr.port}/folder.txt`,
			);
			assert.equal(dirRes.status, 404);

			const binRes = await originalFetch(
				`http://127.0.0.1:${addr.port}/raw.bin`,
			);
			assert.equal(binRes.status, 200);
			assert.equal(
				binRes.headers.get("content-type"),
				"application/octet-stream",
			);
		} finally {
			await new Promise((resolve) => customServer.close(resolve));
			fs.rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	it("handles createApp defaults, fallback req fields, startServer error handler, and CLI runner", async () => {
		process.env.CACHE_TTL_MS = "not-a-number";
		const defaultApp = createApp();
		assert.equal(defaultApp.cache.ttlMs, 3_600_000);

		delete process.env.CACHE_TTL_MS;
		const envDefaultApp = createApp();
		assert.equal(envDefaultApp.cache.ttlMs, 3_600_000);

		let capturedStatus = 0;
		const mockRes = {
			writeHead(status) {
				capturedStatus = status;
			},
			end() {},
		};
		await defaultApp({ method: undefined, url: "" }, mockRes);
		assert.equal(capturedStatus, 200);

		// startServer with env PORT/HOSTNAME fallbacks and unhandled app rejection
		process.env.PORT = "0";
		process.env.HOSTNAME = "127.0.0.1";
		let requestNum = 0;
		const errServer = await startServer({
			envFiles: [],
			app: async (_req, res) => {
				requestNum++;
				if (requestNum === 2) {
					res.writeHead(200, { "Content-Type": "text/plain" });
				}
				throw new Error("boom");
			},
		});
		try {
			const addr = errServer.address();
			const r1 = await originalFetch(`http://127.0.0.1:${addr.port}/a`);
			assert.equal(r1.status, 500);
			assert.deepEqual(await r1.json(), { error: "Internal server error" });

			const r2 = await originalFetch(`http://127.0.0.1:${addr.port}/b`);
			assert.equal(r2.status, 200);
		} finally {
			await new Promise((r) => errServer.close(r));
		}

		// Exercise PORT ?? "3000" and HOSTNAME ?? "0.0.0.0" fallback expressions
		delete process.env.PORT;
		delete process.env.HOSTNAME;
		try {
			const defaultPortServer = await startServer({ envFiles: [] });
			await new Promise((r) => defaultPortServer.close(r));
		} catch {
			// Port 3000 already bound on host; fallback branches still executed
		}

		// runMainIfCli coverage
		assert.equal(await runMainIfCli("", "file:///x"), null);

		const logMock = mock.method(console, "log", () => {});
		try {
			const signals = new Map();
			let exitedCode = null;
			let closed = false;
			const fakeProc = {
				on(sig, fn) {
					signals.set(sig, fn);
				},
				exit(code) {
					exitedCode = code;
				},
			};
			const fakeEntry = path.resolve("/tmp/hobby-cli.js");
			const fakeMeta = pathToFileURL(fakeEntry).href;

			const cli1 = await runMainIfCli(
				fakeEntry,
				fakeMeta,
				fakeProc,
				async () => ({
					address: () => ({ port: 4567 }),
					close(cb) {
						closed = true;
						cb();
					},
				}),
			);
			assert.ok(cli1);
			assert.ok(signals.has("SIGINT"));
			assert.ok(signals.has("SIGTERM"));
			cli1.shutdown();
			assert.equal(closed, true);
			assert.equal(exitedCode, 0);

			// Non-object address branch (e.g. pipe / null)
			const cli2 = await runMainIfCli(
				fakeEntry,
				fakeMeta,
				fakeProc,
				async () => ({
					address: () => null,
					close(cb) {
						cb();
					},
				}),
			);
			assert.ok(cli2);
		} finally {
			logMock.mock.restore();
		}
	});
});
