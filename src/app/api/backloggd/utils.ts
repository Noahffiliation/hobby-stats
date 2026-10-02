import crypto from "node:crypto";

export function getBackloggdUsername(): string {
  return process.env.NEXT_PUBLIC_BACKLOGGD_USERNAME || "Noahffiliation";
}

export function getBackloggdCookie(): string | undefined {
  return (
    process.env.BACKLOGGD_COOKIE || process.env.NEXT_PUBLIC_BACKLOGGD_COOKIE
  );
}

export const PLAYED_REGEX =
  /href="\/u\/[^/]+(?:\/games)?\/played\/[^"]*"[^>]*>\s*<h\d+>\s*([0-9,]+)\s*<\/h\d+>/i;
export const BACKLOG_REGEX =
  /href="\/u\/[^/]+(?:\/games)?\/backlog\/[^"]*"[^>]*>\s*<h\d+>\s*([0-9,]+)\s*<\/h\d+>/i;
export const ANUBIS_CHALLENGE_REGEX =
  /<script id="anubis_challenge" type="application\/json">([\s\S]*?)<\/script>/;

export class CookieJar {
  private readonly cookies = new Map<string, string>();

  public setCookieString(cookieStr?: string): void {
    if (!cookieStr) return;
    const items = cookieStr.split(";");
    for (const item of items) {
      const parts = item.split("=");
      const name = parts[0]?.trim();
      const val = parts.slice(1).join("=").trim();
      if (name) {
        if (!val) {
          this.cookies.delete(name);
        } else {
          this.cookies.set(name, val);
        }
      }
    }
  }

  public setCookies(cookieHeaders: string[]): void {
    for (const header of cookieHeaders) {
      const cookiePart = header.split(";")[0];
      const parts = cookiePart.split("=");
      const name = parts[0]?.trim();
      const val = parts.slice(1).join("=").trim();
      if (name) {
        if (!val) {
          this.cookies.delete(name);
        } else {
          this.cookies.set(name, val);
        }
      }
    }
  }

  public toHeader(): string {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  public clear(): void {
    this.cookies.clear();
  }
}

export const sharedBackloggdCookieJar = new CookieJar();

export function solveAnubisPoW(
  randomData: string,
  difficulty: number,
  maxIterations = 100_000,
): { nonce: number; hash: string } | null {
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

    if (isValid && isDifficultyOdd) {
      if (hashBuffer[requiredZeroBytes] >> 4 !== 0) {
        isValid = false;
      }
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

export interface AnubisChallengeInfo {
  id: string;
  randomData: string;
  difficulty: number;
}

export function parseAnubisChallenge(html: string): AnubisChallengeInfo | null {
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

async function solveAndPassAnubisChallenge(
  url: string,
  html: string,
  headers: Record<string, string>,
): Promise<string | null> {
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

  const passCookies = passRes.headers?.getSetCookie?.() ?? [];
  sharedBackloggdCookieJar.setCookies(passCookies);

  headers.Cookie = sharedBackloggdCookieJar.toHeader();
  const finalRes = await fetch(url, { method: "GET", headers });
  const finalCookies = finalRes.headers?.getSetCookie?.() ?? [];
  sharedBackloggdCookieJar.setCookies(finalCookies);

  if (!finalRes.ok) return null;
  const finalHtml = await finalRes.text();
  if (finalHtml.includes("Making sure you&#39;re not a bot!")) {
    return null;
  }
  return finalHtml;
}

export async function fetchBackloggdHtml(url: string): Promise<string | null> {
  const envCookie = getBackloggdCookie();
  if (envCookie) {
    sharedBackloggdCookieJar.setCookieString(envCookie);
  }

  const headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  };

  const cookieHeader = sharedBackloggdCookieJar.toHeader();
  if (cookieHeader) {
    headers.Cookie = cookieHeader;
  }

  try {
    const res = await fetch(url, { method: "GET", headers });
    const setCookies = res.headers?.getSetCookie?.() ?? [];
    sharedBackloggdCookieJar.setCookies(setCookies);

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
