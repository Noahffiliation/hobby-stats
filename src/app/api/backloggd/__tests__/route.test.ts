import { GET, getBackloggdUsername } from '../route';

globalThis.fetch = jest.fn();

describe('Backloggd API Route', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		jest.clearAllMocks();
		process.env = { ...originalEnv };
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	it('resolves username from env or default', () => {
		process.env.NEXT_PUBLIC_BACKLOGGD_USERNAME = 'custom_user';
		expect(getBackloggdUsername()).toBe('custom_user');
		delete process.env.NEXT_PUBLIC_BACKLOGGD_USERNAME;
		expect(getBackloggdUsername()).toBe('Noahffiliation');
	});

	it('returns played and backlog stats when HTML parsing succeeds', async () => {
		(fetch as jest.Mock).mockResolvedValueOnce({
			ok: true,
			text: async () => `
				<a href="/u/Noahffiliation/played/release:desc/categories:games/">
					<h1>281</h1>
				</a>
				<h4>Games Played</h4>
				<a href="/u/Noahffiliation/backlog/release:desc/categories:games/">
					<h1>240</h1>
				</a>
				<h4>Games Backloggd</h4>
			`,
		});

		const response = await GET();
		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toEqual({ played: 281, backlog: 240 });
	});

	it('returns 502 error when fetch response is not ok', async () => {
		(fetch as jest.Mock).mockResolvedValueOnce({
			ok: false,
		});

		const response = await GET();
		expect(response.status).toBe(502);
		const data = await response.json();
		expect(data.error).toBe('Failed to fetch Backloggd stats');
	});

	it('returns 502 error when HTML cannot be parsed', async () => {
		(fetch as jest.Mock).mockResolvedValueOnce({
			ok: true,
			text: async () => '<html><body>No stats</body></html>',
		});

		const response = await GET();
		expect(response.status).toBe(502);
		const data = await response.json();
		expect(data.error).toBe('Failed to fetch Backloggd stats');
	});

	it('returns 502 error when fetch throws an error', async () => {
		(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network failure'));

		const response = await GET();
		expect(response.status).toBe(502);
		const data = await response.json();
		expect(data.error).toBe('Failed to fetch Backloggd stats');
	});
});
