import {
  COMPLETED_REGEX,
  fetchMdlHtml,
  fetchViaProxy,
  getCurlBin,
  getMdlCookie,
  getMdlProxyUrl,
  getMdlUsername,
  PTW_REGEX,
} from "../utils";
import { execFile } from "node:child_process";

globalThis.fetch = jest.fn();
jest.mock("node:child_process", () => ({
  execFile: jest.fn(),
}));

describe("MyDramaList Utils", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.SCRAPER_API_KEY;
    delete process.env.NEXT_PUBLIC_SCRAPER_API_KEY;
    delete process.env.MDL_PROXY_URL;
    delete process.env.NEXT_PUBLIC_MDL_PROXY_URL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("resolves username from env or default", () => {
    process.env.NEXT_PUBLIC_MDL_USERNAME = "custom_mdl";
    expect(getMdlUsername()).toBe("custom_mdl");
    delete process.env.NEXT_PUBLIC_MDL_USERNAME;
    expect(getMdlUsername()).toBe("Noahffiliation");
  });

  it("resolves cookie from env or undefined", () => {
    delete process.env.MDL_COOKIE;
    delete process.env.NEXT_PUBLIC_MDL_COOKIE;
    expect(getMdlCookie()).toBeUndefined();
    process.env.MDL_COOKIE = "cf_clearance=test1";
    expect(getMdlCookie()).toBe("cf_clearance=test1");
    delete process.env.MDL_COOKIE;
    process.env.NEXT_PUBLIC_MDL_COOKIE = "cf_clearance=test2";
    expect(getMdlCookie()).toBe("cf_clearance=test2");
    delete process.env.NEXT_PUBLIC_MDL_COOKIE;
  });

  it("returns appropriate curl binary for platform", () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "win32" });
    expect(getCurlBin()).toBe(String.raw`C:\Windows\System32\curl.exe`);

    Object.defineProperty(process, "platform", { value: "linux" });
    expect(getCurlBin()).toBe("/usr/bin/curl");

    Object.defineProperty(process, "platform", { value: originalPlatform });
  });

  it("tests regex patterns", () => {
    const completedMatch = COMPLETED_REGEX.exec("Completed (150)");
    const ptwMatch = PTW_REGEX.exec("Plan to Watch (50)");
    expect(completedMatch?.[1]).toBe("150");
    expect(ptwMatch?.[1]).toBe("50");
  });

  it("fetches html directly via fetch when successful", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: async () => "<html><body>Success</body></html>",
    });

    const result = await fetchMdlHtml("https://mydramalist.com/test");
    expect(result).toBe("<html><body>Success</body></html>");
  });

  it("uses curl fallback when fetch returns cloudflare challenge or fails", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: async () => "Just a moment...",
    });

    (execFile as unknown as jest.Mock).mockImplementationOnce(
      (_cmd, args, _opts, cb) => {
        expect(args).toContain("-X");
        expect(args).toContain("POST");
        cb(null, "<html><body>Curl HTML</body></html>");
      },
    );

    const result = await fetchMdlHtml("https://mydramalist.com/test", {
      page: 2,
      username: "testuser",
    });
    expect(result).toBe("<html><body>Curl HTML</body></html>");
  });

  it("returns null when both fetch and curl fail or return challenge", async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));
    (execFile as unknown as jest.Mock).mockImplementationOnce(
      (_cmd, _args, _opts, cb) => {
        cb(null, "Just a moment...");
      },
    );

    const result = await fetchMdlHtml("https://mydramalist.com/test");
    expect(result).toBeNull();
  });

  it("returns null when execFile throws synchronously", async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));
    (execFile as unknown as jest.Mock).mockImplementationOnce(() => {
      throw new Error("Sync error");
    });

    const result = await fetchMdlHtml("https://mydramalist.com/test");
    expect(result).toBeNull();
  });

  it("passes cookie in fetch headers and curl args when MDL_COOKIE is set", async () => {
    process.env.MDL_COOKIE = "cf_clearance=abc123";

    // Test fetch includes Cookie header
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: async () => "<html><body>With Cookie</body></html>",
    });

    const fetchResult = await fetchMdlHtml("https://mydramalist.com/test");
    expect(fetchResult).toBe("<html><body>With Cookie</body></html>");
    expect(fetch).toHaveBeenCalledWith(
      "https://mydramalist.com/test",
      expect.objectContaining({
        headers: expect.objectContaining({
          Cookie: "cf_clearance=abc123",
        }),
      }),
    );

    // Test curl fallback includes Cookie arg
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: async () => "Just a moment...",
    });
    (execFile as unknown as jest.Mock).mockImplementationOnce(
      (_cmd, args, _opts, cb) => {
        expect(args).toContain("Cookie: cf_clearance=abc123");
        cb(null, "<html><body>Curl With Cookie</body></html>");
      },
    );

    const curlResult = await fetchMdlHtml("https://mydramalist.com/test");
    expect(curlResult).toBe("<html><body>Curl With Cookie</body></html>");
  });

  it("resolves proxy url from SCRAPER_API_KEY or MDL_PROXY_URL or null", () => {
    delete process.env.SCRAPER_API_KEY;
    delete process.env.NEXT_PUBLIC_SCRAPER_API_KEY;
    delete process.env.MDL_PROXY_URL;
    delete process.env.NEXT_PUBLIC_MDL_PROXY_URL;
    expect(getMdlProxyUrl("https://example.com")).toBeNull();

    process.env.SCRAPER_API_KEY = "test_key";
    expect(getMdlProxyUrl("https://example.com")).toBe(
      "https://api.scraperapi.com?api_key=test_key&url=https%3A%2F%2Fexample.com",
    );
    delete process.env.SCRAPER_API_KEY;

    process.env.NEXT_PUBLIC_SCRAPER_API_KEY = "pub_key";
    expect(getMdlProxyUrl("https://example.com")).toBe(
      "https://api.scraperapi.com?api_key=pub_key&url=https%3A%2F%2Fexample.com",
    );
    delete process.env.NEXT_PUBLIC_SCRAPER_API_KEY;

    process.env.MDL_PROXY_URL = "https://custom-proxy.com/?target={url}";
    expect(getMdlProxyUrl("https://example.com")).toBe(
      "https://custom-proxy.com/?target=https%3A%2F%2Fexample.com",
    );

    process.env.MDL_PROXY_URL = "https://custom-proxy.com/?target=";
    expect(getMdlProxyUrl("https://example.com")).toBe(
      "https://custom-proxy.com/?target=https%3A%2F%2Fexample.com",
    );
    delete process.env.MDL_PROXY_URL;
  });

  it("handles fetchViaProxy when proxy succeeds, fails, or throws", async () => {
    // 1. Success
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: async () => "<html><body>Proxy Content</body></html>",
    });
    const successRes = await fetchViaProxy("https://proxy.com/test", {
      page: 1,
      username: "user",
    });
    expect(successRes).toBe("<html><body>Proxy Content</body></html>");

    // 2. Returns Challenge
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: async () => "<title>Just a moment...</title>",
    });
    const challengeRes = await fetchViaProxy("https://proxy.com/test");
    expect(challengeRes).toBeNull();

    // 3. Response not ok
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
    });
    const notOkRes = await fetchViaProxy("https://proxy.com/test");
    expect(notOkRes).toBeNull();

    // 4. Throws error
    (fetch as jest.Mock).mockRejectedValueOnce(new Error("Proxy error"));
    const errorRes = await fetchViaProxy("https://proxy.com/test");
    expect(errorRes).toBeNull();
  });

  it("uses proxy in fetchMdlHtml when SCRAPER_API_KEY is configured", async () => {
    process.env.SCRAPER_API_KEY = "my_scraper_key";
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: async () => "<html><body>Via ScraperAPI</body></html>",
    });

    const result = await fetchMdlHtml("https://mydramalist.com/test");
    expect(result).toBe("<html><body>Via ScraperAPI</body></html>");
    expect(fetch).toHaveBeenCalledWith(
      "https://api.scraperapi.com?api_key=my_scraper_key&url=https%3A%2F%2Fmydramalist.com%2Ftest",
      expect.anything(),
    );
    delete process.env.SCRAPER_API_KEY;
  });
});
