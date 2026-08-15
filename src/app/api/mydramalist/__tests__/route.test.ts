import { GET, getCurlBin, getMdlUsername } from '../route';
import { execFile } from 'node:child_process';

globalThis.fetch = jest.fn();
jest.mock('node:child_process', () => ({
	execFile: jest.fn(),
}));

describe('MyDramaList API Route', () => {
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

	it('returns completed and planToWatch stats when fetch HTML regex parsing succeeds', async () => {
		(fetch as jest.Mock).mockResolvedValueOnce({
			ok: true,
			text: async () => `
				<a class="nav-link" href="/dramalist/Noahffiliation/completed">Completed (205)</a>
				<a class="nav-link" href="/dramalist/Noahffiliation/plan_to_watch">Plan to Watch (237)</a>
			`,
		});

		const response = await GET();
		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toEqual({ completed: 205, planToWatch: 237 });
	});

	it('counts rows dynamically across multiple pages when regex does not match on main page', async () => {
		(fetch as jest.Mock)
			.mockResolvedValueOnce({
				ok: true,
				text: async () => '<html><body>No regex match</body></html>',
			})
			// completed page 1 (100 rows)
			.mockResolvedValueOnce({
				ok: true,
				text: async () => Array.from({ length: 100 }, (_, i) => `<tr id="ml${i + 1}"></tr>`).join(''),
			})
			// completed page 2 (5 rows)
			.mockResolvedValueOnce({
				ok: true,
				text: async () => Array.from({ length: 5 }, (_, i) => `<tr id="ml${i + 101}"></tr>`).join(''),
			})
			// plan to watch page 1 (50 rows)
			.mockResolvedValueOnce({
				ok: true,
				text: async () => Array.from({ length: 50 }, (_, i) => `<tr id="ml${i + 1}"></tr>`).join(''),
			});

		const response = await GET();
		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toEqual({ completed: 105, planToWatch: 50 });
	});

	it('uses curl fallback when fetch is blocked by bot protection with pagination', async () => {
		(fetch as jest.Mock).mockResolvedValue({
			ok: true,
			text: async () => 'Just a moment...',
		});

		(execFile as unknown as jest.Mock)
			// main
			.mockImplementationOnce((_cmd, _args, _opts, cb) => cb(null, '<html><body>No regex match</body></html>'))
			// comp page 1 (100 rows)
			.mockImplementationOnce((_cmd, _args, _opts, cb) => cb(null, Array.from({ length: 100 }, (_, i) => `<tr id="ml${i + 1}"></tr>`).join('')))
			// comp page 2 (5 rows)
			.mockImplementationOnce((_cmd, _args, _opts, cb) => cb(null, Array.from({ length: 5 }, (_, i) => `<tr id="ml${i + 101}"></tr>`).join('')))
			// ptw page 1 (1 row)
			.mockImplementationOnce((_cmd, _args, _opts, cb) => cb(null, '<tr id="ml200"></tr>'));

		const response = await GET();
		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toEqual({ completed: 105, planToWatch: 1 });
	});

	it('handles curl returning error or challenge text cleanly', async () => {
		(fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
		(execFile as unknown as jest.Mock).mockImplementation((_cmd, _args, _opts, cb) => cb(null, 'Just a moment...'));

		const response = await GET();
		expect(response.status).toBe(502);
		const data = await response.json();
		expect(data.error).toBe('Failed to fetch MyDramaList stats');
	});

	it('returns 502 error when both fetch and curl throw errors', async () => {
		(fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
		(execFile as unknown as jest.Mock).mockImplementation(() => {
			throw new Error('Sync throw in child_process');
		});

		const response = await GET();
		expect(response.status).toBe(502);
		const data = await response.json();
		expect(data.error).toBe('Failed to fetch MyDramaList stats');
	});

	it('handles when completed and plan_to_watch return empty string or zero rows in row counting', async () => {
		(fetch as jest.Mock)
			.mockResolvedValueOnce({
				ok: true,
				text: async () => '<html><body>No stats</body></html>',
			})
			.mockResolvedValueOnce({
				ok: true,
				text: async () => '<html><body>0 rows</body></html>',
			})
			.mockResolvedValueOnce({
				ok: false,
			});

		const response = await GET();
		expect(response.status).toBe(502);
		const data = await response.json();
		expect(data.error).toBe('Failed to fetch MyDramaList stats');
	});

	it('handles when page 2 fetch fails or returns null during pagination', async () => {
		(fetch as jest.Mock)
			.mockResolvedValueOnce({
				ok: true,
				text: async () => '<html><body>No stats</body></html>',
			})
			// completed page 1 (100 rows)
			.mockResolvedValueOnce({
				ok: true,
				text: async () => Array.from({ length: 100 }, (_, i) => `<tr id="ml${i + 1}"></tr>`).join(''),
			})
			// completed page 2 fails
			.mockResolvedValueOnce({
				ok: false,
			})
			// plan to watch page 1 (1 row)
			.mockResolvedValueOnce({
				ok: true,
				text: async () => '<tr id="ml1"></tr>',
			});

		const response = await GET();
		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toEqual({ completed: 100, planToWatch: 1 });
	});

	it('handles when only one stat is resolved and the other is empty', async () => {
		(fetch as jest.Mock)
			.mockResolvedValueOnce({
				ok: true,
				text: async () => '<html><body>No stats</body></html>',
			})
			.mockResolvedValueOnce({
				ok: true,
				text: async () => '<tr id="ml1"></tr>',
			})
			.mockResolvedValueOnce({
				ok: false,
			});

		const response = await GET();
		expect(response.status).toBe(502);
		const data = await response.json();
		expect(data.error).toBe('Failed to fetch MyDramaList stats');
	});
});
