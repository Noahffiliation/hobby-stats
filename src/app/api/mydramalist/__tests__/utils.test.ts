import { COMPLETED_REGEX, fetchMdlHtml, getCurlBin, getMdlUsername, PTW_REGEX } from '../utils';
import { execFile } from 'node:child_process';

globalThis.fetch = jest.fn();
jest.mock('node:child_process', () => ({
	execFile: jest.fn(),
}));

describe('MyDramaList Utils', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		jest.clearAllMocks();
		process.env = { ...originalEnv };
		(fetch as jest.Mock).mockClear();
		(execFile as unknown as jest.Mock).mockReset();
		(execFile as unknown as jest.Mock).mockImplementation((_cmd, _args, _opts, cb) => cb(new Error('curl disabled in test'), ''));
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	it('resolves username from env or default', () => {
		process.env.NEXT_PUBLIC_MDL_USERNAME = 'custom_mdl';
		expect(getMdlUsername()).toBe('custom_mdl');
		delete process.env.NEXT_PUBLIC_MDL_USERNAME;
		expect(getMdlUsername()).toBe('Noahffiliation');
	});

	it('returns appropriate curl binary for platform', () => {
		const originalPlatform = process.platform;
		Object.defineProperty(process, 'platform', { value: 'win32' });
		expect(getCurlBin()).toBe(String.raw`C:\Windows\System32\curl.exe`);

		Object.defineProperty(process, 'platform', { value: 'linux' });
		expect(getCurlBin()).toBe('/usr/bin/curl');

		Object.defineProperty(process, 'platform', { value: originalPlatform });
	});

	it('tests regex patterns', () => {
		const completedMatch = COMPLETED_REGEX.exec('Completed (150)');
		const ptwMatch = PTW_REGEX.exec('Plan to Watch (50)');
		expect(completedMatch?.[1]).toBe('150');
		expect(ptwMatch?.[1]).toBe('50');
	});

	it('fetches html directly via fetch when successful', async () => {
		(fetch as jest.Mock).mockResolvedValueOnce({
			ok: true,
			text: async () => '<html><body>Success</body></html>',
		});

		const result = await fetchMdlHtml('https://mydramalist.com/test');
		expect(result).toBe('<html><body>Success</body></html>');
	});

	it('uses curl fallback when fetch returns cloudflare challenge or fails', async () => {
		(fetch as jest.Mock).mockResolvedValueOnce({
			ok: true,
			text: async () => 'Just a moment...',
		});

		(execFile as unknown as jest.Mock).mockImplementationOnce((_cmd, args, _opts, cb) => {
			expect(args).toContain('-X');
			expect(args).toContain('POST');
			cb(null, '<html><body>Curl HTML</body></html>');
		});

		const result = await fetchMdlHtml('https://mydramalist.com/test', { page: 2, username: 'testuser' });
		expect(result).toBe('<html><body>Curl HTML</body></html>');
	});

	it('returns null when both fetch and curl fail or return challenge', async () => {
		(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
		(execFile as unknown as jest.Mock).mockImplementationOnce((_cmd, _args, _opts, cb) => {
			cb(null, 'Just a moment...');
		});

		const result = await fetchMdlHtml('https://mydramalist.com/test');
		expect(result).toBeNull();
	});

	it('returns null when execFile throws synchronously', async () => {
		(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
		(execFile as unknown as jest.Mock).mockImplementationOnce(() => {
			throw new Error('Sync error');
		});

		const result = await fetchMdlHtml('https://mydramalist.com/test');
		expect(result).toBeNull();
	});
});
