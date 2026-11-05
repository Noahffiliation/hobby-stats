import crypto from "node:crypto";
import { DEFAULT_BROWSER_UA } from "./mal-utils.js";

export function getBackloggdUsername() {
	return (
		process.env.BACKLOGGD_USERNAME ||
		process.env.NEXT_PUBLIC_BACKLOGGD_USERNAME ||
		"Noahffiliation"
	);
}

export function getBackloggdCookie() {
	return (
		process.env.BACKLOGGD_COOKIE || process.env.NEXT_PUBLIC_BACKLOGGD_COOKIE
	);
}

export function getBackloggdFallbackStats() {
	const playedStr =
		process.env.BACKLOGGD_PLAYED ?? process.env.NEXT_PUBLIC_BACKLOGGD_PLAYED;
	const backlogStr =
		process.env.BACKLOGGD_BACKLOG ?? process.env.NEXT_PUBLIC_BACKLOGGD_BACKLOG;

	if (playedStr !== undefined && backlogStr !== undefined) {
		const played = Number.parseInt(playedStr, 10);
		const backlog = Number.parseInt(backlogStr, 10);
		if (!Number.isNaN(played) && !Number.isNaN(backlog)) {
			return { played, backlog };
		}
	}
	return null;
}

export const PLAYED_REGEX =
	/href="\/u\/[^/]+(?:\/games)?\/played\/[^"]*"[^>]*>\s*<h\d+>\s*([0-9,]+)\s*<\/h\d+>/i;
export const BACKLOG_REGEX =
	/href="\/u\/[^/]+(?:\/games)?\/backlog\/[^"]*"[^>]*>\s*<h\d+>\s*([0-9,]+)\s*<\/h\d+>/i;
export const ANUBIS_CHALLENGE_REGEX =
	/<script id="anubis_challenge" type="application\/json">([\s\S]*?)<\/script>/;

export class CookieJar {
	cookies = new Map();

	#applyPair(rawPair) {
		const parts = rawPair.split("=");
		const name = parts[0].trim();
		const val = parts.slice(1).join("=").trim();
		if (!name) return;
		if (!val) {
			this.cookies.delete(name);
		} else {
			this.cookies.set(name, val);
		}
	}

	setCookieString(cookieStr) {
		if (!cookieStr) return;
		for (const item of cookieStr.split(";")) {
			this.#applyPair(item);
		}
	}

	setCookies(cookieHeaders) {
		for (const header of cookieHeaders) {
			this.#applyPair(header.split(";")[0]);
		}
	}

	toHeader() {
		return Array.from(this.cookies.entries())
			.map(([k, v]) => `${k}=${v}`)
			.join("; ");
	}

	clear() {
		this.cookies.clear();
	}
}

export const sharedBackloggdCookieJar = new CookieJar();

export function solveAnubisPoW(
	randomData,
	difficulty,
	maxIterations = 2_500_000,
) {
	if (difficulty > 6) {
		return null;
	}

	const requiredZeroBytes = Math.floor(difficulty / 2);
	const isDifficultyOdd = difficulty % 2 !== 0;
	let nonce = 0;

	while (nonce < maxIterations) {
		const hashBuffer = crypto
			.createHash("sha256")
			.update(randomData + nonce)
			.digest();

		let isValid = true;
		for (let i = 0; i < requiredZeroBytes; i++) {
			if (hashBuffer[i] !== 0) {
				isValid = false;
				break;
			}
		}

		if (
			isValid &&
			isDifficultyOdd &&
			hashBuffer[requiredZeroBytes] >> 4 !== 0
		) {
			isValid = false;
		}

		if (isValid) {
			return {
				nonce,
				hash: hashBuffer.toString("hex"),
			};
		}
		nonce++;
	}

	return null;
}

export function parseAnubisChallenge(html) {
	const match = ANUBIS_CHALLENGE_REGEX.exec(html);
	if (!match) return null;

	try {
		const data = JSON.parse(match[1]);
		const { rules, challenge } = data ?? {};
		if (rules?.algorithm !== "fast" || typeof rules?.difficulty !== "number") {
			return null;
		}
		if (!challenge?.id || !challenge?.randomData) {
			return null;
		}
		return {
			id: challenge.id,
			randomData: challenge.randomData,
			difficulty: rules.difficulty,
		};
	} catch {
		return null;
	}
}

function syncResponseCookies(res) {
	const setCookies =
		typeof res.headers?.getSetCookie === "function"
			? res.headers.getSetCookie()
			: [];
	sharedBackloggdCookieJar.setCookies(setCookies);
}

async function solveAndPassAnubisChallenge(url, html, headers) {
	const challenge = parseAnubisChallenge(html);
	if (!challenge) return null;

	const t0 = Date.now();
	const solution = solveAnubisPoW(challenge.randomData, challenge.difficulty);
	if (!solution) return null;

	const t1 = Date.now();
	const passUrl = new URL(
		"/.within.website/x/cmd/anubis/api/pass-challenge",
		url,
	);
	passUrl.searchParams.set("id", challenge.id);
	passUrl.searchParams.set("response", solution.hash);
	passUrl.searchParams.set("nonce", String(solution.nonce));
	passUrl.searchParams.set("redir", url);
	passUrl.searchParams.set("elapsedTime", String(t1 - t0));

	const passRes = await fetch(passUrl.toString(), {
		method: "GET",
		headers: {
			...headers,
			Cookie: sharedBackloggdCookieJar.toHeader(),
			Referer: url,
		},
		redirect: "manual",
	});
	syncResponseCookies(passRes);

	headers.Cookie = sharedBackloggdCookieJar.toHeader();
	const finalRes = await fetch(url, { method: "GET", headers });
	syncResponseCookies(finalRes);

	if (!finalRes.ok) return null;
	const finalHtml = await finalRes.text();
	if (finalHtml.includes("Making sure you&#39;re not a bot!")) {
		return null;
	}
	return finalHtml;
}

export async function fetchBackloggdHtml(url) {
	const envCookie = getBackloggdCookie();
	if (envCookie) {
		sharedBackloggdCookieJar.setCookieString(envCookie);
	}

	const headers = {
		"User-Agent": DEFAULT_BROWSER_UA,
		Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
	};

	const cookieHeader = sharedBackloggdCookieJar.toHeader();
	if (cookieHeader) {
		headers.Cookie = cookieHeader;
	}

	try {
		const res = await fetch(url, { method: "GET", headers });
		syncResponseCookies(res);

		const html = await res.text();

		if (html.includes("Making sure you&#39;re not a bot!")) {
			return await solveAndPassAnubisChallenge(url, html, headers);
		}

		if (!res.ok) return null;
		return html;
	} catch {
		return null;
	}
}
