import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import {
	EDGE_CACHE_CONTROL,
	jsonError,
	jsonOk,
} from "../../src/lib/response.js";
import { ResponseCache } from "../../src/server/cache.js";
import { loadEnvFiles, parseEnvContent } from "../../src/server/env.js";

describe("response helpers", () => {
	it("creates 200 JSON responses with edge cache headers", async () => {
		const res = jsonOk({ hello: "world" }, { "X-Custom": "1" });
		assert.equal(res.status, 200);
		assert.equal(res.headers.get("Cache-Control"), EDGE_CACHE_CONTROL);
		assert.equal(res.headers.get("X-Custom"), "1");
		assert.deepEqual(await res.json(), { hello: "world" });
	});

	it("creates error JSON responses with no-store cache header", async () => {
		const res = jsonError("Upstream failed", 502);
		assert.equal(res.status, 502);
		assert.equal(res.headers.get("Cache-Control"), "no-store");
		assert.deepEqual(await res.json(), { error: "Upstream failed" });
	});
});

describe("env loader", () => {
	it("parses valid key-value lines, quotes, comments, and ignores invalid keys", () => {
		const content = [
			"# comment line",
			"",
			"PLAIN_KEY=plain_value",
			'DOUBLE_QUOTED="hello world"',
			"SINGLE_QUOTED='single val'",
			"NO_EQUALS_LINE",
			"=EMPTY_KEY",
			"123_INVALID=nope",
			"URL_VAL=https://example.com?a=1&b=2",
		].join("\r\n");

		const parsed = parseEnvContent(content);
		assert.deepEqual(parsed, {
			PLAIN_KEY: "plain_value",
			DOUBLE_QUOTED: "hello world",
			SINGLE_QUOTED: "single val",
			URL_VAL: "https://example.com?a=1&b=2",
		});
	});

	it("loads .env.local before .env without overwriting existing variables", () => {
		const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "hobby-env-"));
		try {
			fs.writeFileSync(
				path.join(tmpDir, ".env.local"),
				"A_KEY=from_local\nB_KEY=from_local\n",
			);
			fs.writeFileSync(
				path.join(tmpDir, ".env"),
				"B_KEY=from_env\nC_KEY=from_env\n",
			);

			const target = { A_KEY: "preexisting" };
			loadEnvFiles([".env.local", ".env", ".env.missing"], tmpDir, target);

			assert.deepEqual(target, {
				A_KEY: "preexisting",
				B_KEY: "from_local",
				C_KEY: "from_env",
			});
		} finally {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		}
	});
});

describe("ResponseCache", () => {
	it("caches 2xx responses and deduplicates concurrent in-flight requests", async () => {
		const cache = new ResponseCache(5000);
		let calls = 0;

		const fetcher = async () => {
			calls++;
			await new Promise((r) => setTimeout(r, 15));
			return jsonOk({ calls });
		};

		const [res1, res2] = await Promise.all([
			cache.getOrFetch("k1", fetcher),
			cache.getOrFetch("k1", fetcher),
		]);

		assert.equal(calls, 1);
		assert.equal(res1.status, 200);
		assert.equal(res2.body, res1.body);

		const res3 = await cache.getOrFetch("k1", fetcher);
		assert.equal(calls, 1);
		assert.equal(res3.body, res1.body);

		cache.clear();
		const res4 = await cache.getOrFetch("k1", fetcher);
		assert.equal(calls, 2);
		assert.deepEqual(JSON.parse(res4.body), { calls: 2 });
	});

	it("does not cache non-2xx responses and evicts expired entries", async () => {
		const cache = new ResponseCache(10);
		let calls = 0;

		const failFirst = async () => {
			calls++;
			if (calls === 1) return jsonError("fail", 502);
			return jsonOk({ ok: calls });
		};

		const first = await cache.getOrFetch("err-key", failFirst);
		assert.equal(first.status, 502);

		const second = await cache.getOrFetch("err-key", failFirst);
		assert.equal(second.status, 200);
		assert.equal(calls, 2);

		await new Promise((r) => setTimeout(r, 20));
		const third = await cache.getOrFetch("err-key", failFirst);
		assert.equal(calls, 3);
		assert.deepEqual(JSON.parse(third.body), { ok: 3 });
	});

	it("bypasses storage when ttlMs <= 0", async () => {
		const cache = new ResponseCache(0);
		let count = 0;
		const r1 = await cache.getOrFetch("x", async () => jsonOk({ c: ++count }));
		const r2 = await cache.getOrFetch("x", async () => jsonOk({ c: ++count }));
		assert.deepEqual(JSON.parse(r1.body), { c: 1 });
		assert.deepEqual(JSON.parse(r2.body), { c: 2 });
	});
});
