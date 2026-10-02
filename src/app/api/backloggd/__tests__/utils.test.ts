import crypto from "node:crypto";
import {
  BACKLOG_REGEX,
  CookieJar,
  fetchBackloggdHtml,
  getBackloggdCookie,
  getBackloggdUsername,
  PLAYED_REGEX,
  sharedBackloggdCookieJar,
  solveAnubisPoW,
} from "../utils";

globalThis.fetch = jest.fn();

describe("Backloggd Utils", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    sharedBackloggdCookieJar.clear();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("getBackloggdUsername", () => {
    it("returns default Noahffiliation when not set", () => {
      delete process.env.NEXT_PUBLIC_BACKLOGGD_USERNAME;
      expect(getBackloggdUsername()).toBe("Noahffiliation");
    });

    it("returns env variable when set", () => {
      process.env.NEXT_PUBLIC_BACKLOGGD_USERNAME = "custom_user";
      expect(getBackloggdUsername()).toBe("custom_user");
    });
  });

  describe("getBackloggdCookie", () => {
    it("returns undefined when not set", () => {
      delete process.env.BACKLOGGD_COOKIE;
      delete process.env.NEXT_PUBLIC_BACKLOGGD_COOKIE;
      expect(getBackloggdCookie()).toBeUndefined();
    });

    it("returns BACKLOGGD_COOKIE when set", () => {
      process.env.BACKLOGGD_COOKIE = "cookie_a=1";
      expect(getBackloggdCookie()).toBe("cookie_a=1");
    });

    it("returns NEXT_PUBLIC_BACKLOGGD_COOKIE when BACKLOGGD_COOKIE is not set", () => {
      delete process.env.BACKLOGGD_COOKIE;
      process.env.NEXT_PUBLIC_BACKLOGGD_COOKIE = "cookie_b=2";
      expect(getBackloggdCookie()).toBe("cookie_b=2");
    });
  });

  describe("CookieJar", () => {
    it("handles cookie strings correctly", () => {
      const jar = new CookieJar();
      jar.setCookieString();
      expect(jar.toHeader()).toBe("");

      jar.setCookieString("foo=bar; baz=qux");
      expect(jar.toHeader()).toBe("foo=bar; baz=qux");

      // Delete cookie when empty value
      jar.setCookieString("foo=");
      expect(jar.toHeader()).toBe("baz=qux");

      jar.clear();
      expect(jar.toHeader()).toBe("");
    });

    it("handles Set-Cookie headers correctly", () => {
      const jar = new CookieJar();
      jar.setCookies([
        "session=abc; Path=/; Secure",
        "auth=xyz; HttpOnly",
        "session=; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
      ]);
      expect(jar.toHeader()).toBe("auth=xyz");
    });
  });

  describe("Regexes", () => {
    it("matches played and backlog links with and without /games/", () => {
      const html1 =
        '<a href="/u/Noahffiliation/played/all/"><h1>123</h1></a><a href="/u/Noahffiliation/backlog/all/"><h1>456</h1></a>';
      expect(PLAYED_REGEX.exec(html1)?.[1]).toBe("123");
      expect(BACKLOG_REGEX.exec(html1)?.[1]).toBe("456");

      const html2 =
        '<a href="/u/Noahffiliation/games/played/all/"><h1>789</h1></a><a href="/u/Noahffiliation/games/backlog/all/"><h1>101</h1></a>';
      expect(PLAYED_REGEX.exec(html2)?.[1]).toBe("789");
      expect(BACKLOG_REGEX.exec(html2)?.[1]).toBe("101");
    });
  });

  describe("solveAnubisPoW", () => {
    it("returns null when difficulty > 6", () => {
      expect(solveAnubisPoW("abc", 7)).toBeNull();
    });

    it("solves even difficulty (difficulty 2)", () => {
      const res = solveAnubisPoW("test-seed", 2);
      expect(res).not.toBeNull();
      expect(res?.hash.startsWith("00")).toBe(true);
    });

    it("solves odd difficulty (difficulty 1)", () => {
      const res = solveAnubisPoW("test-seed-odd", 1);
      expect(res).not.toBeNull();
      expect(res?.hash.startsWith("0")).toBe(true);
    });

    it("returns null if loop limit is reached without finding hash", () => {
      const originalCreateHash = crypto.createHash;
      // Mock hash to return non-zero
      jest.spyOn(crypto, "createHash").mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue(Buffer.from([0xff, 0xff])),
      } as any);

      // Force loop termination quickly
      const res = solveAnubisPoW("test", 2, 5);
      expect(res).toBeNull();

      jest.spyOn(crypto, "createHash").mockImplementation(originalCreateHash);
    });
  });

  describe("fetchBackloggdHtml", () => {
    const testUrl = "https://backloggd.com/u/Noahffiliation/";

    it("returns html when fetch succeeds without challenge", async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => "<html><body>Profile Page</body></html>",
        headers: {
          getSetCookie: () => ["token=123; Path=/"],
        },
      });

      const result = await fetchBackloggdHtml(testUrl);
      expect(result).toBe("<html><body>Profile Page</body></html>");
      expect(sharedBackloggdCookieJar.toHeader()).toBe("token=123");
    });

    it("returns null when direct fetch is not ok", async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        text: async () => "Not Found",
        headers: { getSetCookie: () => [] },
      });

      const result = await fetchBackloggdHtml(testUrl);
      expect(result).toBeNull();
    });

    it("returns null when fetch throws", async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error("Network Error"));

      const result = await fetchBackloggdHtml(testUrl);
      expect(result).toBeNull();
    });

    it("returns null when challenge is present but script tag is missing", async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => "<title>Making sure you&#39;re not a bot!</title>",
        headers: { getSetCookie: () => [] },
      });

      const result = await fetchBackloggdHtml(testUrl);
      expect(result).toBeNull();
    });

    it("returns null when challenge JSON is invalid", async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => `
          <title>Making sure you&#39;re not a bot!</title>
          <script id="anubis_challenge" type="application/json">invalid-json</script>
        `,
        headers: { getSetCookie: () => [] },
      });

      const result = await fetchBackloggdHtml(testUrl);
      expect(result).toBeNull();
    });

    it("returns null when challenge algorithm is not fast or fields missing", async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => `
          <title>Making sure you&#39;re not a bot!</title>
          <script id="anubis_challenge" type="application/json">
            {"rules":{"algorithm":"argon2id","difficulty":2},"challenge":{"id":"1","randomData":"abc"}}
          </script>
        `,
        headers: { getSetCookie: () => [] },
      });

      const result = await fetchBackloggdHtml(testUrl);
      expect(result).toBeNull();
    });

    it("returns null when solveAnubisPoW fails", async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => `
          <title>Making sure you&#39;re not a bot!</title>
          <script id="anubis_challenge" type="application/json">
            {"rules":{"algorithm":"fast","difficulty":10},"challenge":{"id":"1","randomData":"abc"}}
          </script>
        `,
        headers: { getSetCookie: () => [] },
      });

      const result = await fetchBackloggdHtml(testUrl);
      expect(result).toBeNull();
    });

    it("solves Anubis challenge and re-fetches successfully", async () => {
      process.env.BACKLOGGD_COOKIE = "initial=cookie";
      (fetch as jest.Mock)
        // 1. Initial request with challenge
        .mockResolvedValueOnce({
          ok: true,
          text: async () => `
            <title>Making sure you&#39;re not a bot!</title>
            <script id="anubis_challenge" type="application/json">
              {"rules":{"algorithm":"fast","difficulty":2},"challenge":{"id":"chal-123","randomData":"seed-data"}}
            </script>
          `,
          headers: {
            getSetCookie: () => ["techaro-verif=token1; Path=/"],
          },
        })
        // 2. Pass challenge submission
        .mockResolvedValueOnce({
          ok: true,
          status: 302,
          headers: {
            getSetCookie: () => ["techaro-auth=auth1; Path=/"],
          },
        })
        // 3. Re-fetch with auth cookie
        .mockResolvedValueOnce({
          ok: true,
          text: async () => "<html><body>Real Profile</body></html>",
          headers: {
            getSetCookie: () => [],
          },
        });

      const result = await fetchBackloggdHtml(testUrl);
      expect(result).toBe("<html><body>Real Profile</body></html>");
      expect(sharedBackloggdCookieJar.toHeader()).toContain(
        "techaro-auth=auth1",
      );
    });

    it("returns null if re-fetch after challenge fails with !ok", async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          text: async () => `
            <title>Making sure you&#39;re not a bot!</title>
            <script id="anubis_challenge" type="application/json">
              {"rules":{"algorithm":"fast","difficulty":2},"challenge":{"id":"chal-123","randomData":"seed-data"}}
            </script>
          `,
          headers: {},
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 302,
          headers: {},
        })
        .mockResolvedValueOnce({
          ok: false,
          headers: {},
        });

      const result = await fetchBackloggdHtml(testUrl);
      expect(result).toBeNull();
    });

    it("returns null if re-fetch after challenge still contains challenge page", async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          text: async () => `
            <title>Making sure you&#39;re not a bot!</title>
            <script id="anubis_challenge" type="application/json">
              {"rules":{"algorithm":"fast","difficulty":2},"challenge":{"id":"chal-123","randomData":"seed-data"}}
            </script>
          `,
          headers: {},
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 302,
          headers: {},
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => "<title>Making sure you&#39;re not a bot!</title>",
          headers: {},
        });

      const result = await fetchBackloggdHtml(testUrl);
      expect(result).toBeNull();
    });
  });
});
